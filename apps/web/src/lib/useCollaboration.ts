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
  const [peerCount, setPeerCount] = useState(0);
  const [isCollaborating, setIsCollaborating] = useState(false);
  const [peerCursors, setPeerCursors] = useState<PeerCursor[]>([]);
  const lastCursorBroadcast = useRef(0);

  const onRemoteChangeRef = useRef(onRemoteChange);
  onRemoteChangeRef.current = onRemoteChange;

  const markdownRef = useRef(markdown);
  markdownRef.current = markdown;

  // Initialize Y.Doc + Supabase Realtime Broadcast channel
  useEffect(() => {
    if (!cloudId) {
      setIsCollaborating(false);
      setPeerCount(0);
      setPeerCursors([]);
      return;
    }

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      console.error("[collab] no supabase client");
      return;
    }

    const ydoc = new Y.Doc();
    const ytext = ydoc.getText("content");
    ydocRef.current = ydoc;
    ytextRef.current = ytext;
    subscribedRef.current = false;

    let initialized = false;
    const initTimer = setTimeout(() => {
      if (!initialized) {
        initialized = true;
        const current = markdownRef.current;
        if (current && ytext.length === 0) {
          ytext.insert(0, current);
        }
        console.log("[collab] initialized via timeout, len:", current?.length || 0);
      }
    }, 1500);

    // Create channel — no ack (fire-and-forget for speed)
    const channel = supabase.channel(`yjs-doc-${cloudId}`, {
      config: { broadcast: { self: false } },
    });
    channelRef.current = channel;

    // Y.Doc local update → broadcast to peers
    const onYjsUpdate = (update: Uint8Array, origin: unknown) => {
      if (origin === "remote") return;
      if (!subscribedRef.current) return;
      channel.send({
        type: "broadcast",
        event: "yjs-update",
        payload: { update: uint8ToBase64(update) },
      });
    };
    ydoc.on("update", onYjsUpdate);

    // Broadcast handlers
    channel
      .on("broadcast", { event: "yjs-update" }, ({ payload }: { payload: { update?: string } }) => {
        if (!payload?.update) return;
        const update = base64ToUint8(payload.update);
        isApplyingRemoteRef.current = true;
        Y.applyUpdate(ydoc, update, "remote");
        const merged = ytext.toString();
        if (merged.trim() || markdownRef.current.trim().length === 0) {
          onRemoteChangeRef.current(merged);
        }
        isApplyingRemoteRef.current = false;
      })
      .on("broadcast", { event: "yjs-sync-request" }, () => {
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

        const freshDoc = new Y.Doc();
        Y.applyUpdate(freshDoc, state);
        const peerContent = freshDoc.getText("content").toString();
        freshDoc.destroy();

        if (!peerContent.trim()) return;

        isApplyingRemoteRef.current = true;
        if (!initialized) {
          initialized = true;
          clearTimeout(initTimer);
          if (ytext.length > 0) {
            ydoc.transact(() => { ytext.delete(0, ytext.length); }, "remote");
          }
          ydoc.transact(() => { ytext.insert(0, peerContent); }, "remote");
          onRemoteChangeRef.current(ytext.toString());
          isApplyingRemoteRef.current = false;
          return;
        }
        Y.applyUpdate(ydoc, state, "remote");
        const merged = ytext.toString();
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
        console.log("[collab] channel:", status, cloudId);
        if (status === "SUBSCRIBED") {
          subscribedRef.current = true;
          setIsCollaborating(true);
          channel.send({
            type: "broadcast",
            event: "yjs-sync-request",
            payload: {},
          });
          channel.track({ joined_at: Date.now() });
        }
      });

    return () => {
      clearTimeout(initTimer);
      subscribedRef.current = false;
      channelRef.current = null;
      ydoc.off("update", onYjsUpdate);
      supabase.removeChannel(channel);
      ydoc.destroy();
      ydocRef.current = null;
      ytextRef.current = null;
      setIsCollaborating(false);
      setPeerCount(0);
      setPeerCursors([]);
    };
  }, [cloudId]);

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

  return { applyLocalChange, forceReset, peerCount, isCollaborating, peerCursors, updateCursor };
}
