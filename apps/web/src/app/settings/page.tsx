"use client";

// Thin route wrapper. The settings UI lives in SettingsEmbed so it
// can also be rendered as an in-app overlay (from MdEditor's profile
// menu, without leaving the editor). The route stays for deep links,
// browser back, and for sign-in flows that redirect here.

import SettingsEmbed from "@/components/SettingsEmbed";

export default function SettingsPage() {
  return (
    <div className="min-h-screen" style={{ background: "var(--background)", color: "var(--text-primary)" }}>
      <SettingsEmbed />
    </div>
  );
}
