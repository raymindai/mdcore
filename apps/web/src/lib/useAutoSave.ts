"use client";

import { useRef, useCallback, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

interface AutoSaveOptions {
  debounceMs?: number;
}

interface ConflictData {
  serverMarkdown: string;
  serverUpdatedAt: string;
}

interface AutoSaveState {
  isSaving: boolean;
  lastSaved: Date | null;
  error: string | null;
  conflict: ConflictData | null;
}

/**
 * Auto-save hook: debounced save to server.
 * - First call with no cloudId → POST /api/docs to create
 * - Subsequent calls → PATCH /api/docs/{id} with action: "auto-save"
 */
export function useAutoSave(opts: AutoSaveOptions = {}) {
  const { debounceMs = 2000 } = opts;
  const [state, setState] = useState<AutoSaveState>({
    isSaving: false,
    lastSaved: null,
    error: null,
    conflict: null,
  });

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedMdRef = useRef<string>("");
  const lastServerUpdatedAtRef = useRef<string>("");
  const inflightRef = useRef(false);
  const pendingRef = useRef<Parameters<typeof scheduleSave>[0] | null>(null);
  const retryCountRef = useRef(0);
  const MAX_RETRIES = 3;
  // Tracks whether we already attempted a Supabase session refresh for the
  // current 403. Prevents an infinite refresh→403→refresh loop if the user is
  // genuinely signed out or lacks permission on the doc.
  const refreshedThisRoundRef = useRef(false);

  /**
   * Try to refresh the Supabase session and return the new access token.
   * Returns null if refresh is not possible (no client / no session / failed).
   */
  const refreshSupabaseSession = useCallback(async (): Promise<string | null> => {
    try {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) return null;
      const { data, error } = await supabase.auth.refreshSession();
      if (error || !data?.session?.access_token) return null;
      return data.session.access_token;
    } catch {
      return null;
    }
  }, []);

  /**
   * Create a new document on the server.
   * Returns { id, editToken } or null on failure.
   */
  const createDocument = useCallback(
    async (args: {
      markdown: string;
      title?: string;
      userId?: string;
      anonymousId?: string;
    }) => {
      try {
        const res = await fetch("/api/docs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            markdown: args.markdown,
            title: args.title,
            userId: args.userId,
            anonymousId: args.anonymousId,
            editMode: args.userId ? "account" : "token",
            isDraft: true,
          }),
        });
        if (!res.ok) return null;
        const data = await res.json();
        lastSavedMdRef.current = args.markdown;
        if (data.updated_at) lastServerUpdatedAtRef.current = data.updated_at;
        setState({ isSaving: false, lastSaved: new Date(), error: null, conflict: null });
        return { id: data.id as string, editToken: data.editToken as string };
      } catch {
        setState((s) => ({ ...s, error: "Failed to create document" }));
        return null;
      }
    },
    []
  );

  /**
   * Schedule a debounced auto-save for an existing document.
   */
  const scheduleSave = useCallback(
    (args: {
      cloudId: string;
      markdown: string;
      title?: string;
      userId?: string;
      userEmail?: string;
      anonymousId?: string;
      editToken?: string;
    }) => {
      // Never save empty content — protect against content loss
      if (!args.markdown || !args.markdown.trim()) return;
      // Skip if content hasn't changed
      if (args.markdown === lastSavedMdRef.current) return;

      // Clear previous timer
      if (timerRef.current) clearTimeout(timerRef.current);

      timerRef.current = setTimeout(async () => {
        if (inflightRef.current) {
          // Save is in flight — queue this one for retry after current completes
          pendingRef.current = args;
          return;
        }
        inflightRef.current = true;
        setState((s) => ({ ...s, isSaving: true }));

        try {
          const patchBody: Record<string, unknown> = {
            action: "auto-save",
            markdown: args.markdown,
            title: args.title,
            userId: args.userId,
            userEmail: args.userEmail,
            anonymousId: args.anonymousId,
            editToken: args.editToken,
          };
          // Send expectedUpdatedAt for conflict detection
          if (lastServerUpdatedAtRef.current) {
            patchBody.expectedUpdatedAt = lastServerUpdatedAtRef.current;
          }

          // Attach Authorization header from current Supabase session so the
          // server-side verifyAuthToken() can identify the user even if the
          // page was opened a long time ago.
          let bearer: string | null = null;
          try {
            const supabase = getSupabaseBrowserClient();
            if (supabase) {
              const { data } = await supabase.auth.getSession();
              bearer = data?.session?.access_token ?? null;
            }
          } catch { /* ignore */ }

          const doFetch = (token: string | null) => fetch(`/api/docs/${args.cloudId}`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify(patchBody),
          });

          let res = await doFetch(bearer);

          // Auto-recover from expired token: if 403 and we haven't already
          // refreshed for this attempt, force a session refresh and retry once.
          if (res.status === 403 && !refreshedThisRoundRef.current) {
            refreshedThisRoundRef.current = true;
            const fresh = await refreshSupabaseSession();
            if (fresh) {
              res = await doFetch(fresh);
            }
          }
          // Reset the refresh guard on any non-403 (success, conflict, other err)
          if (res.status !== 403) refreshedThisRoundRef.current = false;

          if (res.ok) {
            const data = await res.json().catch(() => ({}));
            lastSavedMdRef.current = args.markdown;
            if (data.updated_at) {
              lastServerUpdatedAtRef.current = data.updated_at;
            }
            retryCountRef.current = 0; // Reset on success
            setState({ isSaving: false, lastSaved: new Date(), error: null, conflict: null });
          } else if (res.status === 409) {
            // Conflict: someone else saved in between
            const conflictData = await res.json().catch(() => ({}));
            setState((s) => ({
              ...s,
              isSaving: false,
              error: null,
              conflict: {
                serverMarkdown: conflictData.serverMarkdown || "",
                serverUpdatedAt: conflictData.serverUpdatedAt || "",
              },
            }));
          } else if (res.status === 403) {
            // Refresh already attempted; user is genuinely signed out.
            setState((s) => ({ ...s, isSaving: false, error: "Session expired. Refresh to continue editing." }));
          } else {
            const err = await res.json().catch(() => ({}));
            setState((s) => ({ ...s, isSaving: false, error: err.error || "Save failed" }));
          }
        } catch {
          // Retry with limit
          if (retryCountRef.current < MAX_RETRIES) {
            retryCountRef.current++;
            setState((s) => ({ ...s, isSaving: false, error: `Retrying (${retryCountRef.current}/${MAX_RETRIES})...` }));
            pendingRef.current = args;
          } else {
            setState((s) => ({ ...s, isSaving: false, error: "Save failed — check your connection" }));
            retryCountRef.current = 0;
          }
        } finally {
          inflightRef.current = false;
          // Process pending save if any
          const pending = pendingRef.current;
          if (pending && pending.markdown !== lastSavedMdRef.current) {
            pendingRef.current = null;
            scheduleSave(pending);
          }
        }
      }, debounceMs);
    },
    [debounceMs]
  );

  /**
   * Cancel any pending auto-save.
   */
  const cancel = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  /**
   * Force-push: re-save without expectedUpdatedAt (overwrite server).
   */
  const forceSave = useCallback(
    (args: {
      cloudId: string;
      markdown: string;
      title?: string;
      userId?: string;
      userEmail?: string;
      anonymousId?: string;
      editToken?: string;
    }) => {
      // Clear conflict state
      setState((s) => ({ ...s, conflict: null }));
      // Clear the expected timestamp so it sends without conflict check
      lastServerUpdatedAtRef.current = "";
      // Clear lastSavedMd to bypass dedup (content may match the failed save attempt)
      lastSavedMdRef.current = "";
      scheduleSave(args);
    },
    [scheduleSave]
  );

  /**
   * Dismiss conflict without action (e.g., after pulling server version).
   */
  const dismissConflict = useCallback(() => {
    setState((s) => ({ ...s, conflict: null }));
  }, []);

  /**
   * Update the last known server timestamp (e.g., after pulling).
   */
  const setLastServerUpdatedAt = useCallback((ts: string) => {
    lastServerUpdatedAtRef.current = ts;
  }, []);

  return {
    ...state,
    createDocument,
    scheduleSave,
    forceSave,
    dismissConflict,
    setLastServerUpdatedAt,
    cancel,
  };
}
