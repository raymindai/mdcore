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
    // Build query — try full-text search first, fallback to ILIKE for CJK content
    const baseSelect = "id, title, markdown, created_at, updated_at, is_draft, view_count, source";
    const ownerFilter = userId ? { user_id: userId } : anonymousId ? { anonymous_id: anonymousId } : null;

    // Try FTS first (works well for English/Latin)
    let ftsQuery = supabase
      .from("documents")
      .select(baseSelect)
      .is("deleted_at", null)
      .textSearch("fts", q, { type: "websearch" })
      .order("updated_at", { ascending: false })
      .limit(20);
    if (ownerFilter) {
      const [key, val] = Object.entries(ownerFilter)[0];
      ftsQuery = ftsQuery.eq(key, val);
    }

    let { data, error } = await ftsQuery;

    // Fallback: ILIKE for CJK and non-Latin content (when FTS returns nothing)
    if (!error && (!data || data.length === 0)) {
      const likePattern = `%${q}%`;
      let fallbackQuery = supabase
        .from("documents")
        .select(baseSelect)
        .is("deleted_at", null)
        .or(`title.ilike.${likePattern},markdown.ilike.${likePattern}`)
        .order("updated_at", { ascending: false })
        .limit(20);
      if (ownerFilter) {
        const [key, val] = Object.entries(ownerFilter)[0];
        fallbackQuery = fallbackQuery.eq(key, val);
      }
      const fallback = await fallbackQuery;
      if (!fallback.error) {
        data = fallback.data;
        error = fallback.error;
      }
    }

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
