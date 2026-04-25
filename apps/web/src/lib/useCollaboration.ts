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

const CURSOR_COLORS = [
  "hsl(210, 90%, 56%)", "hsl(145, 70%, 45%)", "hsl(270, 75%, 60%)",
  "hsl(25, 95%, 55%)", "hsl(330, 80%, 58%)", "hsl(175, 70%, 42%)",
  "hsl(50, 90%, 50%)", "hsl(0, 80%, 58%)",
];

function colorForUser(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash + userId.charCodeAt(i)) | 0;
  }
  return CURSOR_COLORS[Math.abs(hash) % CURSOR_COLORS.length];
}

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

/**
 * Yjs CRDT collaborative editing hook.
 *
 * CRITICAL INVARIANT: Only ONE user initializes the Y.Doc with content.
 * All other users MUST receive the CRDT state via sync-response.
 * If two users independently insert the same text, the CRDT item IDs differ,
 * causing position mapping errors and content duplication on merge.
 *
 * Flow:
 *   1. Create empty Y.Doc
 *   2. Subscribe to channel, send sync-request
 *   3. If peer responds (sync-response): apply peer's CRDT state to our empty Y.Doc
 *   4. If no peer within 2s: we're first → insert local content (becomes the authority)
 *   5. Ongoing edits: minimal diff → Y.Doc transact → broadcast update
 */
