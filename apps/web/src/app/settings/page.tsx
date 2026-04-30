"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/useAuth";
import { buildAuthHeaders } from "@/lib/auth-fetch";
import { ArrowLeft, Trash2, Loader2 } from "lucide-react";
import Link from "next/link";

function dicebearUrl(seed: string, size = 80): string {
  return `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(seed)}&size=${size}`;
}

function resolveAvatar(
  profile: { avatar_url?: string | null } | null,
  user: { email?: string; user_metadata?: { avatar_url?: string } } | null,
  size = 80
): string {
  return profile?.avatar_url || user?.user_metadata?.avatar_url || dicebearUrl(user?.email || "user", size);
}

export default function SettingsPage() {
  const { user, profile, loading: authLoading, accessToken, isAuthenticated, signOut } = useAuth();

  const [displayName, setDisplayName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    if (profile?.display_name) setDisplayName(profile.display_name);
  }, [profile]);

  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem("mdfy-theme") : null;
    setTheme((stored as "dark" | "light") || "dark");
  }, []);

  const handleSaveDisplayName = useCallback(async () => {
    if (!accessToken || !user) return;
    setSaving(true);
    try {
      const { getSupabaseBrowserClient } = await import("@/lib/supabase-browser");
      const supabase = getSupabaseBrowserClient();
      if (supabase) {
        await supabase.from("profiles").upsert({ id: user.id, display_name: displayName });
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      /* ignore */
    } finally {
      setSaving(false);
    }
  }, [accessToken, user, displayName]);

  const handleDeleteAccount = useCallback(async () => {
    if (!accessToken) return;
    setDeleting(true);
    try {
      const res = await fetch("/api/user/delete", {
        method: "DELETE",
        headers: buildAuthHeaders({ accessToken, userId: user?.id, userEmail: user?.email }),
      });
      if (res.ok) {
        signOut();
        window.location.href = "/";
      }
    } catch {
      /* ignore */
    } finally {
      setDeleting(false);
    }
  }, [accessToken, user, signOut]);

  const handleThemeChange = (newTheme: "dark" | "light") => {
    setTheme(newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
    try { localStorage.setItem("mdfy-theme", newTheme); } catch {}
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--background)" }}>
        <Loader2 className="animate-spin" width={24} height={24} style={{ color: "var(--accent)" }} />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: "var(--background)", color: "var(--text-primary)" }}>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Sign in to access account settings.</p>
        <Link href="/" className="text-sm font-medium px-4 py-2 rounded-lg" style={{ background: "var(--accent)", color: "#000", textDecoration: "none" }}>
          Go to mdfy.app
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--background)", color: "var(--text-primary)" }}>
      <div className="max-w-lg mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Link href="/" className="flex items-center justify-center w-8 h-8 rounded-md transition-colors hover:bg-[var(--accent-dim)]" style={{ color: "var(--text-muted)" }}>
            <ArrowLeft width={16} height={16} />
          </Link>
          <h1 className="text-lg font-semibold">Account Settings</h1>
        </div>

        {/* Avatar */}
        <div className="flex items-center gap-4 mb-8 pb-6" style={{ borderBottom: "1px solid var(--border-dim)" }}>
          <img
            src={resolveAvatar(profile, user, 64)}
            alt=""
            className="w-16 h-16 rounded-full shrink-0"
            style={{ border: "2px solid var(--border)" }}
          />
          <div>
            <div className="font-medium">{profile?.display_name || user?.email?.split("@")[0]}</div>
            <div className="text-sm" style={{ color: "var(--text-faint)" }}>{user?.email}</div>
          </div>
        </div>

        {/* Display Name */}
        <div className="mb-6">
          <label className="block text-xs font-medium mb-1.5 uppercase tracking-wide" style={{ color: "var(--text-faint)" }}>
            Display Name
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="Your name"
              className="flex-1 px-3 py-2 rounded-lg text-sm outline-none transition-colors"
              style={{
                background: "var(--input-bg, var(--surface))",
                border: "1px solid var(--border)",
                color: "var(--text-primary)",
              }}
            />
            <button
              onClick={handleSaveDisplayName}
              disabled={saving}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{ background: "var(--accent)", color: "#000", opacity: saving ? 0.6 : 1 }}
            >
              {saving ? "Saving..." : saved ? "Saved" : "Save"}
            </button>
          </div>
        </div>

        {/* Email (read-only) */}
        <div className="mb-6">
          <label className="block text-xs font-medium mb-1.5 uppercase tracking-wide" style={{ color: "var(--text-faint)" }}>
            Email
          </label>
          <div
            className="px-3 py-2 rounded-lg text-sm"
            style={{
              background: "var(--input-bg, var(--surface))",
              border: "1px solid var(--border)",
              color: "var(--text-faint)",
              opacity: 0.7,
            }}
          >
            {user?.email}
          </div>
        </div>

        {/* Theme */}
        <div className="mb-8">
          <label className="block text-xs font-medium mb-1.5 uppercase tracking-wide" style={{ color: "var(--text-faint)" }}>
            Theme
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => handleThemeChange("dark")}
              className="flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{
                background: theme === "dark" ? "var(--accent-dim)" : "var(--surface)",
                border: `1px solid ${theme === "dark" ? "var(--accent)" : "var(--border)"}`,
                color: theme === "dark" ? "var(--accent)" : "var(--text-secondary)",
              }}
            >
              Dark
            </button>
            <button
              onClick={() => handleThemeChange("light")}
              className="flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{
                background: theme === "light" ? "var(--accent-dim)" : "var(--surface)",
                border: `1px solid ${theme === "light" ? "var(--accent)" : "var(--border)"}`,
                color: theme === "light" ? "var(--accent)" : "var(--text-secondary)",
              }}
            >
              Light
            </button>
          </div>
        </div>

        {/* Plan Info */}
        <div className="mb-8 pb-6" style={{ borderBottom: "1px solid var(--border-dim)" }}>
          <label className="block text-xs font-medium mb-1.5 uppercase tracking-wide" style={{ color: "var(--text-faint)" }}>
            Plan
          </label>
          <div className="flex items-center gap-2">
            <span
              className="text-xs px-2 py-1 rounded font-mono font-semibold"
              style={{ background: "var(--accent-dim)", color: "var(--accent)" }}
            >
              {(profile?.plan || "free").toUpperCase()}
            </span>
            <span className="text-xs" style={{ color: "var(--text-faint)" }}>
              Unlimited documents, free forever.
            </span>
          </div>
        </div>

        {/* Danger Zone */}
        <div>
          <label className="block text-xs font-medium mb-1.5 uppercase tracking-wide" style={{ color: "#ef4444" }}>
            Danger Zone
          </label>
          {!confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors"
              style={{
                background: "rgba(239,68,68,0.1)",
                border: "1px solid rgba(239,68,68,0.3)",
                color: "#f87171",
              }}
            >
              <Trash2 width={14} height={14} />
              Delete Account
            </button>
          ) : (
            <div className="p-4 rounded-lg" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)" }}>
              <p className="text-sm mb-3" style={{ color: "#f87171" }}>
                This will permanently delete your account, all documents, and all data. This action cannot be undone.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleting}
                  className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  style={{ background: "#ef4444", color: "#fff", opacity: deleting ? 0.6 : 1 }}
                >
                  {deleting ? "Deleting..." : "Yes, Delete My Account"}
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="px-4 py-2 rounded-lg text-sm transition-colors"
                  style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
