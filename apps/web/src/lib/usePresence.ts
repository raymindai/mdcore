"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

interface PresenceUser {
  userId: string;
  email: string;
  displayName?: string;
  avatarUrl?: string;
}

interface UsePresenceResult {
  otherEditors: PresenceUser[];
}

/**
 * Track which users are currently viewing/editing a document.
 * Uses Supabase Realtime Presence on channel `doc-presence:{cloudId}`.
 */
export function usePresence(
  cloudId: string | null | undefined,
  user: { id?: string; email?: string; displayName?: string; avatarUrl?: string | null } | null
): UsePresenceResult {
  const [otherEditors, setOtherEditors] = useState<PresenceUser[]>([]);
  const channelRef = useRef<ReturnType<NonNullable<ReturnType<typeof getSupabaseBrowserClient>>["channel"]> | null>(null);

  const updatePresenceList = useCallback((presenceState: Record<string, unknown[]>) => {
    if (!user?.id) return;
    const users: PresenceUser[] = [];
    const seen = new Set<string>();

    for (const key of Object.keys(presenceState)) {
      const entries = presenceState[key] as Array<{ userId?: string; email?: string; displayName?: string; avatarUrl?: string }>;
      for (const entry of entries) {
        if (!entry.userId || entry.userId === user.id) continue;
        if (seen.has(entry.userId)) continue;
        seen.add(entry.userId);
        users.push({
          userId: entry.userId,
          email: entry.email || "",
          displayName: entry.displayName,
          avatarUrl: entry.avatarUrl,
        });
      }
    }

    setOtherEditors(users);
  }, [user?.id]);

  useEffect(() => {
    if (!cloudId || !user?.id) {
      setOtherEditors([]);
      return;
    }

    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    const channel = supabase.channel(`doc-presence:${cloudId}`, {
      config: { presence: { key: user.id } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        updatePresenceList(state);
      })
      .subscribe(async (status: string) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            userId: user.id,
            email: user.email || "",
            displayName: user.displayName || user.email || "",
            avatarUrl: user.avatarUrl || "",
          });
        }
      });

    channelRef.current = channel;

    return () => {
      channel.untrack();
      supabase.removeChannel(channel);
      channelRef.current = null;
      setOtherEditors([]);
    };
  }, [cloudId, user?.id, user?.email, user?.displayName, user?.avatarUrl, updatePresenceList]);

  return { otherEditors };
}
