import type { Metadata } from "next";
import {
  CodeBlock,
  InlineCode,
  Card,
  SectionHeading,
  SubLabel,
  DocsNav,
  DocsFooter,
  DocsSidebar,
  mono,
} from "@/components/docs";

export const metadata: Metadata = {
  title: "JavaScript SDK 레퍼런스 — mdfy.app",
  description:
    "mdfy.app JavaScript/TypeScript SDK. MdfyClient 클래스, 독립 함수, npm 패키지로 프로그래밍 방식의 마크다운 문서 관리를 지원합니다.",
  alternates: {
    canonical: "https://mdfy.app/ko/docs/sdk",
    languages: { en: "https://mdfy.app/docs/sdk" },
  },
  openGraph: {
    title: "JavaScript SDK 레퍼런스 — mdfy.app",
    description: "TypeScript-first SDK. 문서 게시, 조회, 수정을 프로그래밍으로.",
    url: "https://mdfy.app/ko/docs/sdk",
    images: [{ url: "/api/og?title=JavaScript%20SDK", width: 1200, height: 630 }],
  },
};

function MethodRow({ name, returns, desc }: { name: string; returns: string; desc: string }) {
  return (
    <div
      className="param-row"
      style={{
        display: "grid",
        gridTemplateColumns: "260px 120px 1fr",
        gap: 12,
        alignItems: "baseline",
        padding: "10px 0",
        borderBottom: "1px solid var(--border-dim)",
      }}
    >
      <code style={{ fontSize: 13, fontFamily: mono, color: "var(--accent)", fontWeight: 600 }}>{name}</code>
      <span style={{ fontSize: 12, fontFamily: mono, color: "var(--text-faint)" }}>{returns}</span>
      <span style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6 }}>{desc}</span>
    </div>
  );
}

const sidebarItems = [
  { id: "installation", label: "설치" },
  { id: "quick-start", label: "시작하기" },
  { id: "client", label: "MdfyClient" },
  { id: "client-publish", label: "client.publish()" },
  { id: "client-pull", label: "client.pull()" },
  { id: "client-update", label: "client.update()" },
  { id: "client-delete", label: "client.delete()" },
  { id: "client-list", label: "client.list()" },
  { id: "client-versions", label: "client.versions()" },
  { id: "client-upload", label: "client.upload()" },
  { id: "standalone", label: "독립 함수" },
  { id: "packages", label: "npm 패키지" },
];

