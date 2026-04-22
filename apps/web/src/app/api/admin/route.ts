import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";
import { verifyAuthToken } from "@/lib/verify-auth";

const ADMIN_EMAIL = "hi@raymind.ai";

export async function GET(req: NextRequest) {
  // Verify admin access
  const verified = await verifyAuthToken(req.headers.get("authorization"));
  const email = verified?.email || req.headers.get("x-user-email");
  if (!email || email.toLowerCase() !== ADMIN_EMAIL) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "Storage not configured" }, { status: 503 });
  }

  try {
    // Stats
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const [
      { count: totalDocs },
      { count: docsToday },
      { count: docsThisWeek },
      { data: viewData },
      { data: allDocs },
    ] = await Promise.all([
      supabase.from("documents").select("id", { count: "exact", head: true }).is("deleted_at", null),
      supabase.from("documents").select("id", { count: "exact", head: true }).is("deleted_at", null).gte("created_at", todayStart),
      supabase.from("documents").select("id", { count: "exact", head: true }).is("deleted_at", null).gte("created_at", weekStart),
      supabase.from("documents").select("view_count").is("deleted_at", null),
      supabase.from("documents").select("id, title, user_id, is_draft, view_count, source, created_at, updated_at, deleted_at").is("deleted_at", null).order("updated_at", { ascending: false }).limit(100),
    ]);

    const totalViews = (viewData || []).reduce((sum, d) => sum + (d.view_count || 0), 0);

    // Users from Supabase Auth
    const { data: authData } = await supabase.auth.admin.listUsers({ perPage: 500 });
    const authUsers = authData?.users || [];

    // Count docs per user
    const userDocCounts: Record<string, number> = {};
    for (const doc of allDocs || []) {
      if (doc.user_id) {
        userDocCounts[doc.user_id] = (userDocCounts[doc.user_id] || 0) + 1;
      }
    }

    // Active users (signed in within 7 days)
    const activeUsers7d = authUsers.filter(u =>
      u.last_sign_in_at && new Date(u.last_sign_in_at) > new Date(weekStart)
    ).length;

    // Storage: estimate from document sizes
    const storageMB = (allDocs || []).reduce((sum, d) => sum + ((d.title?.length || 0) + 500) / 1024 / 1024, 0);

    // Users list
    const users = authUsers.map(u => ({
      id: u.id,
      email: u.email || "unknown",
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at,
      docCount: userDocCounts[u.id] || 0,
    })).sort((a, b) => b.docCount - a.docCount);

    // Documents list with owner email
    const userEmailMap: Record<string, string> = {};
    for (const u of authUsers) {
      if (u.email) userEmailMap[u.id] = u.email;
    }

    const documents = (allDocs || []).map(d => ({
      id: d.id,
      title: d.title || "Untitled",
      user_email: d.user_id ? (userEmailMap[d.user_id] || null) : null,
      is_draft: d.is_draft,
      view_count: d.view_count || 0,
      source: d.source,
      created_at: d.created_at,
      updated_at: d.updated_at,
    }));

    // Recent activity (last 50 documents by updated_at)
    const recent = (allDocs || []).slice(0, 50).map(d => ({
      type: d.source || "web",
      title: d.title || "Untitled",
      email: d.user_id ? (userEmailMap[d.user_id] || null) : null,
      time: d.updated_at,
    }));

    return NextResponse.json({
      stats: {
        totalDocs: totalDocs || 0,
        totalUsers: authUsers.length,
        totalViews,
        docsToday: docsToday || 0,
        docsThisWeek: docsThisWeek || 0,
        activeUsers7d,
        storageUsedMB: storageMB,
      },
      users,
      documents,
      recent,
    });
  } catch (err) {
    console.error("Admin API error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
