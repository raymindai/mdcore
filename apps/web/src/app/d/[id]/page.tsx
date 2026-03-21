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
    .select("id, markdown, title, created_at")
    .eq("id", id)
    .single();

  return data;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const doc = await getDocument(id);
  if (!doc) return {};

  const title = doc.title || "Shared Document";
  const description = doc.markdown
    .slice(0, 200)
    .replace(/[#*_`\n]/g, " ")
    .trim();

  const ogImageUrl = `https://mdfy.cc/api/og?title=${encodeURIComponent(title)}&preview=${encodeURIComponent(description)}`;

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

  return (
    <DocumentViewer
      id={doc.id}
      markdown={doc.markdown}
      title={doc.title}
    />
  );
}
