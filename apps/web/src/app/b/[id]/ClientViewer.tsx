"use client";

import dynamic from "next/dynamic";

const BundleViewer = dynamic(() => import("./BundleViewer"), { ssr: false });

export default function ClientViewer(props: {
  id: string;
  title: string | null;
  description?: string | null;
  isProtected?: boolean;
  isDraft?: boolean;
  documentCount: number;
  showBadge?: boolean;
  layout?: string;
}) {
  return <BundleViewer {...props} />;
}