export default function SdkDocsPageKo() {
  return (
    <div style={{ background: "var(--background)", color: "var(--foreground)", minHeight: "100vh" }}>
      <DocsNav lang="ko" />

      <div className="docs-layout">
        <DocsSidebar
          items={sidebarItems}
          currentPath="/docs/sdk"
        />

        {/* MAIN */}
        <main style={{ paddingTop: 40, paddingBottom: 80, minWidth: 0 }}>
          <p style={{ color: "var(--accent)", fontSize: 13, fontWeight: 600, letterSpacing: 2, textTransform: "uppercase", marginBottom: 12, fontFamily: mono }}>SDK</p>
          <h1 style={{ fontSize: "clamp(28px, 4vw, 40px)", fontWeight: 800, letterSpacing: "-0.03em", color: "var(--text-primary)", margin: "0 0 16px" }}>
            JavaScript SDK
          </h1>
          <p style={{ fontSize: 16, color: "var(--text-muted)", lineHeight: 1.7, marginBottom: 32, maxWidth: 640 }}>
            mdfy.app를 위한 TypeScript-first 클라이언트. Node.js, Deno, Bun, 브라우저에서 동작합니다. 의존성 없음.
          </p>

          {/* 설치 */}
          <SectionHeading id="installation">설치</SectionHeading>
          <Card>
            <CodeBlock lang="bash">{`npm install @mdcore/api`}</CodeBlock>
            <p style={{ fontSize: 13, color: "var(--text-faint)", marginTop: 12, marginBottom: 0, lineHeight: 1.7 }}>
              다른 패키지 매니저: <InlineCode>{"yarn add @mdcore/api"}</InlineCode> 또는 <InlineCode>{"pnpm add @mdcore/api"}</InlineCode>
            </p>
          </Card>

          {/* 시작하기 */}
          <SectionHeading id="quick-start">시작하기</SectionHeading>
          <Card>
            <CodeBlock lang="typescript">{`import { publish } from "@mdcore/api";

const result = await publish("# Hello World");
console.log(result.url);  // https://mdfy.app/abc123`}</CodeBlock>
          </Card>

          {/* MdfyClient */}
          <SectionHeading id="client">MdfyClient</SectionHeading>
          <p style={{ fontSize: 14, color: "var(--text-muted)", lineHeight: 1.7, marginBottom: 16, maxWidth: 640 }}>
            <InlineCode>{"MdfyClient"}</InlineCode> 클래스는 사용자 식별 정보와 Base URL 설정을 포함한 상태 기반 클라이언트를 제공합니다.
          </p>
          <Card>
            <CodeBlock lang="typescript">{`import { MdfyClient } from "@mdcore/api";

const client = new MdfyClient({
  baseUrl: "https://mdfy.app",  // default
  userId: "user-uuid",          // optional
  email: "user@example.com",    // optional
});`}</CodeBlock>
            <SubLabel>생성자 옵션</SubLabel>
            <MethodRow name="baseUrl" returns="string" desc="API Base URL. 기본값: https://mdfy.app" />
            <MethodRow name="userId" returns="string" desc="소유권 기반 작업을 위한 사용자 UUID." />
            <MethodRow name="email" returns="string" desc="사용자 식별용 이메일." />

            <SubLabel>메서드</SubLabel>
            <MethodRow name="publish(markdown, options?)" returns="PublishResult" desc="새 문서를 생성합니다." />
            <MethodRow name="pull(id, options?)" returns="Document" desc="ID로 문서를 조회합니다." />
            <MethodRow name="update(id, markdown, options)" returns="void" desc="문서 내용을 수정합니다." />
            <MethodRow name="delete(id, editToken)" returns="void" desc="문서를 소프트 삭제합니다." />
            <MethodRow name="list()" returns="Document[]" desc="사용자의 문서 목록을 조회합니다." />
            <MethodRow name="versions(id)" returns="Version[]" desc="버전 이력을 조회합니다." />
            <MethodRow name="upload(file)" returns="string" desc="이미지를 업로드하고 URL을 반환합니다." />
            <MethodRow name="setPublished(id, editToken)" returns="void" desc="문서를 게시 상태로 설정합니다." />
            <MethodRow name="setDraft(id, editToken)" returns="void" desc="문서를 임시 저장 상태로 설정합니다." />
          </Card>

          {/* client.publish() */}
          <SectionHeading id="client-publish">client.publish()</SectionHeading>
          <Card>
            <CodeBlock lang="typescript">{`const result = await client.publish("# Hello World", {
  title: "My Document",
  isDraft: false,
  password: "optional-secret",
  expiresIn: "7d",
  editMode: "token",
  folderId: "folder-uuid",
});

console.log(result.id);        // "abc123"
console.log(result.editToken); // "tok_aBcDeFgH..."
console.log(result.url);       // "https://mdfy.app/abc123"`}</CodeBlock>
          </Card>

          {/* client.pull() */}
          <SectionHeading id="client-pull">client.pull()</SectionHeading>
          <Card>
            <CodeBlock lang="typescript">{`const doc = await client.pull("abc123");

console.log(doc.markdown);    // "# Hello World"
console.log(doc.title);       // "My Document"
console.log(doc.view_count);  // 42
console.log(doc.is_draft);    // false

// 비밀번호 보호 문서
const doc2 = await client.pull("abc123", {
  password: "secret",
});`}</CodeBlock>
          </Card>

          {/* client.update() */}
          <SectionHeading id="client-update">client.update()</SectionHeading>
          <Card>
            <CodeBlock lang="typescript">{`await client.update("abc123", "# Updated Content", {
  editToken: "tok_aBcDeFgH",
  title: "New Title",
  changeSummary: "Fixed typos in section 2",
});`}</CodeBlock>
          </Card>

          {/* client.delete() */}
          <SectionHeading id="client-delete">client.delete()</SectionHeading>
          <Card>
            <CodeBlock lang="typescript">{`await client.delete("abc123", "tok_aBcDeFgH");
// 문서가 소프트 삭제됩니다 (소유자가 복원 가능)`}</CodeBlock>
          </Card>

          {/* client.list() */}
          <SectionHeading id="client-list">client.list()</SectionHeading>
          <Card>
            <CodeBlock lang="typescript">{`const docs = await client.list();

docs.forEach(doc => {
  console.log(\`\${doc.id}: \${doc.title} (\${doc.is_draft ? "draft" : "published"})\`);
});`}</CodeBlock>
          </Card>

          {/* client.versions() */}
          <SectionHeading id="client-versions">client.versions()</SectionHeading>
          <Card>
            <CodeBlock lang="typescript">{`const versions = await client.versions("abc123");

versions.forEach(v => {
  console.log(\`\${v.version}: \${v.changeSummary} (\${v.created_at})\`);
});`}</CodeBlock>
          </Card>

          {/* client.upload() */}
          <SectionHeading id="client-upload">client.upload()</SectionHeading>
          <Card>
            <CodeBlock lang="typescript">{`// 브라우저
const input = document.querySelector("input[type=file]");
const file = input.files[0];
const imageUrl = await client.upload(file);

// Node.js
import { readFileSync } from "fs";
const buffer = readFileSync("screenshot.png");
const blob = new Blob([buffer], { type: "image/png" });
const imageUrl = await client.upload(blob);`}</CodeBlock>
          </Card>

          {/* 독립 함수 */}
          <SectionHeading id="standalone">독립 함수</SectionHeading>
          <p style={{ fontSize: 14, color: "var(--text-muted)", lineHeight: 1.7, marginBottom: 16, maxWidth: 640 }}>
            클라이언트 인스턴스 없이 빠르게 단일 작업을 수행할 수 있습니다.
          </p>
          <Card>
            <CodeBlock lang="typescript">{`import {
  publish,
  pull,
  update,
  deleteDocument,
  upload,
} from "@mdcore/api";

// 게시
const { id, editToken, url } = await publish("# Hello World");

// 조회
const doc = await pull(id);

// 수정
await update(id, "# Updated content", editToken);

// 삭제
await deleteDocument(id, editToken);

// 이미지 업로드
const imageUrl = await upload(file);`}</CodeBlock>
          </Card>

          {/* npm 패키지 */}
          <SectionHeading id="packages">npm 패키지</SectionHeading>
          <p style={{ fontSize: 14, color: "var(--text-muted)", lineHeight: 1.7, marginBottom: 24, maxWidth: 640 }}>
            독립적인 패키지들입니다. 각각 별도로 설치하여 사용할 수 있으며, 패키지 간 의존성이 없습니다.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {[
              { pkg: "@mdcore/api", desc: "mdfy.app HTTP 클라이언트. 문서 게시, 조회, 수정, 삭제. 의존성 없음 (native fetch).", install: "npm install @mdcore/api" },
              { pkg: "@mdcore/engine", desc: "WASM Markdown 렌더러 (Rust/comrak). GFM, KaTeX 수학, Mermaid 다이어그램, 구문 강조.", install: "npm install @mdcore/engine" },
              { pkg: "@mdcore/styles", desc: "CSS 전용 패키지. 다크/라이트 테마, 렌더링 스타일, 인쇄/PDF 스타일. JavaScript 없음.", install: "npm install @mdcore/styles" },
              { pkg: "@mdcore/ai", desc: "AI 프로바이더 연동. Gemini, OpenAI, Anthropic. 텍스트-Markdown 변환, ASCII 렌더링.", install: "npm install @mdcore/ai" },
              { pkg: "mdfy-mcp", desc: "로컬 stdio MCP (핵심 도구 6개). 전체 25개 도구는 https://mdfy.app/api/mcp 호스팅 MCP에서 사용 가능.", install: "npx mdfy-mcp" },
            ].map((p, i) => (
              <div
                key={p.pkg}
                className="param-row"
                style={{
                  display: "grid",
                  gridTemplateColumns: "180px 1fr 240px",
                  gap: 16,
                  alignItems: "center",
                  padding: "18px 20px",
                  background: i % 2 === 0 ? "var(--surface)" : "transparent",
                  borderRadius: 10,
                }}
              >
                <code style={{ fontSize: 14, fontWeight: 700, fontFamily: mono, color: "var(--accent)" }}>{p.pkg}</code>
                <p style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.5, margin: 0 }}>{p.desc}</p>
                <code style={{ fontSize: 12, fontFamily: mono, color: "var(--text-faint)" }}>{p.install}</code>
              </div>
            ))}
          </div>

          <SubLabel>@mdcore/engine 예시</SubLabel>
          <Card style={{ marginTop: 8 }}>
            <CodeBlock lang="typescript">{`import { mdcore } from "@mdcore/engine";
import { postProcessHtml } from "@mdcore/engine";

await mdcore.init();

const { html, flavor } = mdcore.render("# Hello **World**");
const finalHtml = await postProcessHtml(html);`}</CodeBlock>
          </Card>

          <SubLabel>@mdcore/styles 예시</SubLabel>
          <Card style={{ marginTop: 8 }}>
            <CodeBlock lang="css">{`/* 전체 스타일 임포트 */
@import "@mdcore/styles";

/* 개별 모듈 임포트 */
@import "@mdcore/styles/theme-dark.css";
@import "@mdcore/styles/rendered.css";
@import "@mdcore/styles/code.css";
@import "@mdcore/styles/print.css";`}</CodeBlock>
          </Card>

          <SubLabel>@mdcore/ai 예시</SubLabel>
          <Card style={{ marginTop: 8 }}>
            <CodeBlock lang="typescript">{`import { mdfyText, callAI, isAiConversation } from "@mdcore/ai";

// 원시 텍스트를 구조화된 Markdown으로 변환
const markdown = await mdfyText("some rough text here...");

// AI 대화 형식 감지
if (isAiConversation(text)) {
  const { turns } = parseConversation(text);
  const formatted = formatConversation(turns);
}`}</CodeBlock>
          </Card>
        </main>
      </div>

      <DocsFooter breadcrumb="JavaScript SDK" />
    </div>
  );
}
