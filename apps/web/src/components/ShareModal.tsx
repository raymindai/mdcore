"use client";

import { useState, useCallback, useRef, useEffect, memo, type ReactNode } from "react";
import { setAllowedEmails as defaultSetAllowedEmails, changeEditMode as defaultChangeEditMode, copyToClipboard } from "@/lib/share";
import { showToast } from "@/components/Toast";
import { Lock, Link2, X } from "lucide-react";
import { Button, ModalShell } from "@/components/ui";

interface ShareModalProps {
  docId: string;
  title?: string;
  userId: string;
  ownerEmail: string;
  ownerName?: string;
  currentEditMode: string;
  initialAllowedEmails: string[];
  initialAllowedEditors: string[];
  onClose: () => void;
  onEditModeChange: (mode: "owner" | "view" | "public") => void;
  onAllowedEmailsChange: (emails: string[]) => void;
  onAllowedEditorsChange?: (editors: string[]) => void;
  onMakePrivate?: () => void;
  // Optional overrides — used by bundle share to cascade access onto included docs
  // and to substitute the bundle URL for "Copy link". Defaults preserve doc behavior.
  setAllowedEmailsOverride?: (id: string, userId: string, emails: string[], editors: string[]) => Promise<{ allowedEmails: string[]; allowedEditors: string[] }>;
  changeEditModeOverride?: (id: string, userId: string, mode: "owner" | "view" | "public") => Promise<void>;
  shareUrlOverride?: string;
  // Banner rendered between "People with access" and "General access" — used by bundle
  // share to surface the cascade warning and per-doc list.
  banner?: ReactNode;
  // Title for the dialog header. Defaults to `Share "<title>"`.
  headerTitle?: string;
}

