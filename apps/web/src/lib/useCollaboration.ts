"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import * as Y from "yjs";
import { getSupabaseBrowserClient } from "./supabase-browser";

// ─── Remote cursor types ───

export interface PeerCursor {
  userId: string;
  name: string;
  color: string;
  index: number;
  headIndex: number;
}

// Saturated colors that look good on dark backgrounds (Google Docs palette)
const CURSOR_COLORS = [
  "hsl(210, 90%, 56%)", // blue
  "hsl(145, 70%, 45%)", // green
  "hsl(270, 75%, 60%)", // purple
  "hsl(25, 95%, 55%)",  // orange
  "hsl(330, 80%, 58%)", // pink
  "hsl(175, 70%, 42%)", // teal
  "hsl(50, 90%, 50%)",  // yellow
  "hsl(0, 80%, 58%)",   // red
];

function colorForUser(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash + userId.charCodeAt(i)) | 0;
  }
  return CURSOR_COLORS[Math.abs(hash) % CURSOR_COLORS.length];
}

/**
 * Yjs CRDT collaborative editing hook.
 *
 * Architecture:
 *   User A's Editor <-> Y.Doc <-> Supabase Realtime Broadcast <-> Y.Doc <-> User B's Editor
 *
 * - Each editor maintains a Y.Doc for the active document.
 * - Changes are synced via Supabase Realtime Broadcast (not postgres_changes).
 * - Channel name: `yjs-doc-{cloudId}`
 * - Y.Doc updates are sent as binary (Uint8Array -> base64).
 * - No server-side Y.Doc persistence — markdown is saved normally via auto-save.
 */

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToUint8(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function useCollaboration(
  cloudId: string | null,
  markdown: string,
  onRemoteChange: (newMarkdown: string) => void,
) {
  const ydocRef = useRef<Y.Doc | null>(null);
  const ytextRef = useRef<Y.Text | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const channelRef = useRef<any>(null);
  const isApplyingRemoteRef = useRef(false);
  const [peerCount, setPeerCount] = useState(0);
  const [isCollaborating, setIsCollaborating] = useState(false);
  const [peerCursors, setPeerCursors] = useState<PeerCursor[]>([]);
  const lastCursorBroadcast = useRef(0);

  // Keep latest callback in a ref to avoid re-initializing the channel
  const onRemoteChangeRef = useRef(onRemoteChange);
  onRemoteChangeRef.current = onRemoteChange;

  // Keep latest markdown in a ref for initial Y.Text content
  const markdownRef = useRef(markdown);
  markdownRef.current = markdown;

  // Initialize Y.Doc + Supabase Realtime Broadcast channel when cloudId changes
  useEffect(() => {
    if (!cloudId) {
      setIsCollaborating(false);
      setPeerCount(0);
      return;
    }

    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    const ydoc = new Y.Doc();
    const ytext = ydoc.getText("content");
    ydocRef.current = ydoc;
    ytextRef.current = ytext;

    // Don't insert content yet — wait for sync-response from peers.
    // If no peers respond within a timeout, initialize with local content.
    let initialized = false;
    const initTimer = setTimeout(() => {
      if (!initialized) {
        initialized = true;
        const current = markdownRef.current;
        if (current && ytext.length === 0) {
          ytext.insert(0, current);
        }
      }
    }, 1500);

    // Set up Supabase Realtime Broadcast channel
    let subscribed = false;
    const channel = supabase.channel(`yjs-doc-${cloudId}`, {
      config: { broadcast: { self: false, ack: true } },
    });

    // Listen for local Y.Doc updates and broadcast to peers
    ydoc.on("update", (update: Uint8Array, origin: unknown) => {
      if (origin === "remote") return; // Don't re-broadcast remote changes
      if (!subscribed || !channelRef.current) return;
      channelRef.current.send({
        type: "broadcast",
        event: "yjs-update",
        payload: { update: uint8ToBase64(update) },
      }).then((status: string) => {
        if (status !== "ok") console.warn("[collab] broadcast failed:", status);
      });
    });

    // Set channelRef BEFORE subscribe so ydoc update handler can send
    channelRef.current = channel;

    channel
      .on("broadcast", { event: "yjs-update" }, ({ payload }: { payload: { update?: string } }) => {
        if (!payload?.update) return;
        console.log("[collab] received yjs-update, bytes:", payload.update.length);
        const update = base64ToUint8(payload.update);
        isApplyingRemoteRef.current = true;
        Y.applyUpdate(ydoc, update, "remote");
        const merged = ytext.toString();
        // Protect against blank: only apply if result has content
        if (merged.trim() || markdownRef.current.trim().length === 0) {
          onRemoteChangeRef.current(merged);
        }
        isApplyingRemoteRef.current = false;
      })
      .on("broadcast", { event: "yjs-sync-request" }, () => {
        // Peer just joined — send state if we have content.
        // If not initialized yet but have local markdown, init now and respond
        // (prevents both-users-open-simultaneously leaving both unsynced).
        if (!initialized && markdownRef.current) {
          initialized = true;
          clearTimeout(initTimer);
          if (ytext.length === 0) {
            ytext.insert(0, markdownRef.current);
          }
        }
        if (ytext.length === 0) return;
        const state = Y.encodeStateAsUpdate(ydoc);
        channel.send({
          type: "broadcast",
          event: "yjs-sync-response",
          payload: { state: uint8ToBase64(state) },
        });
      })
      .on("broadcast", { event: "yjs-sync-response" }, ({ payload }: { payload: { state?: string } }) => {
        if (!payload?.state) return;
        const state = base64ToUint8(payload.state);

        // Decode peer content to check if it's empty
        const freshDoc = new Y.Doc();
        Y.applyUpdate(freshDoc, state);
        const peerContent = freshDoc.getText("content").toString();
        freshDoc.destroy();

        // NEVER replace with empty content — protect against blank document
        if (!peerContent.trim()) return;

        isApplyingRemoteRef.current = true;
        if (!initialized) {
          initialized = true;
          clearTimeout(initTimer);
          // Replace local with peer content (avoid CRDT merge duplication)
          if (ytext.length > 0) {
            ydoc.transact(() => { ytext.delete(0, ytext.length); }, "remote");
          }
          ydoc.transact(() => { ytext.insert(0, peerContent); }, "remote");
          onRemoteChangeRef.current(ytext.toString());
          isApplyingRemoteRef.current = false;
          return;
        }
        // After initialization, use normal CRDT merge
        Y.applyUpdate(ydoc, state, "remote");
        const merged = ytext.toString();
        if (merged.trim()) { // Only apply non-empty merged content
          onRemoteChangeRef.current(merged);
        }
        isApplyingRemoteRef.current = false;
      })
      .on("broadcast", { event: "yjs-cursor" }, ({ payload }: { payload: { userId?: string; name?: string; index?: number; headIndex?: number } }) => {
        if (!payload?.userId) return;
        const { userId, name, index, headIndex } = payload;
        setPeerCursors(prev => {
          const filtered = prev.filter(c => c.userId !== userId);
          filtered.push({
            userId: userId!,
            name: name || "Anonymous",
            color: colorForUser(userId!),
            index: index ?? 0,
            headIndex: headIndex ?? index ?? 0,
          });
          return filtered;
        });
      })
      .on("presence", { event: "sync" }, () => {
        const presenceState = channel.presenceState();
        const count = Math.max(0, Object.keys(presenceState).length - 1);
        setPeerCount(count);
        // Clean up cursors for peers that have left
        if (count === 0) {
          setPeerCursors([]);
        }
      })
      .subscribe(async (status: string) => {
        console.log("[collab] channel status:", status, "cloudId:", cloudId);
        if (status === "SUBSCRIBED") {
          subscribed = true;
          setIsCollaborating(true);
          // Request full state from any existing peers
          const syncResult = await channel.send({
            type: "broadcast",
            event: "yjs-sync-request",
            payload: {},
          });
          console.log("[collab] sync-request sent:", syncResult);
          // Track presence so peers can count us
          await channel.track({ joined_at: Date.now() });
        }
      });

    return () => {
      clearTimeout(initTimer);
      channelRef.current = null;
      supabase.removeChannel(channel);
      ydoc.destroy();
      ydocRef.current = null;
      ytextRef.current = null;
      setIsCollaborating(false);
      setPeerCount(0);
      setPeerCursors([]);
    };
  }, [cloudId]); // Intentionally exclude markdown/onRemoteChange to avoid re-init

  /**
   * Call this when the local editor content changes (user typing).
   * Computes a Y.Doc transaction and broadcasts the update to peers.
   */
  const applyLocalChange = useCallback((newMarkdown: string) => {
    if (isApplyingRemoteRef.current) return;
    const ytext = ytextRef.current;
    const ydoc = ydocRef.current;
    if (!ytext || !ydoc) return;

    const currentYText = ytext.toString();
    if (currentYText === newMarkdown) return;

    // Apply minimal diff to Y.Text (avoid delete-all + insert-all which causes CRDT duplication)
    ydoc.transact(() => {
      // Find common prefix
      let prefixLen = 0;
      const minLen = Math.min(currentYText.length, newMarkdown.length);
      while (prefixLen < minLen && currentYText[prefixLen] === newMarkdown[prefixLen]) {
        prefixLen++;
      }
      // Find common suffix (from the end, not overlapping with prefix)
      let suffixLen = 0;
      const maxSuffix = Math.min(currentYText.length - prefixLen, newMarkdown.length - prefixLen);
      while (suffixLen < maxSuffix && currentYText[currentYText.length - 1 - suffixLen] === newMarkdown[newMarkdown.length - 1 - suffixLen]) {
        suffixLen++;
      }
      // Delete changed middle, insert new middle
      const deleteLen = currentYText.length - prefixLen - suffixLen;
      const insertStr = newMarkdown.slice(prefixLen, newMarkdown.length - suffixLen);
      if (deleteLen > 0) ytext.delete(prefixLen, deleteLen);
      if (insertStr.length > 0) ytext.insert(prefixLen, insertStr);
    });
  }, []);

  // Force reset Y.Doc (use after version restore to prevent CRDT merge reverting)
  const forceReset = useCallback((newMarkdown: string) => {
    const ytext = ytextRef.current;
    const ydoc = ydocRef.current;
    if (!ytext || !ydoc) return;
    ydoc.transact(() => {
      if (ytext.length > 0) ytext.delete(0, ytext.length);
      ytext.insert(0, newMarkdown);
    });
  }, []);

  // Broadcast local cursor position to peers (throttled to max every 50ms)
  const updateCursor = useCallback((index: number, headIndex: number, userId: string, name: string) => {
    const channel = channelRef.current;
    if (!channel) return;
    const now = Date.now();
    if (now - lastCursorBroadcast.current < 50) return;
    lastCursorBroadcast.current = now;
    channel.send({
      type: "broadcast",
      event: "yjs-cursor",
      payload: { userId, name, index, headIndex },
    });
  }, []);

  return { applyLocalChange, forceReset, peerCount, isCollaborating, peerCursors, updateCursor };
}
