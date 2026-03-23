"use client";

import dynamic from "next/dynamic";

const MermaidDemo = dynamic(() => import("./MermaidDemo"), { ssr: false });

export default function MermaidWrapper() {
  return <MermaidDemo />;
}
