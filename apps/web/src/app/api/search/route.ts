import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";
import { verifyAuthToken } from "@/lib/verify-auth";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const verified = await verifyAuthToken(req.headers.get("authorization"));
  const userId = verified?.userId || req.headers.get("x-user-id");
  const anonymousId = req.headers.get("x-anonymous-id");

  if (!userId && !anonymousId) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "Storage not configured" }, { status: 503 });
  }

  try {
    // Build query — search user's own documents using PostgreSQL full-text search
    let query = supabase
      .from("documents")
      .select("id, title, markdown, created_at, updated_at, is_draft, view_count, source")
      .is("deleted_at", null)
      .textSearch("fts", q, { type: "websearch" })
      .order("updated_at", { ascending: false })
      .limit(20);

    if (userId) {
      query = query.eq("user_id", userId);
    } else if (anonymousId) {
      query = query.eq("anonymous_id", anonymousId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Search error:", error);
      return NextResponse.json({ error: "Search failed" }, { status: 500 });
    }

    // Generate snippets — find query terms in markdown and extract context
    const terms = q.toLowerCase().split(/\s+/).filter(t => t.length > 1);
    const results = (data || []).map(doc => {
      const md = doc.markdown || "";
      let snippet = "";

      // Find first occurrence of any search term and extract surrounding context
      for (const term of terms) {
        const idx = md.toLowerCase().indexOf(term);
        if (idx !== -1) {
          const start = Math.max(0, idx - 40);
          const end = Math.min(md.length, idx + term.length + 80);
          snippet = (start > 0 ? "..." : "") + md.slice(start, end).replace(/\n/g, " ") + (end < md.length ? "..." : "");
          break;
        }
      }

      // Fallback: first 120 chars
      if (!snippet) {
        snippet = md.slice(0, 120).replace(/\n/g, " ") + (md.length > 120 ? "..." : "");
      }

      return {
        id: doc.id,
        title: doc.title || "Untitled",
        snippet,
        isDraft: doc.is_draft,
        viewCount: doc.view_count || 0,
        source: doc.source,
        updatedAt: doc.updated_at,
        createdAt: doc.created_at,
      };
    });

    return NextResponse.json({ results, query: q });
  } catch (err) {
    console.error("Search error:", err);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
