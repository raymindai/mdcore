"use client";

import dynamic from "next/dynamic";
import MdfyLogo from "@/components/MdfyLogo";
import WelcomeOverlay from "@/components/WelcomeOverlay";

const MdEditor = dynamic(() => import("@/components/MdEditor"), {
  ssr: false,
  loading: () => (
    <div
      className="flex flex-col items-center justify-center h-screen gap-6"
      style={{ background: "var(--background)" }}
    >
      {/* Logo */}
      <MdfyLogo size={30} />

      {/* Tagline */}
      <p className="text-xs tracking-wide" style={{ color: "var(--text-faint)" }}>
        Your Markdown, Beautifully Published.
      </p>

      {/* Animated bar */}
      <div
        className="w-32 h-0.5 rounded-full overflow-hidden"
        style={{ background: "var(--border-dim)" }}
      >
        <div
          className="h-full rounded-full"
          style={{
            background: "var(--accent)",
            animation: "loadbar 1.2s ease-in-out infinite",
          }}
        />
      </div>

      {/* CSS animation */}
      <style>{`
        @keyframes loadbar {
          0% { width: 0%; margin-left: 0%; }
          50% { width: 60%; margin-left: 20%; }
          100% { width: 0%; margin-left: 100%; }
        }
      `}</style>
    </div>
  ),
});

export default function Home() {
  return (
    <>
      <WelcomeOverlay />
      <MdEditor />
    </>
  );
}
