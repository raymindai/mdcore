import type { Metadata } from "next";
import { CodeBlock, InlineCode, SectionHeading, DocsNav, DocsSidebar, SiteFooter, mono } from "@/components/docs";

export const metadata: Metadata = {
  title: "Integrate with AI dev tools — mdfy.app",
  description:
    "Plug your mdfy hub or bundle into Claude Code, Cursor, Codex, Gemini CLI, Windsurf, and Aider with a single URL. One line in AGENTS.md / CLAUDE.md / .cursor/rules and every AI tool reads your personal knowledge graph.",
  alternates: { canonical: "https://mdfy.app/docs/integrate" },
  openGraph: {
    title: "Integrate mdfy with AI dev tools",
    description: "One line in AGENTS.md / CLAUDE.md / .cursor/rules — every AI tool reads your hub or bundle as clean markdown.",
    url: "https://mdfy.app/docs/integrate",
    images: [{ url: "/api/og?title=Integrate%20with%20AI%20dev%20tools", width: 1200, height: 630 }],
  },
};

/* ─── Sidebar Items ─── */
const sidebarItems = [
  { id: "overview", label: "Overview" },
  { id: "pick-url", label: "Pick the right URL" },
  { id: "permissions", label: "Permissions & sharing" },
  { id: "claude-code", label: "Claude Code" },
  { id: "cursor", label: "Cursor" },
  { id: "codex", label: "Codex CLI" },
  { id: "gemini", label: "Gemini CLI" },
  { id: "windsurf", label: "Windsurf" },
  { id: "aider", label: "Aider" },
  { id: "agents-md", label: "AGENTS.md (cross-tool)" },
  { id: "staleness", label: "Staleness + auto-analyze" },
];

/* ─── Tool block ─── */
function ToolBlock({
  id,
  name,
  filePath,
  tagline,
  snippet,
  notes,
}: {
  id: string;
  name: string;
  filePath: string;
  tagline: string;
  snippet: string;
  notes?: React.ReactNode;
}) {
  return (
    <div
      id={id}
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border-dim)",
        borderRadius: 14,
        padding: "28px 24px",
        marginBottom: 20,
        scrollMarginTop: 80,
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 6, flexWrap: "wrap" }}>
        <h3 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", margin: 0, letterSpacing: "-0.01em" }}>{name}</h3>
        <code style={{ fontSize: 12, fontFamily: mono, color: "var(--text-faint)" }}>{filePath}</code>
      </div>
      <p style={{ fontSize: 14, color: "var(--text-muted)", lineHeight: 1.7, marginTop: 0, marginBottom: 16, maxWidth: 640 }}>
        {tagline}
      </p>
      <CodeBlock lang="markdown">{snippet}</CodeBlock>
      {notes && (
        <p style={{ fontSize: 13, color: "var(--text-faint)", lineHeight: 1.7, marginTop: 12, marginBottom: 0, maxWidth: 640 }}>
          {notes}
        </p>
      )}
    </div>
  );
}

