"use client";

import { useRef, useCallback, useState } from "react";

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

          const res = await fetch(`/api/docs/${args.cloudId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(patchBody),
          });

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
            // Permission error — likely session expired or owner mismatch
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
