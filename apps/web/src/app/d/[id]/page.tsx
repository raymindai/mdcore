import { Metadata } from "next";
import { getSupabaseClient } from "@/lib/supabase";
import { notFound } from "next/navigation";
import DocumentViewer from "./DocumentViewer";

type Props = { params: Promise<{ id: string }> };

async function getDocument(id: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const { data } = await supabase
    .from("documents")
    .select("id, markdown, title, created_at, password_hash, expires_at, user_id, is_draft, edit_mode, allowed_emails")
    .eq("id", id)
    .single();

  if (!data) return null;

  // Check if document owner is a Pro user (hide badge) and get display name
  let ownerPlan = "free";
  let ownerName: string | null = null;
  if (data.user_id) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("plan, display_name")
      .eq("id", data.user_id)
      .single();
    if (profile?.plan) ownerPlan = profile.plan;
    if (profile?.display_name) ownerName = profile.display_name;
  }

  // Draft documents: don't expose content in SSR, let client-side handle with auth
  if (data.is_draft) {
    return { ...data, markdown: "", isDraft: true, ownerPlan, ownerName };
  }

  return { ...data, ownerPlan, ownerName };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const doc = await getDocument(id);
  if (!doc) return { robots: { index: false, follow: false } };

  // Don't reveal content in OG if password-protected
  const isProtected = !!doc.password_hash;
  const isExpired = doc.expires_at && new Date(doc.expires_at) < new Date();
  const isRestricted = (doc.allowed_emails || []).length > 0;

  if (isExpired) {
    return { title: "Expired — mdfy.cc", robots: { index: false, follow: false } };
  }

  // Don't index private content
  const noIndex = isProtected || isRestricted;

  const title = isProtected ? "Protected Document" : (doc.title || "Shared Document");
  const description = isProtected
    ? "This document is password protected."
    : doc.markdown.slice(0, 200).replace(/[#*_`\n]/g, " ").trim();

  // Detect which features the doc actually uses, for dynamic OG pills.
  const md = isProtected ? "" : doc.markdown;
  const features: string[] = [];
  if (/```mermaid/.test(md)) features.push("Mermaid");
  if (/\$\$[\s\S]+?\$\$|(?:^|\s)\$[^$\n]+\$/.test(md)) features.push("KaTeX");
  if (/```[a-zA-Z]/.test(md)) features.push("Code");
  if (/^\|.*\|/m.test(md)) features.push("Tables");
  if (/!\[.*?\]\(/.test(md)) features.push("Images");
  if (features.length === 0) features.push("GFM");

  // Author attribution (only when not protected and we have a display name)
  const authorParam = !isProtected && doc.ownerName ? `&author=${encodeURIComponent(doc.ownerName)}` : "";
  const ogImageUrl = `https://mdfy.cc/api/og?title=${encodeURIComponent(title)}&features=${encodeURIComponent(features.slice(0, 5).join(","))}${authorParam}`;

  return {
    title: `${title} — mdfy.cc`,
    description,
    robots: noIndex ? { index: false, follow: false } : { index: true, follow: true },
    openGraph: {
      title: `${title} — mdfy.cc`,
      description,
      url: `https://mdfy.cc/d/${id}`,
      siteName: "mdfy.cc",
      type: "article",
      images: [{ url: ogImageUrl, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} — mdfy.cc`,
      description,
      images: [ogImageUrl],
    },
  };
}

export default async function DocPage({ params }: Props) {
  const { id } = await params;
  const doc = await getDocument(id);
  if (!doc) notFound();

  const isExpired = doc.expires_at && new Date(doc.expires_at) < new Date();
  const isProtected = !!doc.password_hash;
  const isRestricted = (doc.allowed_emails || []).length > 0;
  const isDraft = !!(doc as { isDraft?: boolean }).isDraft;

  return (
    <DocumentViewer
      id={doc.id}
      markdown={isExpired ? "" : (isProtected ? "" : (isRestricted || isDraft ? "" : doc.markdown))}
      title={isExpired ? "Expired" : (isProtected ? "Protected Document" : doc.title)}
      isProtected={isProtected}
      isExpired={!!isExpired}
      isRestricted={isRestricted || isDraft}
      showBadge={doc.ownerPlan !== "pro"}
      editMode={doc.edit_mode || "token"}
    />
  );
}
