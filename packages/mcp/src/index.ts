import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import { homedir } from "os";

// ─── Config ───

const BASE_URL = (process.env.MDFY_BASE_URL || "https://mdfy.cc").replace(/\/$/, "");
const MDFY_DIR = join(homedir(), ".mdfy");
const CONFIG_FILE = join(MDFY_DIR, "config.json");
const TOKEN_FILE = join(MDFY_DIR, "tokens.json");

// ─── Auth (JWT from `mdfy login`) ───

interface MdfyConfig {
  token?: string;
  userId?: string;
  email?: string;
}

function loadConfig(): MdfyConfig {
  try {
    if (existsSync(CONFIG_FILE)) {
      return JSON.parse(readFileSync(CONFIG_FILE, "utf-8"));
    }
  } catch { /* ignore */ }
  return {};
}

function getAuthHeaders(): Record<string, string> {
  const config = loadConfig();
  const headers: Record<string, string> = {};
  if (config.token) headers["Authorization"] = `Bearer ${config.token}`;
  if (config.userId) headers["x-user-id"] = config.userId;
  return headers;
}

function isLoggedIn(): boolean {
  const config = loadConfig();
  return !!(config.token);
}

function getUserEmail(): string {
  return loadConfig().email || "";
}

// ─── Edit Token Store ───

function loadTokens(): Record<string, string> {
  try {
    if (existsSync(TOKEN_FILE)) {
      return JSON.parse(readFileSync(TOKEN_FILE, "utf-8"));
    }
  } catch { /* ignore */ }
  return {};
}

function saveToken(docId: string, editToken: string): void {
  if (!existsSync(MDFY_DIR)) mkdirSync(MDFY_DIR, { recursive: true });
  const tokens = loadTokens();
  tokens[docId] = editToken;
  writeFileSync(TOKEN_FILE, JSON.stringify(tokens, null, 2), { mode: 0o600 });
}

function getToken(docId: string): string | undefined {
  return loadTokens()[docId];
}

// ─── API Helper ───

async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...getAuthHeaders(),
    ...(options.headers as Record<string, string> || {}),
  };

  const res = await fetch(url, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// Error wrapper for tool handlers
function errorResult(err: unknown) {
  const msg = err instanceof Error ? err.message : String(err);
  return { content: [{ type: "text" as const, text: `Error: ${msg}` }], isError: true as const };
}

function loginRequiredResult() {
  return {
    content: [{
      type: "text" as const,
      text: "Not logged in. Run `mdfy login` in your terminal first to authenticate with mdfy.cc.",
    }],
    isError: true as const,
  };
}

// ─── MCP Server ───

const server = new McpServer({
  name: "mdfy",
  version: "0.3.0",
});

// Tool: Create document
server.tool(
  "mdfy_create",
  "Create a new Markdown document on mdfy.cc and get a shareable URL",
  {
    markdown: z.string().describe("Markdown content for the document"),
    title: z.string().optional().describe("Document title (extracted from H1 if omitted)"),
    draft: z.boolean().optional().describe("If true, document is private (default: false = publicly accessible)"),
  },
  async ({ markdown, title, draft }) => {
    try {
      const result = await api<{ id: string; editToken: string }>("/api/docs", {
        method: "POST",
        body: JSON.stringify({
          markdown,
          title,
          isDraft: draft ?? false,
          source: "mcp",
        }),
      });

      saveToken(result.id, result.editToken);
      const url = `${BASE_URL}/d/${result.id}`;

      return {
        content: [{
          type: "text" as const,
          text: `Document created:\n- URL: ${url}\n- ID: ${result.id}\n- Status: ${draft ? "private draft" : "publicly accessible"}`,
        }],
      };
    } catch (err) { return errorResult(err); }
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
    try {
      const doc = await api<{ markdown: string; title: string | null; updated_at: string; is_draft: boolean }>(
        `/api/docs/${id}`
      );
      return {
        content: [{
          type: "text" as const,
          text: `# ${doc.title || "Untitled"}\n\n${doc.markdown}`,
        }],
      };
    } catch (err) { return errorResult(err); }
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
    try {
      const editToken = getToken(id) || "";
      await api(`/api/docs/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          markdown, title, editToken,
          action: "auto-save",
        }),
      });
      return { content: [{ type: "text" as const, text: `Document ${id} updated successfully.` }] };
    } catch (err) { return errorResult(err); }
  }
);

// Tool: List documents
server.tool(
  "mdfy_list",
  "List all documents owned by the current user on mdfy.cc",
  {},
  async () => {
    if (!isLoggedIn()) return loginRequiredResult();
    try {
      const data = await api<{ documents: Array<{ id: string; title: string | null; updated_at: string; is_draft: boolean; view_count: number }> }>(
        "/api/user/documents"
      );
      const docs = data.documents || [];
      if (docs.length === 0) {
        return { content: [{ type: "text" as const, text: "No documents found." }] };
      }
      const lines = docs.map((d, i) =>
        `${i + 1}. ${d.title || "Untitled"} (${d.id}) — ${d.is_draft ? "private" : "shared"} — ${d.view_count} views — ${d.updated_at}`
      );
      return { content: [{ type: "text" as const, text: `Found ${docs.length} documents:\n\n${lines.join("\n")}` }] };
    } catch (err) { return errorResult(err); }
  }
);

// Tool: Delete document
server.tool(
  "mdfy_delete",
  "Delete a document from mdfy.cc (moves to trash, can be restored)",
  {
    id: z.string().describe("Document ID to delete"),
    permanent: z.boolean().optional().describe("If true, permanently delete (default: false = soft delete / trash)"),
  },
  async ({ id, permanent }) => {
    try {
      const editToken = getToken(id) || "";
      if (permanent) {
        await api(`/api/docs/${id}`, {
          method: "DELETE",
          body: JSON.stringify({ editToken }),
        });
      } else {
        await api(`/api/docs/${id}`, {
          method: "PATCH",
          body: JSON.stringify({ action: "soft-delete", editToken }),
        });
      }

      return {
        content: [{
          type: "text" as const,
          text: permanent ? `Document ${id} permanently deleted.` : `Document ${id} moved to trash.`,
        }],
      };
    } catch (err) { return errorResult(err); }
  }
);

// Tool: Publish / Make Private
server.tool(
  "mdfy_publish",
  "Toggle a document between public (shared) and private (draft) on mdfy.cc",
  {
    id: z.string().describe("Document ID"),
    published: z.boolean().describe("true = make publicly accessible, false = make private"),
  },
  async ({ id, published }) => {
    try {
      const editToken = getToken(id) || "";
      await api(`/api/docs/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          action: published ? "publish" : "unpublish",
          editToken,
        }),
      });
      const url = `${BASE_URL}/d/${id}`;
      return {
        content: [{
          type: "text" as const,
          text: published
            ? `Document ${id} is now publicly accessible at ${url}`
            : `Document ${id} is now private (draft).`,
        }],
      };
    } catch (err) { return errorResult(err); }
  }
);

// ─── Start ───

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("MCP server error:", err);
  process.exit(1);
});
