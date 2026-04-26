import { NextRequest } from "next/server";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import { getSupabaseClient } from "@/lib/supabase";
import { nanoid } from "nanoid";

// ─── API Helper ───

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://mdfy.cc";

function createMcpServer(userId?: string, userEmail?: string) {
  const server = new McpServer({
    name: "mdfy",
    version: "1.3.0",
  });

  const supabase = getSupabaseClient();

  // Tool: Create document
  server.tool(
    "mdfy_create",
    "Create a new Markdown document on mdfy.cc and get a shareable URL",
    {
      markdown: z.string().describe("Markdown content for the document"),
      title: z.string().optional().describe("Document title"),
      draft: z.boolean().optional().describe("If true, private. If false, publicly accessible. Default: true"),
    },
    async ({ markdown, title, draft }) => {
      if (!supabase) return errorResult("Storage not configured");
      const isDraft = draft ?? true;
      const id = nanoid(8);
      const editToken = nanoid(32);

      const { error } = await supabase.from("documents").insert({
        id,
        markdown,
        title: title || null,
        edit_token: editToken,
        user_id: userId || null,
        edit_mode: userId ? "account" : "token",
        is_draft: isDraft,
        source: "mcp",
      });

      if (error) return errorResult(`Failed to create: ${error.message}`);

      const url = `${BASE_URL}/d/${id}`;
      return {
        content: [{
          type: "text" as const,
          text: `Document created:\n- URL: ${url}\n- ID: ${id}\n- Status: ${isDraft ? "private draft" : "publicly accessible"}`,
        }],
      };
    }
  );

  // Tool: Read document
  server.tool(
    "mdfy_read",
    "Fetch a document's markdown content from mdfy.cc",
    {
      id: z.string().describe("Document ID (the short code from the URL)"),
    },
    async ({ id }) => {
      if (!supabase) return errorResult("Storage not configured");
      const { data, error } = await supabase
        .from("documents")
        .select("markdown, title, updated_at, is_draft")
        .eq("id", id)
        .single();

      if (error || !data) return errorResult("Document not found");
      return {
        content: [{
          type: "text" as const,
          text: `# ${data.title || "Untitled"}\n\n${data.markdown}`,
        }],
      };
    }
  );

  // Tool: Update document
  server.tool(
    "mdfy_update",
    "Update an existing document's content on mdfy.cc",
    {
      id: z.string().describe("Document ID"),
      markdown: z.string().describe("New markdown content"),
      title: z.string().optional().describe("New title"),
    },
    async ({ id, markdown, title }) => {
      if (!supabase) return errorResult("Storage not configured");
      const update: Record<string, unknown> = { markdown, updated_at: new Date().toISOString() };
      if (title) update.title = title;

      const { error } = await supabase
        .from("documents")
        .update(update)
        .eq("id", id);

      if (error) return errorResult(`Failed to update: ${error.message}`);
      return { content: [{ type: "text" as const, text: `Document ${id} updated successfully.` }] };
    }
  );

  // Tool: List documents
  server.tool(
    "mdfy_list",
    "List documents owned by the current user on mdfy.cc",
    {},
    async () => {
      if (!userId) return errorResult("Not authenticated. Connect your mdfy.cc account first.");
      if (!supabase) return errorResult("Storage not configured");

      const { data, error } = await supabase
        .from("documents")
        .select("id, title, updated_at, is_draft, view_count")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false })
        .limit(50);

      if (error) return errorResult(`Failed to list: ${error.message}`);
      const docs = data || [];
      if (docs.length === 0) return { content: [{ type: "text" as const, text: "No documents found." }] };

      const lines = docs.map((d, i) =>
        `${i + 1}. ${d.title || "Untitled"} (${d.id}) — ${d.is_draft ? "private" : "shared"} — ${d.view_count} views`
      );
      return { content: [{ type: "text" as const, text: `Found ${docs.length} documents:\n\n${lines.join("\n")}` }] };
    }
  );

  // Tool: Search documents
  server.tool(
    "mdfy_search",
    "Search your documents on mdfy.cc by keyword",
    {
      query: z.string().describe("Search query"),
    },
    async ({ query }) => {
      if (!userId) return errorResult("Not authenticated.");
      if (!supabase) return errorResult("Storage not configured");

      const { data, error } = await supabase
        .from("documents")
        .select("id, title, markdown, is_draft, view_count, updated_at")
        .eq("user_id", userId)
        .or(`title.ilike.%${query}%,markdown.ilike.%${query}%`)
        .order("updated_at", { ascending: false })
        .limit(20);

      if (error) return errorResult(`Search failed: ${error.message}`);
      const results = data || [];
      if (results.length === 0) return { content: [{ type: "text" as const, text: `No documents matching "${query}".` }] };

      const lines = results.map((r, i) => {
        const snippet = r.markdown.slice(0, 100).replace(/\n/g, " ");
        return `${i + 1}. **${r.title || "Untitled"}** (${r.id})\n   ${snippet}...`;
      });
      return { content: [{ type: "text" as const, text: `Found ${results.length} result(s):\n\n${lines.join("\n\n")}` }] };
    }
  );

  // Tool: Delete document
  server.tool(
    "mdfy_delete",
    "Delete a document from mdfy.cc",
    {
      id: z.string().describe("Document ID to delete"),
    },
    async ({ id }) => {
      if (!supabase) return errorResult("Storage not configured");
      const { error } = await supabase.from("documents").delete().eq("id", id);
      if (error) return errorResult(`Failed to delete: ${error.message}`);
      return { content: [{ type: "text" as const, text: `Document ${id} deleted.` }] };
    }
  );

  return server;
}

function errorResult(msg: string) {
  return { content: [{ type: "text" as const, text: `Error: ${msg}` }], isError: true as const };
}

// ─── HTTP Handler ───

export async function POST(req: NextRequest) {
  try {
    // Extract user context from headers (optional auth)
    const userId = req.headers.get("x-user-id") || undefined;
    const userEmail = req.headers.get("x-user-email") || undefined;

    const server = createMcpServer(userId, userEmail);
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: () => nanoid(16) });
    await server.connect(transport);

    const body = await req.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await (transport as any).handleRequest(body, req);

    return new Response(JSON.stringify(response), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, x-user-id, x-user-email",
      },
    });
  } catch (err) {
    console.error("[MCP] Error:", err);
    return new Response(JSON.stringify({ error: "MCP server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function OPTIONS() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, x-user-id, x-user-email",
    },
  });
}