/* ─── Page ─── */
export default function IntegrateDocsPage() {
  return (
    <div
      style={{
        background: "var(--background)",
        color: "var(--foreground)",
        minHeight: "100vh",
      }}
    >
      <DocsNav />

      <div className="docs-layout">
        <DocsSidebar items={sidebarItems} currentPath="/docs/integrate" />

        <main style={{ paddingTop: 40, paddingBottom: 80, minWidth: 0 }}>
          {/* ─── Overview ─── */}
          <div id="overview" style={{ scrollMarginTop: 80 }}>
            <p
              style={{
                color: "var(--accent)",
                fontSize: 13,
                fontWeight: 600,
                letterSpacing: 2,
                textTransform: "uppercase",
                marginBottom: 12,
                fontFamily: mono,
              }}
            >
              Integrate
            </p>
            <h1
              style={{
                fontSize: "clamp(28px, 4vw, 40px)",
                fontWeight: 800,
                letterSpacing: "-0.03em",
                color: "var(--text-primary)",
                margin: "0 0 16px",
              }}
            >
              One line, every AI tool reads your hub
            </h1>
            <p
              style={{
                fontSize: 16,
                color: "var(--text-muted)",
                lineHeight: 1.7,
                marginBottom: 16,
                maxWidth: 680,
              }}
            >
              Every public mdfy URL has a clean-markdown variant. Paste one URL into the context file your AI dev tool already
              reads (<InlineCode>{"CLAUDE.md"}</InlineCode>, <InlineCode>{"AGENTS.md"}</InlineCode>, <InlineCode>{".cursor/rules"}</InlineCode>, etc.) and the tool fetches your doc, bundle, or hub on every session.
            </p>
            <p
              style={{
                fontSize: 16,
                color: "var(--text-muted)",
                lineHeight: 1.7,
                marginBottom: 32,
                maxWidth: 680,
              }}
            >
              The graph analysis (themes, insights, concept relations) ships in the same response, so the receiving AI inherits the prior AI&apos;s work instead of redoing it.
            </p>
          </div>

          {/* ─── Pick the right URL ─── */}
          <SectionHeading id="pick-url">Pick the right URL</SectionHeading>
          <p
            style={{
              fontSize: 14,
              color: "var(--text-muted)",
              lineHeight: 1.7,
              marginBottom: 16,
              maxWidth: 680,
            }}
          >
            mdfy exposes three URL shapes. For project-scoped tool config, the bundle URL is almost always the right choice — it carries the canvas analysis with it.
          </p>
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border-dim)",
              borderRadius: 14,
              padding: "20px 24px",
              marginBottom: 24,
            }}
          >
            <div style={{ display: "grid", gridTemplateColumns: "200px 100px 1fr", gap: 12, alignItems: "baseline", padding: "10px 0", borderBottom: "1px solid var(--border-dim)" }}>
              <code style={{ fontSize: 13, fontFamily: mono, color: "var(--text-primary)", fontWeight: 600 }}>mdfy.app/&#123;docId&#125;</code>
              <span style={{ fontSize: 12, fontFamily: mono, color: "var(--text-faint)" }}>single doc</span>
              <span style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6 }}>One spec, one decision, one note. Tightest token cost.</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "200px 100px 1fr", gap: 12, alignItems: "baseline", padding: "10px 0", borderBottom: "1px solid var(--border-dim)" }}>
              <code style={{ fontSize: 13, fontFamily: mono, color: "var(--text-primary)", fontWeight: 600 }}>mdfy.app/b/&#123;bundleId&#125;</code>
              <span style={{ fontSize: 12, fontFamily: mono, color: "var(--accent)" }}>bundle</span>
              <span style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6 }}>
                <strong style={{ color: "var(--text-primary)" }}>Recommended for AGENTS.md / .cursor/rules.</strong> 3-20+ docs grouped by intent, plus the canvas analysis (themes, insights, concept relations) shipped in the same response.
              </span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "200px 100px 1fr", gap: 12, alignItems: "baseline", padding: "10px 0" }}>
              <code style={{ fontSize: 13, fontFamily: mono, color: "var(--text-primary)", fontWeight: 600 }}>mdfy.app/hub/&#123;you&#125;</code>
              <span style={{ fontSize: 12, fontFamily: mono, color: "var(--text-faint)" }}>whole hub</span>
              <span style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6 }}>Your entire knowledge graph with concept_index. Use sparingly — broad context costs more tokens.</span>
            </div>
          </div>
          <p
            style={{
              fontSize: 13,
              color: "var(--text-faint)",
              lineHeight: 1.7,
              marginBottom: 32,
              maxWidth: 680,
            }}
          >
            Append <InlineCode>{"?compact"}</InlineCode> to trim whitespace, <InlineCode>{"?full=1"}</InlineCode> (bundle only) to inline every member doc, <InlineCode>{"?graph=0"}</InlineCode> (bundle only) to drop the analysis section.
          </p>

          {/* ─── Permissions & sharing ─── */}
          <SectionHeading id="permissions">Permissions &amp; sharing</SectionHeading>
          <p
            style={{
              fontSize: 14,
              color: "var(--text-muted)",
              lineHeight: 1.7,
              marginBottom: 16,
              maxWidth: 680,
            }}
          >
            The raw-markdown endpoint mirrors the viewer&apos;s gating exactly. If a person can&apos;t see the rendered page, an AI agent can&apos;t fetch the markdown either &mdash; the four guard layers below apply equally to docs, bundles, and hubs.
          </p>

          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border-dim)",
              borderRadius: 14,
              padding: "20px 24px",
              marginBottom: 20,
            }}
          >
            <div style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: 12, alignItems: "baseline", padding: "10px 0", borderBottom: "1px solid var(--border-dim)" }}>
              <code style={{ fontSize: 13, fontFamily: mono, color: "var(--text-primary)", fontWeight: 600 }}>Public</code>
              <span style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6 }}>
                Non-draft, no password, no allowed_emails. Any AI fetches anonymously &mdash; no headers required. This is the right setting for an open-source project&apos;s bundle that you want every contributor&apos;s AI tools to read.
              </span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: 12, alignItems: "baseline", padding: "10px 0", borderBottom: "1px solid var(--border-dim)" }}>
              <code style={{ fontSize: 13, fontFamily: mono, color: "var(--text-primary)", fontWeight: 600 }}>Restricted</code>
              <span style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6 }}>
                <InlineCode>{"allowed_emails"}</InlineCode> set on the bundle/doc. The fetcher must identify itself: either an owner JWT in <InlineCode>{"Authorization: Bearer <token>"}</InlineCode>, or an <InlineCode>{"X-User-Email"}</InlineCode> header that matches one of the allowed addresses. Otherwise 403 / 404.
              </span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: 12, alignItems: "baseline", padding: "10px 0", borderBottom: "1px solid var(--border-dim)" }}>
              <code style={{ fontSize: 13, fontFamily: mono, color: "var(--text-primary)", fontWeight: 600 }}>Password</code>
              <span style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6 }}>
                <InlineCode>{"password_hash"}</InlineCode> set on the bundle/doc. Pass the cleartext via <InlineCode>{"X-Document-Password"}</InlineCode> header. AI dev tools rarely support sending custom headers from an <InlineCode>{"AGENTS.md"}</InlineCode> reference, so use this for occasional shares (the rendered page&apos;s prompt is fine) rather than for AI-tool config.
              </span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: 12, alignItems: "baseline", padding: "10px 0" }}>
              <code style={{ fontSize: 13, fontFamily: mono, color: "var(--text-primary)", fontWeight: 600 }}>Draft</code>
              <span style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6 }}>
                <InlineCode>{"is_draft = true"}</InlineCode>. Only the owner (via JWT) can fetch. Drafts return 404 to everyone else &mdash; including AI tools that don&apos;t know your auth. Publish the bundle first before referencing it in tool config.
              </span>
            </div>
          </div>

          <h3
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: "var(--text-primary)",
              marginTop: 16,
              marginBottom: 10,
              letterSpacing: -0.1,
            }}
          >
            Practical recipes
          </h3>
          <ul
            style={{
              fontSize: 14,
              color: "var(--text-muted)",
              lineHeight: 1.7,
              marginBottom: 24,
              paddingLeft: 20,
              maxWidth: 680,
            }}
          >
            <li>
              <strong style={{ color: "var(--text-primary)" }}>Open-source project</strong>: bundle public, paste in <InlineCode>{"AGENTS.md"}</InlineCode>. Every contributor&apos;s AI tool fetches anonymously. Zero coordination.
            </li>
            <li>
              <strong style={{ color: "var(--text-primary)" }}>Internal / team project</strong>: bundle with <InlineCode>{"allowed_emails"}</InlineCode> of teammates. Each teammate&apos;s AI tool needs to send <InlineCode>{"X-User-Email"}</InlineCode> &mdash; most CLIs let you template request headers via env or rc files. The bundle&apos;s rendered viewer also gates on the same list, so non-teammates see 404 in both surfaces.
            </li>
            <li>
              <strong style={{ color: "var(--text-primary)" }}>Solo / private notes</strong>: hub URL referenced from <InlineCode>{"~/.claude/CLAUDE.md"}</InlineCode>. Hub-wide draft state is per-doc, not per-hub &mdash; public docs surface, draft docs stay hidden.
            </li>
            <li>
              <strong style={{ color: "var(--text-primary)" }}>One-off review</strong>: keep the bundle in draft, share the rendered URL with a password prompt for the human. Don&apos;t reference it in AI tool config (the password header round-trip isn&apos;t worth the friction).
            </li>
          </ul>

          <p
            style={{
              fontSize: 13,
              color: "var(--text-faint)",
              lineHeight: 1.7,
              marginBottom: 32,
              maxWidth: 680,
            }}
          >
            <strong style={{ color: "var(--text-muted)" }}>Invariant</strong>: every gating decision happens server-side in the raw-fetch route. There&apos;s no way for the URL to leak content the rendered viewer wouldn&apos;t already show. Switching gating (e.g. removing an email from <InlineCode>{"allowed_emails"}</InlineCode>) takes effect on the next fetch &mdash; AI tools that already cached the markdown locally won&apos;t see the revocation until they re-fetch.
          </p>

          {/* ─── Headliners ─── */}
          <SectionHeading id="claude-code">Claude Code</SectionHeading>
          <ToolBlock
            id="claude-code-tool"
            name="Claude Code"
            filePath="CLAUDE.md (project root)"
            tagline="Claude Code auto-loads CLAUDE.md from the project root and every parent directory. Drop a mdfy bundle URL anywhere in the file and Claude fetches the digest on session start."
            snippet={`## Project context (from mdfy)

Bundle: https://mdfy.app/b/<bundle-id>

This bundle carries the project's spec, ADRs, and decisions —
plus a pre-computed graph (themes, insights, concept relations).
Re-read it whenever you need cross-doc context.`}
            notes={
              <>
                For user-global memory across all projects, use <InlineCode>{"~/.claude/CLAUDE.md"}</InlineCode> with your hub URL instead.
              </>
            }
          />

          <SectionHeading id="cursor">Cursor</SectionHeading>
          <ToolBlock
            id="cursor-tool"
            name="Cursor"
            filePath=".cursor/rules/mdfy.mdc"
            tagline="Cursor's newer multi-rule format. Frontmatter scopes when the rule applies; body holds the mdfy URL. Use one file per bundle for clean separation."
            snippet={`---
description: Project context from mdfy
alwaysApply: true
---

Project context lives at https://mdfy.app/b/<bundle-id>.

When you need spec / decisions / prior reasoning, fetch that URL.
The response is clean markdown with the bundle's graph analysis
(themes, insights, gaps, connections) included by default.`}
            notes={
              <>
                Legacy single-file <InlineCode>{".cursorrules"}</InlineCode> works too — just drop the body content (without the frontmatter) into the root <InlineCode>{".cursorrules"}</InlineCode> file.
              </>
            }
          />

          <SectionHeading id="codex">Codex CLI</SectionHeading>
          <ToolBlock
            id="codex-tool"
            name="Codex CLI"
            filePath="AGENTS.md (project root)"
            tagline="OpenAI's Codex CLI reads AGENTS.md as the canonical agent-instructions file. AGENTS.md is also the cross-tool convention many other agents respect — pasting your bundle URL here often gives you free coverage for Claude Code, Aider, and others without separate config."
            snippet={`# Project Agents Manifest

## Context

This project's working context is mdfy bundle:
https://mdfy.app/b/<bundle-id>

Fetch that URL when you need spec / decisions / cross-doc reasoning.
The bundle's pre-computed graph (themes, insights, concept relations)
is in the same response — no separate index call needed.`}
          />

          {/* ─── Secondary ─── */}
          <SectionHeading id="gemini">Gemini CLI</SectionHeading>
          <ToolBlock
            id="gemini-tool"
            name="Gemini CLI"
            filePath="GEMINI.md (project root)"
            tagline="Google's Gemini CLI reads GEMINI.md as its session-instructions file. Same content shape as the others."
            snippet={`# Gemini context

Project memory lives at https://mdfy.app/b/<bundle-id>.
Fetch on demand for spec, decisions, and cross-doc reasoning.`}
          />

          <SectionHeading id="windsurf">Windsurf</SectionHeading>
          <ToolBlock
            id="windsurf-tool"
            name="Windsurf"
            filePath=".windsurfrules (project root)"
            tagline="Windsurf reads .windsurfrules at the project root for its Cascade agent."
            snippet={`Project context: https://mdfy.app/b/<bundle-id>

When you need this project's spec / decisions / prior reasoning,
fetch that URL. It returns clean markdown with the bundle's graph
analysis included.`}
          />

          <SectionHeading id="aider">Aider</SectionHeading>
          <ToolBlock
            id="aider-tool"
            name="Aider"
            filePath="CONVENTIONS.md (project root)"
            tagline="Aider's terminal-first AI pair programmer reads CONVENTIONS.md as part of the chat context (add it via aider --read CONVENTIONS.md or list it under read: in .aider.conf.yml)."
            snippet={`# Project conventions

External context for this project lives at:
https://mdfy.app/b/<bundle-id>

Fetch that URL when you need spec, decisions, or cross-doc reasoning.`}
          />

          {/* ─── AGENTS.md cross-tool ─── */}
          <SectionHeading id="agents-md">AGENTS.md — the cross-tool path</SectionHeading>
          <p
            style={{
              fontSize: 14,
              color: "var(--text-muted)",
              lineHeight: 1.7,
              marginBottom: 16,
              maxWidth: 680,
            }}
          >
            <InlineCode>{"AGENTS.md"}</InlineCode> is the de facto cross-tool convention for &ldquo;agent instructions in the repo root.&rdquo; Codex, Claude Code, Aider, and several other CLIs read it. If you only want to maintain one file, this is the one.
          </p>
          <p
            style={{
              fontSize: 14,
              color: "var(--text-muted)",
              lineHeight: 1.7,
              marginBottom: 16,
              maxWidth: 680,
            }}
          >
            <strong style={{ color: "var(--text-primary)" }}>Pattern</strong>: keep tool-specific overrides in their respective files (<InlineCode>{".cursor/rules/"}</InlineCode>, <InlineCode>{"GEMINI.md"}</InlineCode>) but put the mdfy URL in <InlineCode>{"AGENTS.md"}</InlineCode>. The URL is the portable bit; per-tool nuance stays per-tool.
          </p>

          {/* ─── Staleness ─── */}
          <SectionHeading id="staleness">Staleness + auto-analyze</SectionHeading>
          <p
            style={{
              fontSize: 14,
              color: "var(--text-muted)",
              lineHeight: 1.7,
              marginBottom: 16,
              maxWidth: 680,
            }}
          >
            Doc content is auto-saved on every edit — the URL response always reflects the latest markdown without any push step. The <em>analysis</em> layer (bundle <InlineCode>{"graph_data"}</InlineCode>, hub <InlineCode>{"concept_index"}</InlineCode>) is computed once and cached.
          </p>
          <p
            style={{
              fontSize: 14,
              color: "var(--text-muted)",
              lineHeight: 1.7,
              marginBottom: 16,
              maxWidth: 680,
            }}
          >
            When a member doc was edited after the last analysis run, the URL response flags it: <InlineCode>{"analysis_stale: true"}</InlineCode> in the frontmatter plus a warning blockquote at the top of the body. Receiving AI tools can weigh the analysis accordingly. The doc bodies themselves are always fresh; only the synthesised layer (themes / insights / concepts) may lag.
          </p>
          <p
            style={{
              fontSize: 14,
              color: "var(--text-muted)",
              lineHeight: 1.7,
              marginBottom: 32,
              maxWidth: 680,
            }}
          >
            Free tier: re-analyze is explicit — open the canvas and click <strong>Re-analyze</strong> when you&apos;re ready. Pro tier (after beta) adds <strong>auto-analyze</strong>: stale fetches trigger a background regeneration so the next fetch is fresh, hands-free.
          </p>
        </main>
      </div>

      <SiteFooter />
    </div>
  );
}
