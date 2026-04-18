"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { setAllowedEmails, changeEditMode, copyToClipboard } from "@/lib/share";
import { showToast } from "@/components/Toast";
import { Lock, Link2, Unlock, X, Trash2, Lock as LockIcon, Link as LinkIcon } from "lucide-react";

interface ShareModalProps {
  docId: string;
  title?: string;
  userId: string;
  ownerEmail: string;
  currentEditMode: string;
  initialAllowedEmails: string[];
  initialAllowedEditors: string[];
  onClose: () => void;
  onEditModeChange: (mode: "owner" | "view" | "public") => void;
  onAllowedEmailsChange: (emails: string[]) => void;
  onAllowedEditorsChange?: (editors: string[]) => void;
  onMakePrivate?: () => void;
}

export default function ShareModal({
  docId,
  title,
  userId,
  ownerEmail,
  currentEditMode,
  initialAllowedEmails,
  initialAllowedEditors,
  onClose,
  onEditModeChange,
  onAllowedEmailsChange,
  onAllowedEditorsChange,
  onMakePrivate,
}: ShareModalProps) {
  const [emailInput, setEmailInput] = useState("");
  const [emails, setEmails] = useState<string[]>(initialAllowedEmails);
  const [editors, setEditors] = useState<string[]>(initialAllowedEditors);
  const [generalAccess, setGeneralAccess] = useState<"restricted" | "anyone-view" | "anyone">(
    currentEditMode === "public" ? "anyone" : currentEditMode === "view" ? "anyone-view" : "restricted"
  );
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const handleEsc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  const saveAccess = useCallback(async (newEmails: string[], newEditors: string[]) => {
    setSaving(true);
    try {
      const result = await setAllowedEmails(docId, userId, newEmails, newEditors);
      setEmails(result.allowedEmails);
      setEditors(result.allowedEditors);
      onAllowedEmailsChange(result.allowedEmails);
      onAllowedEditorsChange?.(result.allowedEditors);
    } catch { showToast("Failed to update access", "error"); }
    setSaving(false);
  }, [docId, userId, onAllowedEmailsChange, onAllowedEditorsChange]);

  const addEmail = useCallback(async (input: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const newEmails = input
      .split(/[,;\s]+/)
      .map(e => e.trim().toLowerCase())
      .filter(e => emailRegex.test(e) && !emails.includes(e) && e !== ownerEmail.toLowerCase());
    if (newEmails.length === 0) {
      if (input.trim()) showToast("Invalid or duplicate email", "error");
      return;
    }
    const updated = [...emails, ...newEmails];
    setEmails(updated);
    setEmailInput("");
    await saveAccess(updated, editors);
    // Send notifications to new people
    for (const email of newEmails) {
      fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientEmail: email,
          documentId: docId,
          fromUserId: userId,
          fromUserName: ownerEmail.split("@")[0],
          message: `shared "${title || "Untitled"}" with you`,
        }),
      }).catch(() => {});
    }
  }, [emails, editors, ownerEmail, saveAccess, docId, userId, title]);

  const removeEmail = useCallback(async (email: string) => {
    const updatedEmails = emails.filter(e => e !== email);
    const updatedEditors = editors.filter(e => e !== email);
    setEmails(updatedEmails);
    setEditors(updatedEditors);
    await saveAccess(updatedEmails, updatedEditors);
  }, [emails, editors, saveAccess]);

  const toggleRole = useCallback(async (email: string) => {
    const isEditor = editors.includes(email);
    const updatedEditors = isEditor ? editors.filter(e => e !== email) : [...editors, email];
    setEditors(updatedEditors);
    await saveAccess(emails, updatedEditors);
  }, [emails, editors, saveAccess]);

  const handleAccessChange = useCallback(async (mode: "restricted" | "anyone-view" | "anyone") => {
    setGeneralAccess(mode);
    const editMode = mode === "anyone" ? "public" : mode === "anyone-view" ? "view" : "owner";
    try {
      await changeEditMode(docId, userId, editMode);
      onEditModeChange(editMode as "owner" | "view" | "public");
      showToast(mode === "restricted" ? "Access restricted" : mode === "anyone-view" ? "Anyone can view" : "Anyone can edit", "success");
    } catch { showToast("Failed to change access", "error"); }
  }, [docId, userId, onEditModeChange]);

  const handleCopyLink = useCallback(async () => {
    const url = `${window.location.origin}/${docId}`;
    await copyToClipboard(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [docId]);

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.7)" }}
      onClick={onClose}
    >
      <div
        ref={modalRef}
        className="w-full max-w-lg rounded-xl shadow-2xl"
        style={{ background: "var(--surface)", border: "1px solid var(--border)", maxHeight: "80vh", overflow: "auto" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <h2 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
            Share{title ? ` "${title.length > 30 ? title.slice(0, 30) + "..." : title}"` : ""}
          </h2>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-md flex items-center justify-center transition-colors hover:bg-[var(--toggle-bg)]"
            style={{ color: "var(--text-muted)" }}
          >
            <X width={14} height={14} />
          </button>
        </div>

        {/* Add people */}
        <div className="px-5 pb-4">
          <label className="text-[11px] font-medium mb-2 block" style={{ color: "var(--text-muted)" }}>
            Share with people
          </label>
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && emailInput.trim()) {
                  e.preventDefault();
                  addEmail(emailInput);
                }
              }}
              placeholder="Add people by email..."
              className="flex-1 px-3 py-2 rounded-lg text-sm outline-none transition-colors"
              style={{
                background: "var(--background)",
                border: "1px solid var(--border)",
                color: "var(--text-primary)",
              }}
            />
            <button
              onClick={() => emailInput.trim() && addEmail(emailInput)}
              disabled={!emailInput.trim() || saving}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{
                background: emailInput.trim() ? "var(--accent)" : "var(--toggle-bg)",
                color: emailInput.trim() ? "#000" : "var(--text-faint)",
                opacity: saving ? 0.5 : 1,
              }}
            >
              Add
            </button>
          </div>
        </div>

        {/* People with access */}
        {(emails.length > 0 || true) && (
          <div className="px-5 pb-4">
            <label className="text-[11px] font-medium mb-2 block" style={{ color: "var(--text-muted)" }}>
              People with access
            </label>
            <div className="rounded-lg overflow-hidden" style={{ border: "1px solid var(--border-dim)" }}>
              {/* Owner */}
              <div
                className="flex items-center gap-3 px-3 py-2.5"
                style={{ borderBottom: emails.length > 0 ? "1px solid var(--border-dim)" : "none" }}
              >
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                  style={{ background: "var(--accent-dim)", color: "var(--accent)" }}
                >
                  {ownerEmail[0]?.toUpperCase() || "O"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate" style={{ color: "var(--text-primary)" }}>{ownerEmail}</p>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded" style={{ color: "var(--text-faint)", background: "var(--toggle-bg)" }}>
                  Owner
                </span>
              </div>

              {/* Shared people */}
              {emails.map((email) => {
                const isEditor = editors.includes(email);
                return (
                <div
                  key={email}
                  className="flex items-center gap-3 px-3 py-2.5"
                  style={{ borderBottom: "1px solid var(--border-dim)" }}
                >
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                    style={{ background: isEditor ? "var(--accent-dim)" : "rgba(96,165,250,0.15)", color: isEditor ? "var(--accent)" : "#60a5fa" }}
                  >
                    {email[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs truncate" style={{ color: "var(--text-secondary)" }}>{email}</p>
                    <p className="text-[9px]" style={{ color: "var(--text-faint)" }}>{isEditor ? "Can view and edit" : "Can view only"}</p>
                  </div>
                  {/* Role selector — two inline buttons */}
                  <div className="flex shrink-0 rounded overflow-hidden" style={{ border: "1px solid var(--border-dim)" }}>
                    <button
                      onClick={() => isEditor && toggleRole(email)}
                      className="text-[9px] px-2 py-1 transition-colors"
                      style={{
                        background: !isEditor ? "var(--surface)" : "transparent",
                        color: !isEditor ? "var(--text-primary)" : "var(--text-faint)",
                        fontWeight: !isEditor ? 600 : 400,
                      }}
                    >
                      Viewer
                    </button>
                    <button
                      onClick={() => !isEditor && toggleRole(email)}
                      className="text-[9px] px-2 py-1 transition-colors"
                      style={{
                        background: isEditor ? "var(--accent-dim)" : "transparent",
                        color: isEditor ? "var(--accent)" : "var(--text-faint)",
                        fontWeight: isEditor ? 600 : 400,
                        borderLeft: "1px solid var(--border-dim)",
                      }}
                    >
                      Editor
                    </button>
                  </div>
                  <button
                    onClick={() => removeEmail(email)}
                    className="w-5 h-5 rounded flex items-center justify-center transition-colors hover:bg-[var(--toggle-bg)]"
                    style={{ color: "var(--text-faint)" }}
                    title="Remove access"
                  >
                    <X width={10} height={10} />
                  </button>
                </div>
                );
              })}
            </div>
          </div>
        )}

        {/* General access — toggle between Restricted and Anyone with link */}
        <div className="px-5 pb-4">
          <label className="text-[11px] font-medium mb-2 block" style={{ color: "var(--text-muted)" }}>
            General access
          </label>
          <div className="flex flex-col gap-1.5">
            {([
              { value: "restricted" as const, label: "Restricted", desc: "Only people added above can access", icon: <Lock width={16} height={16} strokeWidth={1.5} /> },
              { value: "anyone-view" as const, label: "Anyone with the link can view", desc: "View only — no editing allowed", icon: <Link2 width={16} height={16} strokeWidth={1.5} /> },
              { value: "anyone" as const, label: "Anyone with the link can edit", desc: "Full editing access for everyone", icon: <Unlock width={16} height={16} strokeWidth={1.5} /> },
            ]).map((opt) => {
              const selected = generalAccess === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => !selected && handleAccessChange(opt.value)}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors"
                  style={{
                    background: selected ? "var(--accent-dim)" : "var(--background)",
                    border: selected ? "1px solid var(--accent)" : "1px solid var(--border-dim)",
                  }}
                >
                  {/* Radio circle */}
                  <span className="shrink-0 w-4 h-4 rounded-full flex items-center justify-center" style={{ border: selected ? "none" : "2px solid var(--border)" }}>
                    {selected && <span className="w-4 h-4 rounded-full flex items-center justify-center" style={{ background: "var(--accent)" }}>
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#000" }} />
                    </span>}
                  </span>
                  <span className="shrink-0" style={{ color: selected ? "var(--accent)" : "var(--text-faint)" }}>{opt.icon}</span>
                  <div className="flex-1">
                    <p className="text-xs font-medium" style={{ color: selected ? "var(--text-primary)" : "var(--text-muted)" }}>{opt.label}</p>
                    <p className="text-[10px]" style={{ color: "var(--text-faint)" }}>{opt.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between px-5 py-3"
          style={{ borderTop: "1px solid var(--border-dim)" }}
        >
          {onMakePrivate && (
            <button
              onClick={() => {
                if (!confirm("Make this document private? This will remove all sharing settings and revoke access for everyone.")) return;
                onMakePrivate();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors hover:bg-[rgba(239,68,68,0.1)]"
              style={{ color: "#ef4444", border: "1px solid rgba(239,68,68,0.2)" }}
            >
              <Lock width={12} height={12} />
              Make Private
            </button>
          )}
          <button
            onClick={handleCopyLink}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
            style={{ background: "var(--background)", border: "1px solid var(--border)", color: copied ? "#4ade80" : "var(--text-secondary)" }}
          >
            <Link2 width={14} height={14} />
            {copied ? "Link copied!" : "Copy link"}
          </button>
          <span style={{ flex: 1 }} />
          <button
            onClick={onClose}
            className="px-5 py-1.5 rounded-lg text-sm font-medium transition-colors"
            style={{ background: "var(--accent)", color: "#000" }}
          >
            Done
          </button>
        </div>

        {/* Saving indicator */}
        {saving && (
          <div className="absolute top-3 right-12 text-[10px] font-mono" style={{ color: "var(--text-faint)" }}>
            Saving...
          </div>
        )}
      </div>
    </div>
  );
}
