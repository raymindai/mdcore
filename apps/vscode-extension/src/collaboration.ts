import * as vscode from "vscode";
import * as Y from "yjs";
import { createClient, SupabaseClient, RealtimeChannel } from "@supabase/supabase-js";
import { getApiBaseUrl } from "./extension";

/**
 * Yjs CRDT collaborative editing for VS Code extension.
 *
 * Architecture (same as web):
 *   Editor A <-> Y.Doc <-> Supabase Realtime Broadcast <-> Y.Doc <-> Editor B
 *
 * - Each editor maintains a Y.Doc per active document.
 * - Changes are synced via Supabase Realtime Broadcast.
 * - Channel name: `yjs-doc-{cloudId}`
 * - Y.Doc updates are sent as binary (Uint8Array -> base64).
 * - No server-side Y.Doc persistence — markdown is saved via auto-save.
 */

const SUPABASE_URL = "https://gxvhvcuoprbqnxkrieyj.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd4dmh2Y3VvcHJicW54a3JpZXlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwNTYwMDQsImV4cCI6MjA4OTYzMjAwNH0.RyPCS3KrVNwGAybrJ4bAnLVyXhcHMZJ1D4L8THvDwN0";

function uint8ToBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64");
}

function base64ToUint8(b64: string): Uint8Array {
  return new Uint8Array(Buffer.from(b64, "base64"));
}

interface CollabSession {
  cloudId: string;
  ydoc: Y.Doc;
  ytext: Y.Text;
  channel: RealtimeChannel;
  isApplyingRemote: boolean;
  peerCount: number;
  initialized: boolean;
  initTimer: ReturnType<typeof setTimeout> | null;
}

export class CollaborationManager {
  private supabase: SupabaseClient | null = null;
  private sessions = new Map<string, CollabSession>(); // keyed by document URI
  private _onRemoteChange = new vscode.EventEmitter<{
    uri: vscode.Uri;
    markdown: string;
  }>();
  readonly onRemoteChange = this._onRemoteChange.event;

  private _onPeersChanged = new vscode.EventEmitter<{
    uri: vscode.Uri;
    count: number;
  }>();
  readonly onPeersChanged = this._onPeersChanged.event;

  private _onStatusChanged = new vscode.EventEmitter<{
    uri: vscode.Uri;
    active: boolean;
  }>();
  readonly onStatusChanged = this._onStatusChanged.event;

