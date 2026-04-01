"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { setAllowedEmails, changeEditMode, copyToClipboard } from "@/lib/share";

interface ShareModalProps {
  docId: string;
  title?: string;
  userId: string;
  ownerEmail: string;
  currentEditMode: string;
  initialAllowedEmails: string[];
  onClose: () => void;
  onEditModeChange: (mode: "owner" | "public") => void;
  onAllowedEmailsChange: (emails: string[]) => void;
}

export default function ShareModal({
  docId,
  title,
  userId,
  ownerEmail,
  currentEditMode,
  initialAllowedEmails,
  onClose,
  onEditModeChange,
  onAllowedEmailsChange,
}: ShareModalProps) {
  const [emailInput, setEmailInput] = useState("");
  const [emails, setEmails] = useState<string[]>(initialAllowedEmails);
  const [generalAccess, setGeneralAccess] = useState<"restricted" | "anyone">(
    currentEditMode === "public" ? "anyone" : "restricted"
  );
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showAccessMenu, setShowAccessMenu] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const handleEsc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  const addEmail = useCallback(async (input: string) => {
    const newEmails = input
      .split(/[,;\s]+/)
      .map(e => e.trim().toLowerCase())
      .filter(e => e.includes("@") && !emails.includes(e) && e !== ownerEmail.toLowerCase());

    if (newEmails.length === 0) return;

    const updated = [...emails, ...newEmails];
    setEmails(updated);
    setEmailInput("");
    setSaving(true);
    try {
      const result = await setAllowedEmails(docId, userId, updated);
      setEmails(result);
      onAllowedEmailsChange(result);
    } catch { /* revert on error */ }
    setSaving(false);
  }, [emails, docId, userId, ownerEmail, onAllowedEmailsChange]);

  const removeEmail = useCallback(async (email: string) => {
    const updated = emails.filter(e => e !== email);
    setEmails(updated);
    setSaving(true);
    try {
      const result = await setAllowedEmails(docId, userId, updated);
      setEmails(result);
      onAllowedEmailsChange(result);
    } catch { /* revert */ }
    setSaving(false);
  }, [emails, docId, userId, onAllowedEmailsChange]);

  const handleAccessChange = useCallback(async (mode: "restricted" | "anyone") => {
    setGeneralAccess(mode);
    setShowAccessMenu(false);
    const editMode = mode === "anyone" ? "public" : "owner";
    try {
      await changeEditMode(docId, userId, editMode);
      onEditModeChange(editMode as "owner" | "public");
    } catch { /* ignore */ }
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
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M4 4l8 8M12 4l-8 8"/>
            </svg>
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
              {emails.map((email) => (
                <div
                  key={email}
                  className="flex items-center gap-3 px-3 py-2.5"
                  style={{ borderBottom: "1px solid var(--border-dim)" }}
                >
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                    style={{ background: "rgba(96,165,250,0.15)", color: "#60a5fa" }}
                  >
                    {email[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs truncate" style={{ color: "var(--text-secondary)" }}>{email}</p>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded" style={{ color: "var(--text-faint)", background: "var(--toggle-bg)" }}>
                    Viewer
                  </span>
                  <button
                    onClick={() => removeEmail(email)}
                    className="w-5 h-5 rounded flex items-center justify-center transition-colors hover:bg-[var(--toggle-bg)]"
                    style={{ color: "var(--text-faint)" }}
                    title="Remove access"
                  >
                    <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M4 4l8 8M12 4l-8 8"/>
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* General access */}
        <div className="px-5 pb-4">
          <label className="text-[11px] font-medium mb-2 block" style={{ color: "var(--text-muted)" }}>
            General access
          </label>
          <div className="relative">
            <button
              onClick={() => setShowAccessMenu(!showAccessMenu)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors"
              style={{ background: "var(--background)", border: "1px solid var(--border)" }}
            >
              {/* Icon */}
              {generalAccess === "restricted" ? (
                <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: "var(--toggle-bg)" }}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="var(--text-muted)" strokeWidth="1.3" strokeLinecap="round">
                    <rect x="4" y="7" width="8" height="6" rx="1.5"/><path d="M6 7V5a2 2 0 114 0v2"/>
                  </svg>
                </div>
              ) : (
                <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: "rgba(74,222,128,0.1)" }}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#4ade80" strokeWidth="1.3" strokeLinecap="round">
                    <circle cx="8" cy="8" r="6"/><path d="M2 8h12M8 2c-2 2.5-2 9.5 0 12M8 2c2 2.5 2 9.5 0 12"/>
                  </svg>
                </div>
              )}
              <div className="flex-1">
                <p className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>
                  {generalAccess === "restricted" ? "Restricted" : "Anyone with the link"}
                </p>
                <p className="text-[10px]" style={{ color: "var(--text-faint)" }}>
                  {generalAccess === "restricted"
                    ? "Only people with access can open"
                    : "Anyone on the internet with the link can edit"}
                </p>
              </div>
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="var(--text-faint)" strokeWidth="2" strokeLinecap="round">
                <path d="M4 6l4 4 4-4"/>
              </svg>
            </button>

            {/* Dropdown */}
            {showAccessMenu && (
              <div
                className="absolute top-full left-0 right-0 mt-1 rounded-lg shadow-xl py-1 z-10"
                style={{ background: "var(--menu-bg)", border: "1px solid var(--border)", boxShadow: "0 8px 32px rgba(0,0,0,0.4)" }}
              >
                <button
                  onClick={() => handleAccessChange("restricted")}
                  className="w-full flex items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-[var(--menu-hover)]"
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
                    <rect x="4" y="7" width="8" height="6" rx="1.5"/><path d="M6 7V5a2 2 0 114 0v2"/>
                  </svg>
                  <div>
                    <p className="text-xs font-medium" style={{ color: generalAccess === "restricted" ? "var(--accent)" : "var(--text-secondary)" }}>
                      Restricted {generalAccess === "restricted" && "\u2713"}
                    </p>
                    <p className="text-[10px]" style={{ color: "var(--text-faint)" }}>Only people with access</p>
                  </div>
                </button>
                <button
                  onClick={() => handleAccessChange("anyone")}
                  className="w-full flex items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-[var(--menu-hover)]"
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
                    <circle cx="8" cy="8" r="6"/><path d="M2 8h12M8 2c-2 2.5-2 9.5 0 12M8 2c2 2.5 2 9.5 0 12"/>
                  </svg>
                  <div>
                    <p className="text-xs font-medium" style={{ color: generalAccess === "anyone" ? "var(--accent)" : "var(--text-secondary)" }}>
                      Anyone with the link {generalAccess === "anyone" && "\u2713"}
                    </p>
                    <p className="text-[10px]" style={{ color: "var(--text-faint)" }}>Anyone can edit</p>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between px-5 py-3"
          style={{ borderTop: "1px solid var(--border-dim)" }}
        >
          <button
            onClick={handleCopyLink}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
            style={{ background: "var(--background)", border: "1px solid var(--border)", color: copied ? "#4ade80" : "var(--text-secondary)" }}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 10l4-4"/><path d="M8.5 3.5L10 2a2 2 0 012.83 2.83L11.5 6.17"/><path d="M4.5 9.83L3.17 11.17A2 2 0 006 14l1.5-1.5"/>
            </svg>
            {copied ? "Link copied!" : "Copy link"}
          </button>
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
