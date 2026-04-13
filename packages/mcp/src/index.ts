#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import { homedir } from "os";

// ─── Config ───

const BASE_URL = (process.env.MDFY_BASE_URL || "https://www.mdfy.cc").replace(/\/$/, "");
const USER_EMAIL = process.env.MDFY_EMAIL || "";
const TOKEN_FILE = join(homedir(), ".mdfy", "tokens.json");

// ─── Token Store ───

function loadTokens(): Record<string, string> {
  try {
    if (existsSync(TOKEN_FILE)) {
      return JSON.parse(readFileSync(TOKEN_FILE, "utf-8"));
    }
  } catch { /* ignore */ }
  return {};
}

function saveToken(docId: string, editToken: string): void {
  const dir = join(homedir(), ".mdfy");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const tokens = loadTokens();
  tokens[docId] = editToken;
  writeFileSync(TOKEN_FILE, JSON.stringify(tokens, null, 2));
}

function getToken(docId: string): string | undefined {
  return loadTokens()[docId];
}

// ─── API Helper ───

async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> || {}),
  };
  if (USER_EMAIL) headers["x-user-email"] = USER_EMAIL;

  const res = await fetch(url, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// ─── MCP Server ───

const server = new McpServer({
  name: "mdfy",
  version: "0.1.0",
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
    const result = await api<{ id: string; editToken: string }>("/api/docs", {
      method: "POST",
      body: JSON.stringify({
        markdown,
        title,
        isDraft: draft ?? false,
        userEmail: USER_EMAIL || undefined,
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
    const doc = await api<{ markdown: string; title: string | null; updated_at: string; is_draft: boolean }>(
      `/api/docs/${id}`
    );

    return {
      content: [{
        type: "text" as const,
        text: `# ${doc.title || "Untitled"}\n\n${doc.markdown}`,
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
    const editToken = getToken(id) || "";
    await api(`/api/docs/${id}`, {
      method: "PATCH",
      body: JSON.stringify({
        markdown,
        title,
        editToken,
        userEmail: USER_EMAIL || undefined,
        action: "auto-save",
      }),
    });

    return {
      content: [{
        type: "text" as const,
        text: `Document ${id} updated successfully.`,
      }],
    };
  }
);

// Tool: List documents
server.tool(
  "mdfy_list",
  "List all documents owned by the current user on mdfy.cc",
  {},
  async () => {
    if (!USER_EMAIL) {
      return {
        content: [{
          type: "text" as const,
          text: "Error: MDFY_EMAIL environment variable is required to list documents.",
        }],
      };
    }

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

    return {
      content: [{
        type: "text" as const,
        text: `Found ${docs.length} documents:\n\n${lines.join("\n")}`,
      }],
    };
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
    const editToken = getToken(id) || "";
    await api(`/api/docs/${id}`, {
      method: "DELETE",
      body: JSON.stringify({
        editToken,
        userEmail: USER_EMAIL || undefined,
      }),
    });

    return {
      content: [{
        type: "text" as const,
        text: `Document ${id} deleted.`,
      }],
    };
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
    await api(`/api/docs/${id}`, {
      method: "PATCH",
      body: JSON.stringify({
        action: published ? "publish" : "unpublish",
        userEmail: USER_EMAIL || undefined,
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
