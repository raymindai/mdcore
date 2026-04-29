"use client";

import dynamic from "next/dynamic";

const DocumentViewer = dynamic(() => import("./DocumentViewer"), { ssr: false });

export default function ClientViewer(props: {
  id: string;
  markdown: string;
  title: string | null;
  isProtected?: boolean;
  isExpired?: boolean;
  isRestricted?: boolean;
  showBadge?: boolean;
  editMode?: string;
}) {
  return <DocumentViewer {...props} />;
}
