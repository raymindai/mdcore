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
    .select("id, markdown, title, created_at, password_hash, expires_at")
    .eq("id", id)
    .single();

  return data;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const doc = await getDocument(id);
  if (!doc) return {};

  // Don't reveal content in OG if password-protected
  const isProtected = !!doc.password_hash;
  const isExpired = doc.expires_at && new Date(doc.expires_at) < new Date();

  if (isExpired) {
    return { title: "Expired — mdfy.cc" };
  }

  const title = isProtected ? "Protected Document" : (doc.title || "Shared Document");
  const description = isProtected
    ? "This document is password protected."
    : doc.markdown.slice(0, 200).replace(/[#*_`\n]/g, " ").trim();

  const ogImageUrl = `https://mdfy.cc/api/og?title=${encodeURIComponent(title)}`;

  return {
    title: `${title} — mdfy.cc`,
    description,
    openGraph: {
      title: `${title} — mdfy.cc`,
      description,
      url: `https://mdfy.cc/${id}`,
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

  return (
    <DocumentViewer
      id={doc.id}
      markdown={isExpired ? "" : (isProtected ? "" : doc.markdown)}
      title={isExpired ? "Expired" : (isProtected ? "Protected Document" : doc.title)}
      isProtected={isProtected}
      isExpired={!!isExpired}
    />
  );
}
