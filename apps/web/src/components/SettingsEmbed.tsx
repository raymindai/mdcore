"use client";

// Account Settings — reusable surface.
//
// Two render contexts:
//   1. The /settings page route. Wraps this component in min-h-screen
//      and lets the back arrow navigate to `/`.
//   2. An in-app overlay inside MdEditor (founder ask: settings should
//      not be a separate page navigation). The overlay passes
//      `onClose` so the header swaps the back arrow for an X that
//      dismisses the overlay instead of routing away.
//
// State + handlers are identical across both; only the wrapper and
// the close affordance differ.

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/useAuth";
import { buildAuthHeaders } from "@/lib/auth-fetch";
import { ArrowLeft, Trash2, Loader2, X, Check } from "lucide-react";
import Link from "next/link";
import {
  CURATOR_OPTIONS,
  AUTO_LEVELS,
  defaultCuratorSettings,
  loadCuratorSettings,
  saveCuratorSettings,
  type CuratorSettings,
  type AutoLevel,
} from "@/lib/curator-options";
import {
  ACCENT_COLORS,
  COLOR_SCHEMES,
  type AccentColor,
  type ColorScheme,
} from "@/lib/theme-options";

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

export default function SettingsEmbed({ onClose }: { onClose?: () => void }) {
  const { user, profile, loading: authLoading, accessToken, isAuthenticated, signOut } = useAuth();

  const [displayName, setDisplayName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  // Skin Theme + Key Color — selected and hover-preview values. The
  // hover-preview path writes the data-scheme / data-accent
  // attributes directly so the whole UI re-themes instantly; on
  // mouseleave we restore the attributes to whatever the user has
  // actually selected. Selection writes localStorage so MdEditor's
  // useTheme picks the same value up on its next mount.
  const [skinScheme, setSkinScheme] = useState<ColorScheme>("default");
  const [keyColor, setKeyColor] = useState<AccentColor>("orange");
  useEffect(() => {
    if (typeof window === "undefined") return;
    const s = (localStorage.getItem("mdfy-scheme") as ColorScheme) || "default";
    const a = (localStorage.getItem("mdfy-accent") as AccentColor) || "orange";
    setSkinScheme(s);
    setKeyColor(a);
  }, []);
  const applyScheme = (s: ColorScheme) => {
    if (typeof document === "undefined") return;
    if (s === "default") document.documentElement.removeAttribute("data-scheme");
    else document.documentElement.setAttribute("data-scheme", s);
  };
  const applyAccent = (a: AccentColor) => {
    if (typeof document === "undefined") return;
    if (a === "orange") document.documentElement.removeAttribute("data-accent");
    else document.documentElement.setAttribute("data-accent", a);
  };
  const selectScheme = (s: ColorScheme) => {
    setSkinScheme(s);
    applyScheme(s);
    try { localStorage.setItem("mdfy-scheme", s); } catch {}
  };
  const selectAccent = (a: AccentColor) => {
    setKeyColor(a);
    applyAccent(a);
    try { localStorage.setItem("mdfy-accent", a); } catch {}
  };
  const [curatorSettings, setCuratorSettings] = useState<CuratorSettings>(() => defaultCuratorSettings());
  useEffect(() => { setCuratorSettings(loadCuratorSettings()); }, []);
  const toggleCurator = <K extends keyof CuratorSettings>(id: K, next: CuratorSettings[K]) => {
    setCuratorSettings((prev) => {
      const updated = { ...prev, [id]: next } as CuratorSettings;
      saveCuratorSettings(updated);
      try { window.dispatchEvent(new CustomEvent("mdfy-curator-settings-changed", { detail: updated })); } catch { /* ignore */ }
      return updated;
    });
  };

  const [hubSlug, setHubSlug] = useState("");
  const [hubPublic, setHubPublic] = useState(false);
  const [hubDescription, setHubDescription] = useState("");
  const [hubSaving, setHubSaving] = useState(false);
  const [hubError, setHubError] = useState<string | null>(null);
  const [hubSaved, setHubSaved] = useState(false);

  useEffect(() => {
    if (profile?.display_name) setDisplayName(profile.display_name);
    const p = profile as { hub_slug?: string | null; hub_public?: boolean; hub_description?: string | null } | null;
    if (p?.hub_slug) setHubSlug(p.hub_slug);
    if (typeof p?.hub_public === "boolean") setHubPublic(p.hub_public);
    if (p?.hub_description) setHubDescription(p.hub_description);
  }, [profile]);

  const handleSaveHub = useCallback(async () => {
    if (!user) return;
    setHubError(null);
    const slug = hubSlug.trim().toLowerCase();
    if (hubPublic && !/^[a-z0-9_-]{3,32}$/.test(slug)) {
      setHubError("Slug must be 3-32 chars (lowercase letters, digits, hyphens, underscores).");
      return;
    }
    setHubSaving(true);
    try {
      const { getSupabaseBrowserClient } = await import("@/lib/supabase-browser");
      const supabase = getSupabaseBrowserClient();
      if (!supabase) throw new Error("client unavailable");
      const { error } = await supabase.from("profiles").update({
        hub_slug: slug || null,
        hub_public: hubPublic,
        hub_description: hubDescription.trim() || null,
      }).eq("id", user.id);
      if (error) {
        if (error.code === "23505") setHubError("That slug is already taken — pick another.");
        else setHubError(error.message);
        return;
      }
      setHubSaved(true);
      setTimeout(() => setHubSaved(false), 2000);
    } catch (err) {
      setHubError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setHubSaving(false);
    }
  }, [user, hubSlug, hubPublic, hubDescription]);

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
      <div className="h-full flex items-center justify-center" style={{ background: "var(--background)" }}>
        <Loader2 className="animate-spin" width={24} height={24} style={{ color: "var(--accent)" }} />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4" style={{ background: "var(--background)", color: "var(--text-primary)" }}>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Sign in to access account settings.</p>
        {onClose ? (
          <button onClick={onClose} className="text-sm font-medium px-4 py-2 rounded-lg" style={{ background: "var(--accent)", color: "#000" }}>
            Close
          </button>
        ) : (
          <Link href="/" className="text-sm font-medium px-4 py-2 rounded-lg" style={{ background: "var(--accent)", color: "#000", textDecoration: "none" }}>
            Go to mdfy.app
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto" style={{ background: "var(--background)", color: "var(--text-primary)" }}>
      {/* Frame matches HubEmbed and BundleOverview (max-w-3xl, px-6
          py-10) so Settings reads as part of the same destination
          family. The avatar leads the header so the surface starts
          with identity, the same way Hub/Bundle Overview start with
          their primitive's identity glyph + name. */}
      <div className="max-w-3xl mx-auto px-6 py-10">
        {/* Close affordance — only when rendered as overlay. The
            page route gets a back-arrow on the heading row instead. */}
        {onClose && (
          <div className="flex justify-end mb-4">
            <button
              onClick={onClose}
              className="flex items-center justify-center w-8 h-8 rounded-md transition-colors hover:bg-[var(--accent-dim)]"
              style={{ color: "var(--text-muted)" }}
              title="Close (Esc)"
            >
              <X width={16} height={16} />
            </button>
          </div>
        )}
        <header className="flex items-start gap-4 mb-8">
          {!onClose && (
            <Link
              href="/"
              className="flex items-center justify-center w-8 h-8 mt-1.5 rounded-md transition-colors hover:bg-[var(--accent-dim)] shrink-0"
              style={{ color: "var(--text-muted)" }}
            >
              <ArrowLeft width={16} height={16} />
            </Link>
          )}
          <img
            src={resolveAvatar(profile, user, 56)}
            alt=""
            className="w-14 h-14 rounded-2xl shrink-0"
            style={{ border: "1px solid var(--border)" }}
          />
          <div className="min-w-0 flex-1">
            <h1 className="text-display font-bold tracking-tight" style={{ color: "var(--text-primary)", lineHeight: 1.2 }}>
              {profile?.display_name || user?.email?.split("@")[0] || "Account"}
            </h1>
            <p className="text-body mt-1" style={{ color: "var(--text-secondary)" }}>
              {user?.email}
            </p>
            <p className="text-caption font-mono mt-1.5" style={{ color: "var(--text-faint)" }}>
              {(profile?.plan || "free").toUpperCase()} plan
            </p>
          </div>
        </header>

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

        {/* Hub URL — opt-in public knowledge hub */}
        <div className="mb-8 pb-6" style={{ borderBottom: "1px solid var(--border-dim)" }}>
          <label className="block text-xs font-medium mb-1.5 uppercase tracking-wide" style={{ color: "var(--accent)" }}>
            Knowledge Hub
          </label>
          <p className="text-xs leading-relaxed mb-3" style={{ color: "var(--text-muted)" }}>
            A single URL pointing to all your public docs and bundles — paste it into any AI to deploy your entire hub as context. Disabled by default.
          </p>
          <label className="flex items-center gap-2 mb-3 cursor-pointer">
            <input
              type="checkbox"
              checked={hubPublic}
              onChange={e => setHubPublic(e.target.checked)}
              className="w-4 h-4"
              style={{ accentColor: "var(--accent)" }}
            />
            <span className="text-sm" style={{ color: "var(--text-primary)" }}>Make my hub public</span>
          </label>
          {hubPublic && (
            <>
              <div className="mb-3">
                <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-faint)" }}>
                  Slug (3–32 chars, lowercase, hyphens/underscores allowed)
                </label>
                <div className="flex items-center gap-1">
                  <span className="text-xs px-2 py-2 rounded-lg" style={{ color: "var(--text-faint)", background: "var(--input-bg, var(--surface))", border: "1px solid var(--border)" }}>
                    mdfy.app/hub/
                  </span>
                  <input
                    type="text"
                    value={hubSlug}
                    onChange={e => setHubSlug(e.target.value.toLowerCase())}
                    placeholder="your-handle"
                    maxLength={32}
                    className="flex-1 px-3 py-2 rounded-lg text-sm outline-none font-mono"
                    style={{ background: "var(--input-bg, var(--surface))", border: "1px solid var(--border)", color: "var(--text-primary)" }}
                  />
                </div>
              </div>
              <div className="mb-3">
                <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-faint)" }}>
                  Description (optional, shown on hub page)
                </label>
                <textarea
                  value={hubDescription}
                  onChange={e => setHubDescription(e.target.value)}
                  placeholder="Building knowledge in public — capture, bundle, deploy."
                  rows={2}
                  maxLength={280}
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none"
                  style={{ background: "var(--input-bg, var(--surface))", border: "1px solid var(--border)", color: "var(--text-primary)" }}
                />
              </div>
            </>
          )}
          {hubError && (
            <p className="text-caption mb-2" style={{ color: "var(--color-danger, #ef4444)" }}>{hubError}</p>
          )}
          <div className="flex items-center gap-3">
            <button
              onClick={handleSaveHub}
              disabled={hubSaving}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{ background: "var(--accent)", color: "#000", opacity: hubSaving ? 0.6 : 1 }}
            >
              {hubSaving ? "Saving..." : hubSaved ? "Saved" : "Save"}
            </button>
            {hubPublic && hubSlug && /^[a-z0-9_-]{3,32}$/.test(hubSlug) && (
              <Link
                href={`/hub/${hubSlug}`}
                className="text-xs underline"
                style={{ color: "var(--accent)" }}
                target="_blank"
              >
                View at mdfy.app/hub/{hubSlug} →
              </Link>
            )}
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

        {/* Skin Theme — eight presets, each shown with a dark-mode and
            a light-mode swatch so the user sees both ends of the scheme.
            Hovering a row applies the scheme via data-scheme on the
            root element (whole UI re-themes); leaving the row restores
            the active selection. Clicking saves it. */}
        <div className="mb-8">
          <label className="block text-xs font-medium mb-1.5 uppercase tracking-wide" style={{ color: "var(--text-faint)" }}>
            Skin Theme
          </label>
          <p className="text-xs leading-relaxed mb-3" style={{ color: "var(--text-muted)" }}>
            Hover a theme to preview the whole UI; click to keep it.
          </p>
          <div className="rounded-lg overflow-hidden" style={{ border: "1px solid var(--border-dim)" }}>
            {COLOR_SCHEMES.map((s, idx) => {
              const isSelected = skinScheme === s.name;
              const isLast = idx === COLOR_SCHEMES.length - 1;
              return (
                <button
                  key={s.name}
                  onClick={() => selectScheme(s.name)}
                  onMouseEnter={() => applyScheme(s.name)}
                  onMouseLeave={() => applyScheme(skinScheme)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-[var(--toggle-bg)]"
                  style={{
                    borderBottom: isLast ? "none" : "1px solid var(--border-dim)",
                    background: isSelected ? "var(--accent-dim)" : "transparent",
                  }}
                >
                  {/* Dual swatch — dark BG + light BG of the scheme,
                      both carrying the scheme's signature hue so the
                      user sees how it sits over each canvas. */}
                  <span className="flex items-center gap-1 shrink-0" title={`${s.label} — ${s.desc}`}>
                    <span
                      className="rounded-md flex items-center justify-center"
                      style={{ width: 22, height: 22, background: s.darkBg, border: "1px solid var(--border-dim)" }}
                    >
                      <span className="rounded-full" style={{ width: 9, height: 9, background: s.preview }} />
                    </span>
                    <span
                      className="rounded-md flex items-center justify-center"
                      style={{ width: 22, height: 22, background: s.lightBg, border: "1px solid var(--border-dim)" }}
                    >
                      <span className="rounded-full" style={{ width: 9, height: 9, background: s.preview }} />
                    </span>
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium" style={{ color: isSelected ? "var(--accent)" : "var(--text-primary)" }}>{s.label}</div>
                    <div className="text-xs" style={{ color: "var(--text-faint)" }}>{s.desc}</div>
                  </div>
                  {isSelected && (
                    <Check width={14} height={14} className="shrink-0" style={{ color: "var(--accent)" }} />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Key Color — eight accents. Each row shows the dark-mode
            tone next to the light-mode tone so the user sees both
            variants; hovering applies the accent globally. */}
        <div className="mb-8 pb-6" style={{ borderBottom: "1px solid var(--border-dim)" }}>
          <label className="block text-xs font-medium mb-1.5 uppercase tracking-wide" style={{ color: "var(--text-faint)" }}>
            Key Color
          </label>
          <p className="text-xs leading-relaxed mb-3" style={{ color: "var(--text-muted)" }}>
            Hover a color to preview it across the UI; click to keep it.
          </p>
          <div className="rounded-lg overflow-hidden" style={{ border: "1px solid var(--border-dim)" }}>
            {ACCENT_COLORS.map((c, idx) => {
              const isSelected = keyColor === c.name;
              const isLast = idx === ACCENT_COLORS.length - 1;
              return (
                <button
                  key={c.name}
                  onClick={() => selectAccent(c.name)}
                  onMouseEnter={() => applyAccent(c.name)}
                  onMouseLeave={() => applyAccent(keyColor)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-[var(--toggle-bg)]"
                  style={{
                    borderBottom: isLast ? "none" : "1px solid var(--border-dim)",
                    background: isSelected ? "var(--accent-dim)" : "transparent",
                  }}
                >
                  <span className="flex items-center gap-1 shrink-0" title={`${c.label} — dark / light variants`}>
                    <span
                      className="rounded-md"
                      style={{ width: 22, height: 22, background: c.dark, border: "1px solid var(--border-dim)" }}
                    />
                    <span
                      className="rounded-md"
                      style={{ width: 22, height: 22, background: c.light, border: "1px solid var(--border-dim)" }}
                    />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium" style={{ color: isSelected ? "var(--accent)" : "var(--text-primary)" }}>{c.label}</div>
                    <div className="text-xs font-mono" style={{ color: "var(--text-faint)" }}>
                      Dark {c.dark} · Light {c.light}
                    </div>
                  </div>
                  {isSelected && (
                    <Check width={14} height={14} className="shrink-0" style={{ color: "var(--accent)" }} />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Auto-management — Curator toggle list */}
        <div className="mb-8 pb-6" style={{ borderBottom: "1px solid var(--border-dim)" }}>
          <label className="block text-xs font-medium mb-1.5 uppercase tracking-wide" style={{ color: "var(--accent)" }}>
            Auto-management
          </label>
          <p className="text-xs leading-relaxed mb-4" style={{ color: "var(--text-muted)" }}>
            Curator signals scan your hub and surface findings in Needs Review. With auto-management ON, safe findings are resolved for you on the trigger you pick; destructive ones (like duplicate trash) still ask first. With it OFF, findings just surface and you act on them by hand.
          </p>

          {/* Aggressiveness — four-step scale. "Off" is current
              manual-only behaviour; each step up widens the action
              matrix. Irreversible actions (public publish, external
              link rewrites, hard delete) are NEVER automated even at
              Aggressive — every auto-action is recoverable from
              Trash. The dots act as a slider indicator so the scale
              reads as continuous, not four equal radio options. */}
          <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-faint)" }}>
            Aggressiveness
          </label>
          <div className="rounded-lg overflow-hidden mb-4" style={{ border: "1px solid var(--border-dim)" }}>
            {AUTO_LEVELS.map((lvl, idx) => {
              const active = curatorSettings.autoLevel === lvl.id;
              const isLast = idx === AUTO_LEVELS.length - 1;
              return (
                <button
                  key={lvl.id}
                  onClick={() => toggleCurator("autoLevel", lvl.id)}
                  className="w-full flex items-start gap-3 px-3 py-3 text-left transition-colors hover:bg-[var(--toggle-bg)]"
                  style={{
                    borderBottom: isLast ? "none" : "1px solid var(--border-dim)",
                    background: active ? "var(--accent-dim)" : "transparent",
                  }}
                >
                  <span className="flex items-center gap-0.5 shrink-0 mt-1" aria-hidden>
                    {[0, 1, 2, 3].map((i) => (
                      <span
                        key={i}
                        className="rounded-full"
                        style={{
                          width: 6,
                          height: 6,
                          background: i <= idx ? (active ? "var(--accent)" : "var(--text-muted)") : "var(--border-dim)",
                        }}
                      />
                    ))}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-semibold" style={{ color: active ? "var(--accent)" : "var(--text-primary)" }}>{lvl.label}</span>
                      <span className="text-xs font-mono" style={{ color: "var(--text-faint)" }}>{lvl.shortDesc}</span>
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>
                      {lvl.longDesc}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Trigger — when does auto-resolution fire. Greyed when
              level is Off since the trigger has no effect. */}
          <div className="mb-4" style={{ opacity: curatorSettings.autoLevel === "off" ? 0.5 : 1 }}>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-faint)" }}>
              Trigger
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {([
                { v: "manual", label: "Manual", desc: "Only when you click" },
                { v: "on-open", label: "On hub open", desc: "Each Hub visit" },
                { v: "interval", label: "Every 30 min", desc: "Background scan" },
              ] as const).map(({ v, label, desc }) => {
                const active = curatorSettings.autoTrigger === v;
                const enabled = curatorSettings.autoLevel !== "off";
                return (
                  <button
                    key={v}
                    onClick={() => enabled && toggleCurator("autoTrigger", v)}
                    disabled={!enabled}
                    className="flex flex-col items-start gap-0.5 px-3 py-2 rounded-md text-left transition-colors"
                    style={{
                      background: active ? "var(--accent-dim)" : "var(--surface)",
                      border: `1px solid ${active ? "var(--accent)" : "var(--border-dim)"}`,
                      color: active ? "var(--accent)" : "var(--text-secondary)",
                      cursor: enabled ? "pointer" : "not-allowed",
                    }}
                  >
                    <span className="text-xs font-medium">{label}</span>
                    <span className="text-[10px]" style={{ color: "var(--text-faint)" }}>{desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="text-xs font-mono uppercase tracking-wider mb-2" style={{ color: "var(--text-faint)" }}>
            Signals
          </div>
          <div className="rounded-lg overflow-hidden" style={{ border: "1px solid var(--border-dim)" }}>
            {CURATOR_OPTIONS.map((opt, idx) => {
              const enabled = curatorSettings[opt.id];
              const isLast = idx === CURATOR_OPTIONS.length - 1;
              return (
                <div
                  key={opt.id}
                  className="flex items-start gap-3 px-3 py-3"
                  style={{
                    borderBottom: isLast ? "none" : "1px solid var(--border-dim)",
                    background: enabled && opt.shipped ? "var(--surface)" : "transparent",
                    opacity: opt.shipped ? 1 : 0.6,
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{opt.label}</span>
                      {!opt.shipped && (
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded font-mono uppercase tracking-wider"
                          style={{ background: "var(--toggle-bg)", color: "var(--text-faint)", letterSpacing: 1 }}
                        >
                          Coming soon
                        </span>
                      )}
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>{opt.description}</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1" style={{ cursor: opt.shipped ? "pointer" : "not-allowed" }}>
                    <input
                      type="checkbox"
                      checked={enabled}
                      onChange={(e) => opt.shipped && toggleCurator(opt.id, e.target.checked)}
                      disabled={!opt.shipped}
                      className="sr-only peer"
                    />
                    <div
                      className="w-9 h-5 rounded-full transition-colors"
                      style={{
                        background: enabled && opt.shipped ? "var(--accent)" : "var(--border-dim)",
                      }}
                    >
                      <div
                        className="w-4 h-4 rounded-full transition-transform"
                        style={{
                          background: "#fff",
                          transform: `translate(${enabled && opt.shipped ? 18 : 2}px, 2px)`,
                          boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
                        }}
                      />
                    </div>
                  </label>
                </div>
              );
            })}
          </div>
          <p className="text-xs mt-3" style={{ color: "var(--text-faint)" }}>
            Stored locally for now. Per-account sync arrives in a later release.
          </p>
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