export function useCollaboration(
  cloudId: string | null,
  markdown: string,
  onRemoteChange: (newMarkdown: string) => void,
) {
  const ydocRef = useRef<Y.Doc | null>(null);
  const ytextRef = useRef<Y.Text | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const channelRef = useRef<any>(null);
  const subscribedRef = useRef(false);
  const isApplyingRemoteRef = useRef(false);
  const initializedRef = useRef(false);
  const [peerCount, setPeerCount] = useState(0);
  const [isCollaborating, setIsCollaborating] = useState(false);
  const [peerCursors, setPeerCursors] = useState<PeerCursor[]>([]);
  const lastCursorBroadcast = useRef(0);

  const onRemoteChangeRef = useRef(onRemoteChange);
  onRemoteChangeRef.current = onRemoteChange;

  const markdownRef = useRef(markdown);
  markdownRef.current = markdown;

  // Broadcast handler — uses refs so it always operates on the current Y.Doc
  // (Y.Doc may be swapped during sync-response)
  const broadcastYjsUpdate = useCallback((update: Uint8Array, origin: unknown) => {
    if (origin === "remote") return;
    if (!subscribedRef.current) return;
    channelRef.current?.send({
      type: "broadcast",
      event: "yjs-update",
      payload: { update: uint8ToBase64(update) },
    });
  }, []);

  useEffect(() => {
    if (!cloudId) {
      setIsCollaborating(false);
      setPeerCount(0);
      setPeerCursors([]);
      return;
    }

    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    // Create EMPTY Y.Doc — do NOT insert content yet
    const ydoc = new Y.Doc();
    const ytext = ydoc.getText("content");
    ydocRef.current = ydoc;
    ytextRef.current = ytext;
    initializedRef.current = false;
    subscribedRef.current = false;

    // Attach broadcast handler
    ydoc.on("update", broadcastYjsUpdate);

    // Create channel
    const channel = supabase.channel(`yjs-doc-${cloudId}`, {
      config: { broadcast: { self: false } },
    });
    channelRef.current = channel;

    let initTimer: ReturnType<typeof setTimeout> | null = null;

    channel
      .on("broadcast", { event: "yjs-update" }, (msg: { payload?: { update?: string } } | { [key: string]: unknown }) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const payload = (msg as any)?.payload;
        if (!payload?.update) return;
        const curYdoc = ydocRef.current;
        const curYtext = ytextRef.current;
        if (!curYdoc || !curYtext) return;
        const update = base64ToUint8(payload.update);
        isApplyingRemoteRef.current = true;
        Y.applyUpdate(curYdoc, update, "remote");
        const merged = curYtext.toString();
        if (merged.trim() || markdownRef.current.trim().length === 0) {
          onRemoteChangeRef.current(merged);
        }
        isApplyingRemoteRef.current = false;
      })
      .on("broadcast", { event: "yjs-sync-request" }, () => {
        // A new peer joined. If we have content, respond with our CRDT state.
        const curYdoc = ydocRef.current;
        const curYtext = ytextRef.current;
        if (!curYdoc || !curYtext) return;

        // If not yet initialized, initialize now so we can respond
        if (!initializedRef.current && markdownRef.current) {
          initializedRef.current = true;
          if (initTimer) { clearTimeout(initTimer); initTimer = null; }
          if (curYtext.length === 0) {
            curYtext.insert(0, markdownRef.current);
          }
        }
        if (curYtext.length === 0) return;
        const state = Y.encodeStateAsUpdate(curYdoc);
        channel.send({
          type: "broadcast",
          event: "yjs-sync-response",
          payload: { state: uint8ToBase64(state) },
        });
      })
      .on("broadcast", { event: "yjs-sync-response" }, ({ payload }: { payload: { state?: string } }) => {
        if (!payload?.state) return;
        const peerState = base64ToUint8(payload.state);

        // Cancel init timer
        if (initTimer) { clearTimeout(initTimer); initTimer = null; }
        initializedRef.current = true;

        // Apply peer's state to the EXISTING Y.Doc (don't create new one).
        // y-prosemirror's ySyncPlugin is bound to this Y.Doc's XmlFragment —
        // destroying it would break the Tiptap binding.
        const curYdoc = ydocRef.current;
        const curYtext = ytextRef.current;
        if (!curYdoc || !curYtext) return;

        isApplyingRemoteRef.current = true;
        Y.applyUpdate(curYdoc, peerState, "remote");
        const merged = curYtext.toString();
        if (merged.trim()) {
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
            userId: userId!, name: name || "Anonymous", color: colorForUser(userId!),
            index: index ?? 0, headIndex: headIndex ?? index ?? 0,
          });
          return filtered;
        });
      })
      .on("presence", { event: "sync" }, () => {
        const presenceState = channel.presenceState();
        const count = Math.max(0, Object.keys(presenceState).length - 1);
        setPeerCount(count);
        if (count === 0) setPeerCursors([]);
      })
      .subscribe((status: string) => {
        if (status === "SUBSCRIBED") {
          subscribedRef.current = true;
          setIsCollaborating(true);
          // Send sync-request to get peer's CRDT state
          channel.send({ type: "broadcast", event: "yjs-sync-request", payload: {} });
          channel.track({ joined_at: Date.now() });

          // Init timer: only fires if no peer responds within 2s
          // This means we're the first user — safe to insert content
          initTimer = setTimeout(() => {
            if (!initializedRef.current) {
              initializedRef.current = true;
              const curYtext = ytextRef.current;
              const content = markdownRef.current;
              if (curYtext && content && curYtext.length === 0) {
                curYtext.insert(0, content);
              }
            }
          }, 2000);
        }
      });

    return () => {
      if (initTimer) clearTimeout(initTimer);
      subscribedRef.current = false;
      channelRef.current = null;
      initializedRef.current = false;
      const curYdoc = ydocRef.current;
      if (curYdoc) {
        curYdoc.off("update", broadcastYjsUpdate);
        curYdoc.destroy();
      }
      ydocRef.current = null;
      ytextRef.current = null;
      supabase.removeChannel(channel);
      setIsCollaborating(false);
      setPeerCount(0);
      setPeerCursors([]);
    };
  }, [cloudId, broadcastYjsUpdate]);

  // Apply local editor change → Y.Doc transact → broadcast
  const applyLocalChange = useCallback((newMarkdown: string) => {
    if (isApplyingRemoteRef.current) return;
    const ytext = ytextRef.current;
    const ydoc = ydocRef.current;
    if (!ytext || !ydoc) return;

    const currentYText = ytext.toString();
    if (currentYText === newMarkdown) return;

    ydoc.transact(() => {
      let prefixLen = 0;
      const minLen = Math.min(currentYText.length, newMarkdown.length);
      while (prefixLen < minLen && currentYText[prefixLen] === newMarkdown[prefixLen]) prefixLen++;
      let suffixLen = 0;
      const maxSuffix = Math.min(currentYText.length - prefixLen, newMarkdown.length - prefixLen);
      while (suffixLen < maxSuffix && currentYText[currentYText.length - 1 - suffixLen] === newMarkdown[newMarkdown.length - 1 - suffixLen]) suffixLen++;
      const deleteLen = currentYText.length - prefixLen - suffixLen;
      const insertStr = newMarkdown.slice(prefixLen, newMarkdown.length - suffixLen);
      if (deleteLen > 0) ytext.delete(prefixLen, deleteLen);
      if (insertStr.length > 0) ytext.insert(prefixLen, insertStr);
    });
  }, []);

  const forceReset = useCallback((newMarkdown: string) => {
    const ytext = ytextRef.current;
    const ydoc = ydocRef.current;
    if (!ytext || !ydoc) return;
    ydoc.transact(() => {
      if (ytext.length > 0) ytext.delete(0, ytext.length);
      ytext.insert(0, newMarkdown);
    });
  }, []);

  const updateCursor = useCallback((index: number, headIndex: number, userId: string, name: string) => {
    if (!subscribedRef.current || !channelRef.current) return;
    const now = Date.now();
    if (now - lastCursorBroadcast.current < 50) return;
    lastCursorBroadcast.current = now;
    channelRef.current.send({
      type: "broadcast",
      event: "yjs-cursor",
      payload: { userId, name, index, headIndex },
    });
  }, []);

  // Get current Y.Doc content (includes remote changes)
  const getContent = useCallback((): string | null => {
    return ytextRef.current?.toString() ?? null;
  }, []);

  // Expose Y.Doc for y-prosemirror binding
  const ydoc = ydocRef.current;
  return { applyLocalChange, forceReset, peerCount, isCollaborating, peerCursors, updateCursor, getContent, ydoc };
}
