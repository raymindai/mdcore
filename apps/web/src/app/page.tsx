"use client";

import dynamic from "next/dynamic";

const MdEditor = dynamic(() => import("@/components/MdEditor"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-screen bg-zinc-950 text-zinc-600">
      Initializing mdcore engine...
    </div>
  ),
});

export default function Home() {
  return <MdEditor />;
}