function ShareModal({
  docId,
  title,
  userId,
  ownerEmail,
  ownerName,
  currentEditMode,
  initialAllowedEmails,
  initialAllowedEditors,
  onClose,
  onEditModeChange,
  onAllowedEmailsChange,
  onAllowedEditorsChange,
  onMakePrivate,
  setAllowedEmailsOverride,
  changeEditModeOverride,
  shareUrlOverride,
  banner,
  headerTitle,
}: ShareModalProps) {
  const setAllowedEmailsFn = setAllowedEmailsOverride || defaultSetAllowedEmails;
  const changeEditModeFn = changeEditModeOverride || defaultChangeEditMode;
  const [emailInput, setEmailInput] = useState("");
  const [emails, setEmails] = useState<string[]>(initialAllowedEmails);
  const [editors, setEditors] = useState<string[]>(initialAllowedEditors);
  const [generalAccess, setGeneralAccess] = useState<"restricted" | "anyone-view">(
    currentEditMode === "view" ? "anyone-view" : "restricted"
  );
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const saveAccess = useCallback(async (newEmails: string[], newEditors: string[]) => {
    setSaving(true);
    try {
      const result = await setAllowedEmailsFn(docId, userId, newEmails, newEditors);
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
    const updated = [...new Set([...emails, ...newEmails])];
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
          fromUserName: ownerName || ownerEmail.split("@")[0],
          message: `shared "${title || "Untitled"}" with you`,
        }),
      }).then((res) => {
        if (res.ok) showToast(`Email sent to ${email}`, "success");
      }).catch(() => {});
    }
  }, [emails, editors, ownerEmail, saveAccess, docId, userId, title]);

  const removeEmail = useCallback(async (email: string) => {
    const updatedEmails = emails.filter(e => e !== email);
    const updatedEditors = editors.filter(e => e !== email);
    setEmails(updatedEmails);
    setEditors(updatedEditors);
    await saveAccess(updatedEmails, updatedEditors);
    // If all emails removed and access was not already restricted, reset to restricted
    if (updatedEmails.length === 0 && generalAccess !== "restricted") {
      setGeneralAccess("restricted");
      try {
        await changeEditModeFn(docId, userId, "owner");
        onEditModeChange("owner");
      } catch {}
    }
  }, [emails, editors, saveAccess, generalAccess, docId, userId, onEditModeChange]);


  const handleAccessChange = useCallback(async (mode: "restricted" | "anyone-view") => {
    setGeneralAccess(mode);
    const editMode = mode === "anyone-view" ? "view" : "owner";
    try {
      await changeEditModeFn(docId, userId, editMode as "owner" | "view" | "public");
      onEditModeChange(editMode as "owner" | "view" | "public");
      showToast(mode === "restricted" ? "Access restricted" : "Anyone can view", "success");
    } catch { showToast("Failed to change access", "error"); }
  }, [docId, userId, onEditModeChange]);

  const handleCopyLink = useCallback(async () => {
    const url = shareUrlOverride || `${window.location.origin}/${docId}`;
    await copyToClipboard(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [docId, shareUrlOverride]);

  const dialogTitle = headerTitle || `Share${title ? ` "${title.length > 30 ? title.slice(0, 30) + "..." : title}"` : ""}`;

  return (
    <ModalShell
      open
      onClose={onClose}
      size="md"
      title={dialogTitle}
      headerExtras={saving ? (
        <span className="text-caption font-mono" style={{ color: "var(--text-faint)" }}>Saving…</span>
      ) : null}
      footer={
        <div className="flex items-center w-full" style={{ gap: "var(--space-2)" }}>
          {onMakePrivate && (
            <Button
              variant="danger"
              size="sm"
              leadingIcon={<Lock width={12} height={12} />}
              onClick={() => {
                if (!confirm("Make this document private? This will remove all sharing settings and revoke access for everyone.")) return;
                onMakePrivate();
              }}
            >
              Make Private
            </Button>
          )}
          <Button
            variant="secondary"
            size="sm"
            leadingIcon={<Link2 width={14} height={14} />}
            onClick={handleCopyLink}
            style={copied ? { color: "var(--color-success)" } : undefined}
          >
            {copied ? "Link copied!" : "Copy link"}
          </Button>
          <span style={{ flex: 1 }} />
          <Button variant="primary" size="md" onClick={onClose}>Done</Button>
        </div>
      }
    >
      <div>
        {/* Add people */}
        <div className="pb-4">
          <label className="text-caption font-medium mb-2 block" style={{ color: "var(--text-muted)" }}>
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
            <Button
              variant={emailInput.trim() ? "primary" : "secondary"}
              size="md"
              onClick={() => emailInput.trim() && addEmail(emailInput)}
              disabled={!emailInput.trim() || saving}
              loading={saving}
            >
              Add
            </Button>
          </div>
        </div>

        {/* People with access */}
        {(emails.length > 0 || true) && (
          <div className="pb-4">
            <label className="text-caption font-medium mb-2 block" style={{ color: "var(--text-muted)" }}>
              People with access
            </label>
            <div className="rounded-lg overflow-hidden" style={{ border: "1px solid var(--border-dim)" }}>
              {/* Owner */}
              <div
                className="flex items-center gap-3 px-3 py-2.5"
                style={{ borderBottom: emails.length > 0 ? "1px solid var(--border-dim)" : "none" }}
              >
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-caption font-bold shrink-0"
                  style={{ background: "var(--accent-dim)", color: "var(--accent)" }}
                >
                  {(ownerName || ownerEmail)[0]?.toUpperCase() || "O"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate" style={{ color: "var(--text-primary)" }}>{ownerName || ownerEmail}</p>
                  {ownerName && <p className="text-caption truncate" style={{ color: "var(--text-muted)" }}>{ownerEmail}</p>}
                </div>
                <span className="text-caption font-mono px-2 py-0.5 rounded" style={{ color: "var(--text-faint)", background: "var(--toggle-bg)" }}>
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
                    className="w-7 h-7 rounded-full flex items-center justify-center text-caption font-bold shrink-0"
                    style={{ background: "var(--color-cool-dim)", color: "var(--color-cool)" }}
                  >
                    {email[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs truncate" style={{ color: "var(--text-secondary)" }}>{email}</p>
                    <p className="text-caption" style={{ color: "var(--text-faint)" }}>Can view only</p>
                  </div>
                  <span className="text-caption font-mono px-2 py-0.5 rounded shrink-0" style={{ color: "var(--text-faint)", background: "var(--toggle-bg)" }}>
                    Viewer
                  </span>
                  <button
                    onClick={() => removeEmail(email)}
                    className="w-5 h-5 rounded flex items-center justify-center transition-colors hover:bg-[var(--toggle-bg)]"
                    style={{ color: "var(--text-faint)" }}
                    title="Remove access"
                  >
                    <X width={10} height={10} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Optional banner slot — bundle share uses this for cascade warning */}
        {banner && (
          <div className="pb-4">{banner}</div>
        )}

        {/* General access — toggle between Restricted and Anyone with link */}
        <div className="pb-4">
          <label className="text-caption font-medium mb-2 block" style={{ color: "var(--text-muted)" }}>
            General access
          </label>
          <div className="flex flex-col gap-1.5">
            {([
              { value: "restricted" as const, label: "Restricted", desc: "Only people added above can access", icon: <Lock width={16} height={16} strokeWidth={1.5} /> },
              { value: "anyone-view" as const, label: "Anyone with the link can view", desc: "View only — only the owner can edit", icon: <Link2 width={16} height={16} strokeWidth={1.5} /> },
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
                    <p className="text-caption" style={{ color: "var(--text-faint)" }}>{opt.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

      </div>
    </ModalShell>
  );
}

export default memo(ShareModal);
