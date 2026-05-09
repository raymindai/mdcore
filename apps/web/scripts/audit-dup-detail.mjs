import { createClient } from "@supabase/supabase-js";

const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const email = "hi@raymind.ai";
const { data: usersList } = await s.auth.admin.listUsers();
const user = usersList?.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase());
const userId = user.id;

const { data: docs } = await s
  .from("documents")
  .select("id, title, markdown, created_at, is_draft")
  .eq("user_id", userId)
  .is("deleted_at", null)
  .order("created_at", { ascending: true });

// Group by title
const byTitle = new Map();
for (const d of docs) {
  const key = (d.title || "(untitled)").trim();
  if (!byTitle.has(key)) byTitle.set(key, []);
  byTitle.get(key).push(d);
}

const titleDups = [...byTitle.entries()].filter(([_, arr]) => arr.length > 1);
for (const [title, arr] of titleDups) {
  console.log(`\n=== "${title}" (${arr.length} rows) ===`);
  for (const d of arr) {
    const preview = (d.markdown || "").slice(0, 80).replace(/\n/g, " ").trim();
    const len = (d.markdown || "").length;
    console.log(`  ${d.id}  ${d.created_at.slice(0, 19)}  ${d.is_draft ? "[draft]" : "[pub]"}  ${len}b  "${preview}${len > 80 ? "..." : ""}"`);
  }
  // Are all markdowns identical?
  const mds = new Set(arr.map((d) => d.markdown || ""));
  console.log(`  → distinct markdowns: ${mds.size}`);
}
