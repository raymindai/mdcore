"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

const ADMIN_EMAIL = "hi@raymind.ai";

interface Stats {
  totalDocs: number;
  totalUsers: number;
  totalViews: number;
  docsToday: number;
  docsThisWeek: number;
  activeUsers7d: number;
  storageUsedMB: number;
}

interface UserRow {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  docCount: number;
}

interface DocRow {
  id: string;
  title: string;
  user_email: string | null;
  is_draft: boolean;
  view_count: number;
  source: string | null;
  created_at: string;
  updated_at: string;
}

interface RecentActivity {
  type: string;
  title: string;
  email: string | null;
  time: string;
}

export default function AdminPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [email, setEmail] = useState("");
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [recent, setRecent] = useState<RecentActivity[]>([]);
  const [tab, setTab] = useState<"overview" | "users" | "documents" | "activity">("overview");
  const [loading, setLoading] = useState(true);

  // Auth check
  useEffect(() => {
    const sb = getSupabaseBrowserClient();
    if (!sb) { setAuthed(false); return; }

    sb.auth.getSession().then(({ data }) => {
      const userEmail = data.session?.user?.email?.toLowerCase();
      if (userEmail === ADMIN_EMAIL) {
        setAuthed(true);
        setEmail(userEmail);
      } else {
        setAuthed(false);
      }
    });
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const sb = getSupabaseBrowserClient();
      const { data: sessionData } = await sb!.auth.getSession();
      const token = sessionData.session?.access_token;

      const res = await fetch("/api/admin", {
        headers: {
          ...(token ? { "Authorization": `Bearer ${token}` } : {}),
          "x-user-email": email,
        },
      });
      if (!res.ok) throw new Error("Unauthorized");
      const data = await res.json();
      setStats(data.stats);
      setUsers(data.users || []);
      setDocs(data.documents || []);
      setRecent(data.recent || []);
    } catch {
      setAuthed(false);
    }
    setLoading(false);
  }, [email]);

  useEffect(() => {
    if (authed && email) fetchData();
  }, [authed, email, fetchData]);

  if (authed === null) return <div style={page}><p style={{ color: "#71717a" }}>Checking access...</p></div>;
  if (authed === false) return (
    <div style={page}>
      <h1 style={{ color: "#ef4444", fontSize: 18, fontWeight: 700 }}>Access Denied</h1>
      <p style={{ color: "#71717a", marginTop: 8 }}>Admin access is restricted.</p>
    </div>
  );

  return (
    <div style={page}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "#fafafa", margin: 0 }}>
            <span style={{ color: "#fb923c" }}>mdfy</span> Admin
          </h1>
          <p style={{ fontSize: 12, color: "#52525b", marginTop: 4 }}>{email}</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={fetchData} style={btnStyle}>Refresh</button>
          <Link href="/" style={{ ...btnStyle, textDecoration: "none" }}>Back to Editor</Link>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 2, marginBottom: 24, borderBottom: "1px solid #27272a" }}>
        {(["overview", "users", "documents", "activity"] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: "8px 16px",
              fontSize: 13,
              fontWeight: 600,
              color: tab === t ? "#fb923c" : "#71717a",
              background: "none",
              border: "none",
              borderBottom: tab === t ? "2px solid #fb923c" : "2px solid transparent",
              cursor: "pointer",
              textTransform: "capitalize",
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {loading ? <p style={{ color: "#71717a" }}>Loading...</p> : (
        <>
          {/* Overview */}
          {tab === "overview" && stats && (
            <div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12, marginBottom: 32 }}>
                {[
                  { label: "Total Documents", value: stats.totalDocs },
                  { label: "Total Users", value: stats.totalUsers },
                  { label: "Total Views", value: stats.totalViews.toLocaleString() },
                  { label: "Docs Today", value: stats.docsToday },
                  { label: "Docs This Week", value: stats.docsThisWeek },
                  { label: "Active Users (7d)", value: stats.activeUsers7d },
                  { label: "Storage Used", value: stats.storageUsedMB.toFixed(1) + " MB" },
                ].map(s => (
                  <div key={s.label} style={cardStyle}>
                    <p style={{ fontSize: 11, color: "#71717a", margin: "0 0 4px", textTransform: "uppercase", letterSpacing: 1 }}>{s.label}</p>
                    <p style={{ fontSize: 24, fontWeight: 800, color: "#fafafa", margin: 0 }}>{s.value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Users */}
          {tab === "users" && (
            <div style={{ overflowX: "auto" }}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>Email</th>
                    <th style={thStyle}>Docs</th>
                    <th style={thStyle}>Joined</th>
                    <th style={thStyle}>Last Sign In</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id}>
                      <td style={tdStyle}>{u.email}</td>
                      <td style={tdStyle}>{u.docCount}</td>
                      <td style={tdStyle}>{new Date(u.created_at).toLocaleDateString()}</td>
                      <td style={tdStyle}>{u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleDateString() : "Never"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p style={{ fontSize: 11, color: "#52525b", marginTop: 8 }}>{users.length} users</p>
            </div>
          )}

          {/* Documents */}
          {tab === "documents" && (
            <div style={{ overflowX: "auto" }}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>Title</th>
                    <th style={thStyle}>Owner</th>
                    <th style={thStyle}>Status</th>
                    <th style={thStyle}>Views</th>
                    <th style={thStyle}>Source</th>
                    <th style={thStyle}>Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {docs.map(d => (
                    <tr key={d.id}>
                      <td style={tdStyle}>
                        <a href={`/d/${d.id}`} target="_blank" style={{ color: "#fb923c", textDecoration: "none" }}>
                          {d.title || "Untitled"}
                        </a>
                      </td>
                      <td style={tdStyle}>{d.user_email || "anonymous"}</td>
                      <td style={tdStyle}>
                        <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, background: d.is_draft ? "rgba(251,146,60,0.1)" : "rgba(74,222,128,0.1)", color: d.is_draft ? "#fb923c" : "#4ade80" }}>
                          {d.is_draft ? "Private" : "Shared"}
                        </span>
                      </td>
                      <td style={tdStyle}>{d.view_count}</td>
                      <td style={tdStyle}>{d.source || "-"}</td>
                      <td style={tdStyle}>{new Date(d.updated_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p style={{ fontSize: 11, color: "#52525b", marginTop: 8 }}>{docs.length} documents</p>
            </div>
          )}

          {/* Activity */}
          {tab === "activity" && (
            <div>
              {recent.map((r, i) => (
                <div key={i} style={{ padding: "10px 0", borderBottom: "1px solid #1c1c24", display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 4, background: "#1c1c24", color: "#71717a", fontFamily: "monospace", flexShrink: 0 }}>{r.type}</span>
                  <span style={{ fontSize: 13, color: "#e4e4e7", flex: 1 }}>{r.title}</span>
                  <span style={{ fontSize: 11, color: "#52525b", flexShrink: 0 }}>{r.email || "anon"}</span>
                  <span style={{ fontSize: 11, color: "#3f3f46", flexShrink: 0 }}>{new Date(r.time).toLocaleString()}</span>
                </div>
              ))}
              {recent.length === 0 && <p style={{ color: "#52525b" }}>No recent activity</p>}
            </div>
          )}
        </>
      )}
    </div>
  );
}

const page: React.CSSProperties = {
  background: "#09090b",
  color: "#fafafa",
  minHeight: "100vh",
  padding: "40px 32px",
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  maxWidth: 1100,
  margin: "0 auto",
};

const btnStyle: React.CSSProperties = {
  padding: "6px 14px",
  borderRadius: 6,
  fontSize: 12,
  fontWeight: 600,
  background: "#1c1c24",
  color: "#a1a1aa",
  border: "1px solid #27272a",
  cursor: "pointer",
};

const cardStyle: React.CSSProperties = {
  background: "#1c1c24",
  border: "1px solid #27272a",
  borderRadius: 10,
  padding: "16px 20px",
};

const tableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: 13,
};

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "8px 12px",
  fontSize: 11,
  color: "#52525b",
  borderBottom: "1px solid #27272a",
  textTransform: "uppercase",
  letterSpacing: 1,
  fontWeight: 600,
};

const tdStyle: React.CSSProperties = {
  padding: "8px 12px",
  borderBottom: "1px solid #1c1c24",
  color: "#a1a1aa",
};