  private getSupabase(): SupabaseClient {
    if (!this.supabase) {
      this.supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
    return this.supabase;
  }

  /**
   * Start collaborative editing for a document.
   */
  start(documentUri: vscode.Uri, cloudId: string, initialMarkdown: string): void {
    const key = documentUri.toString();

    // Stop existing session for this document
    this.stop(documentUri);

    const ydoc = new Y.Doc();
    const ytext = ydoc.getText("content");

    // Don't insert content yet — wait for sync-response from peers.
    // If no peers respond within a timeout, initialize with local content.
    const session: CollabSession = {
      cloudId,
      ydoc,
      ytext,
      channel: null as unknown as RealtimeChannel,
      isApplyingRemote: false,
      peerCount: 0,
      initialized: false,
      initTimer: setTimeout(() => {
        if (!session.initialized) {
          session.initialized = true;
          if (initialMarkdown && ytext.length === 0) {
            ytext.insert(0, initialMarkdown);
          }
        }
      }, 1500),
    };

    // Listen for local Y.Doc updates and broadcast to peers
    ydoc.on("update", (update: Uint8Array, origin: unknown) => {
      if (origin === "remote") return;
      if (session.channel) {
        session.channel.send({
          type: "broadcast",
          event: "yjs-update",
          payload: { update: uint8ToBase64(update) },
        });
      }
    });

    // Set up Supabase Realtime Broadcast channel
    const supabase = this.getSupabase();
    const channel = supabase.channel(`yjs-doc-${cloudId}`, {
      config: { broadcast: { self: false } },
    });

    channel
      .on(
        "broadcast",
        { event: "yjs-update" },
        ({ payload }: { payload: { update?: string } }) => {
          if (!payload?.update) return;
          const update = base64ToUint8(payload.update);
          session.isApplyingRemote = true;
          Y.applyUpdate(ydoc, update, "remote");
          const merged = ytext.toString();
          this._onRemoteChange.fire({ uri: documentUri, markdown: merged });
          session.isApplyingRemote = false;
        }
      )
      .on("broadcast", { event: "yjs-sync-request" }, () => {
        if (!session.initialized || ytext.length === 0) return;
        const state = Y.encodeStateAsUpdate(ydoc);
        channel.send({
          type: "broadcast",
          event: "yjs-sync-response",
          payload: { state: uint8ToBase64(state) },
        });
      })
      .on(
        "broadcast",
        { event: "yjs-sync-response" },
        ({ payload }: { payload: { state?: string } }) => {
          if (!payload?.state) return;
          const state = base64ToUint8(payload.state);
          const freshDoc = new Y.Doc();
          Y.applyUpdate(freshDoc, state);
          const peerContent = freshDoc.getText("content").toString();
          freshDoc.destroy();
          if (!peerContent.trim()) return; // Never replace with empty
          session.isApplyingRemote = true;
          if (!session.initialized) {
            session.initialized = true;
            if (session.initTimer) { clearTimeout(session.initTimer); session.initTimer = null; }
            if (ytext.length > 0) {
              ydoc.transact(() => { ytext.delete(0, ytext.length); }, "remote");
            }
            ydoc.transact(() => { ytext.insert(0, peerContent); });
            this._onRemoteChange.fire({ uri: documentUri, markdown: ytext.toString() });
            session.isApplyingRemote = false;
            return;
          }
          Y.applyUpdate(ydoc, state, "remote");
          const merged = ytext.toString();
          if (merged.trim()) this._onRemoteChange.fire({ uri: documentUri, markdown: merged });
          session.isApplyingRemote = false;
        }
      )
      .on("presence", { event: "sync" }, () => {
        const presenceState = channel.presenceState();
        session.peerCount = Math.max(
          0,
          Object.keys(presenceState).length - 1
        );
        this._onPeersChanged.fire({
          uri: documentUri,
          count: session.peerCount,
        });
      })
      .subscribe(async (status: string) => {
        if (status === "SUBSCRIBED") {
          this._onStatusChanged.fire({ uri: documentUri, active: true });
          // Request full state from existing peers
          channel.send({
            type: "broadcast",
            event: "yjs-sync-request",
            payload: {},
          });
          // Track presence
          await channel.track({ joined_at: Date.now() });
        }
      });

    session.channel = channel;
    this.sessions.set(key, session);
  }

  /**
   * Stop collaborative editing for a document.
   */
  stop(documentUri: vscode.Uri): void {
    const key = documentUri.toString();
    const session = this.sessions.get(key);
    if (!session) return;

    if (session.initTimer) { clearTimeout(session.initTimer); session.initTimer = null; }
    session.channel.unsubscribe();
    session.ydoc.destroy();
    this.sessions.delete(key);
    this._onStatusChanged.fire({ uri: documentUri, active: false });
    this._onPeersChanged.fire({ uri: documentUri, count: 0 });
  }

  /**
   * Apply a local editor change to the Y.Doc and broadcast.
   */
  applyLocalChange(documentUri: vscode.Uri, newMarkdown: string): void {
    const key = documentUri.toString();
    const session = this.sessions.get(key);
    if (!session || session.isApplyingRemote) return;

    const current = session.ytext.toString();
    if (current === newMarkdown) return;

    // Minimal diff to avoid CRDT duplication
    session.ydoc.transact(() => {
      const current = session.ytext.toString();
      let prefixLen = 0;
      const minLen = Math.min(current.length, newMarkdown.length);
      while (prefixLen < minLen && current[prefixLen] === newMarkdown[prefixLen]) prefixLen++;
      let suffixLen = 0;
      const maxSuffix = Math.min(current.length - prefixLen, newMarkdown.length - prefixLen);
      while (suffixLen < maxSuffix && current[current.length - 1 - suffixLen] === newMarkdown[newMarkdown.length - 1 - suffixLen]) suffixLen++;
      const deleteLen = current.length - prefixLen - suffixLen;
      const insertStr = newMarkdown.slice(prefixLen, newMarkdown.length - suffixLen);
      if (deleteLen > 0) session.ytext.delete(prefixLen, deleteLen);
      if (insertStr.length > 0) session.ytext.insert(prefixLen, insertStr);
    });
  }

  /**
   * Check if a document has an active collaboration session.
   */
  isActive(documentUri: vscode.Uri): boolean {
    return this.sessions.has(documentUri.toString());
  }

  /**
   * Get peer count for a document.
   */
  getPeerCount(documentUri: vscode.Uri): number {
    const session = this.sessions.get(documentUri.toString());
    return session?.peerCount ?? 0;
  }

  /**
   * Stop all sessions. Call on extension deactivate.
   */
  dispose(): void {
    for (const [, session] of this.sessions) {
      if (session.initTimer) { clearTimeout(session.initTimer); }
      session.channel.unsubscribe();
      session.ydoc.destroy();
    }
    this.sessions.clear();
    this._onRemoteChange.dispose();
    this._onPeersChanged.dispose();
    this._onStatusChanged.dispose();
  }
}
