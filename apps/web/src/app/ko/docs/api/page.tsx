import type { Metadata } from "next";
import {
  CodeBlock,
  InlineCode,
  SectionHeading,
  SubLabel,
  DocsNav,
  DocsFooter,
  DocsSidebar,
  mono,
} from "@/components/docs";

export const metadata: Metadata = {
  title: "REST API 레퍼런스 — mdfy.app",
  description:
    "mdfy.app REST API 레퍼런스. HTTP를 통해 Markdown 문서를 생성, 조회, 수정, 삭제할 수 있습니다. curl, JavaScript, Python 예시 포함.",
  alternates: {
    canonical: "https://mdfy.app/ko/docs/api",
    languages: { en: "https://mdfy.app/docs/api" },
  },
  openGraph: {
    title: "REST API 레퍼런스 — mdfy.app",
    description: "REST API 레퍼런스. 엔드포인트, 매개변수, 예시.",
    url: "https://mdfy.app/ko/docs/api",
    images: [{ url: "/api/og?title=REST%20API", width: 1200, height: 630 }],
  },
};

/* ─── Page-specific Components ─── */

function MethodBadge({ method }: { method: string }) {
  const colors: Record<string, { fg: string; bg: string }> = {
    POST: { fg: "#3b82f6", bg: "#3b82f615" },
    GET: { fg: "#22c55e", bg: "#22c55e15" },
    PATCH: { fg: "#f59e0b", bg: "#f59e0b15" },
    DELETE: { fg: "#ef4444", bg: "#ef444415" },
    HEAD: { fg: "#a78bfa", bg: "#a78bfa15" },
  };
  const c = colors[method] || {
    fg: "var(--text-secondary)",
    bg: "var(--surface)",
  };
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 700,
        fontFamily: mono,
        color: c.fg,
        background: c.bg,
        padding: "3px 10px",
        borderRadius: 6,
        letterSpacing: 0.5,
      }}
    >
      {method}
    </span>
  );
}

function ParamRow({
  name,
  type,
  required,
  children,
}: {
  name: string;
  type: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className="param-row"
      style={{
        display: "grid",
        gridTemplateColumns: "160px 80px 1fr",
        gap: 12,
        alignItems: "baseline",
        padding: "10px 0",
        borderBottom: "1px solid var(--border-dim)",
      }}
    >
      <code
        style={{
          fontSize: 13,
          fontFamily: mono,
          color: "var(--text-primary)",
          fontWeight: 600,
        }}
      >
        {name}
        {required && (
          <span
            style={{
              fontSize: 9,
              fontWeight: 700,
              color: "#ef4444",
              marginLeft: 6,
              verticalAlign: "super",
            }}
          >
            REQUIRED
          </span>
        )}
      </code>
      <span
        style={{
          fontSize: 12,
          fontFamily: mono,
          color: "var(--text-faint)",
        }}
      >
        {type}
      </span>
      <span
        style={{
          fontSize: 13,
          color: "var(--text-muted)",
          lineHeight: 1.6,
        }}
      >
        {children}
      </span>
    </div>
  );
}

function EndpointBlock({
  id,
  method,
  path,
  description,
  children,
}: {
  id: string;
  method: string;
  path: string;
  description: string;
  children: React.ReactNode;
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
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 8,
        }}
      >
        <MethodBadge method={method} />
        <code
          style={{
            fontSize: 15,
            fontFamily: mono,
            color: "var(--text-primary)",
            fontWeight: 600,
          }}
        >
          {path}
        </code>
      </div>
      <p
        style={{
          fontSize: 14,
          color: "var(--text-muted)",
          margin: "0 0 24px",
          lineHeight: 1.7,
          maxWidth: 640,
        }}
      >
        {description}
      </p>
      {children}
    </div>
  );
}

/* ─── Sidebar Items ─── */
const sidebarItems = [
  { id: "overview", label: "개요" },
  { id: "post-docs", label: "POST /api/docs" },
  { id: "get-docs-id", label: "GET /api/docs/{id}" },
  { id: "patch-docs-id", label: "PATCH /api/docs/{id}" },
  { id: "head-docs-id", label: "HEAD /api/docs/{id}" },
  { id: "get-user-documents", label: "GET /api/user/documents" },
  { id: "post-upload", label: "POST /api/upload" },
  { id: "authentication", label: "인증" },
  { id: "rate-limits", label: "요청 제한" },
  { id: "errors", label: "에러" },
];

/* ─── Page ─── */
export default function ApiDocsPageKo() {
  return (
    <div
      style={{
        background: "var(--background)",
        color: "var(--foreground)",
        minHeight: "100vh",
      }}
    >
      <DocsNav lang="ko" />

      <div className="docs-layout">
        <DocsSidebar
          items={sidebarItems}
          currentPath="/docs/api"
        />

        {/* MAIN CONTENT */}
        <main style={{ paddingTop: 40, paddingBottom: 80, minWidth: 0 }}>
          {/* 개요 */}
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
              REST API
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
              API 레퍼런스
            </h1>
            <p
              style={{
                fontSize: 16,
                color: "var(--text-muted)",
                lineHeight: 1.7,
                marginBottom: 8,
                maxWidth: 640,
              }}
            >
              모든 엔드포인트는 JSON을 주고받습니다. Base URL:{" "}
              <InlineCode>{"https://mdfy.app"}</InlineCode>
            </p>
            <p
              style={{
                fontSize: 14,
                color: "var(--text-faint)",
                lineHeight: 1.7,
                marginBottom: 32,
              }}
            >
              요청 제한: IP당 분당 10회. 최대 문서 크기: 500KB.
            </p>
          </div>

          {/* ─── POST /api/docs ─── */}
          <EndpointBlock
            id="post-docs"
            method="POST"
            path="/api/docs"
            description="새 문서를 생성합니다. 문서 ID, edit token, 생성 시각을 반환합니다."
          >
            <SubLabel>매개변수</SubLabel>
            <div style={{ marginBottom: 24 }}>
              <ParamRow name="markdown" type="string" required>
                문서의 Markdown 내용.
              </ParamRow>
              <ParamRow name="title" type="string">
                문서 제목. 미지정 시 첫 번째 헤딩에서 자동 추출.
              </ParamRow>
              <ParamRow name="isDraft" type="boolean">
                임시 저장 여부. 기본값: <InlineCode>{"false"}</InlineCode>. 임시 저장 문서는 소유자만 볼 수 있습니다.
              </ParamRow>
              <ParamRow name="source" type="string">
                소스 식별자: <InlineCode>{"api"}</InlineCode>, <InlineCode>{"web"}</InlineCode>, <InlineCode>{"vscode"}</InlineCode>, <InlineCode>{"mcp"}</InlineCode>, <InlineCode>{"cli"}</InlineCode>.
              </ParamRow>
              <ParamRow name="password" type="string">
                문서를 비밀번호로 보호합니다. 열람 시 비밀번호 입력이 필요합니다.
              </ParamRow>
              <ParamRow name="expiresIn" type="string">
                문서 만료 시간: <InlineCode>{"1h"}</InlineCode>, <InlineCode>{"1d"}</InlineCode>, <InlineCode>{"7d"}</InlineCode>, <InlineCode>{"30d"}</InlineCode>. 생략하면 영구 보존.
              </ParamRow>
              <ParamRow name="editMode" type="string">
                편집 권한: <InlineCode>{"token"}</InlineCode> (기본값, editToken 필요), <InlineCode>{"anyone"}</InlineCode>, <InlineCode>{"authenticated"}</InlineCode>.
              </ParamRow>
              <ParamRow name="folderId" type="string">
                문서를 특정 폴더에 저장합니다.
              </ParamRow>
            </div>

            <SubLabel>Request - curl</SubLabel>
            <CodeBlock lang="bash">{`curl -X POST https://mdfy.app/api/docs \\
  -H "Content-Type: application/json" \\
  -d '{
    "markdown": "# Hello World\\nThis is my document.",
    "title": "My Document",
    "isDraft": false
  }'`}</CodeBlock>

            <SubLabel>Request - JavaScript</SubLabel>
            <CodeBlock lang="javascript">{`const res = await fetch("https://mdfy.app/api/docs", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    markdown: "# Hello World\\nThis is my document.",
    title: "My Document",
    isDraft: false,
  }),
});
const data = await res.json();`}</CodeBlock>

            <SubLabel>Request - Python</SubLabel>
            <CodeBlock lang="python">{`import requests

res = requests.post("https://mdfy.app/api/docs", json={
    "markdown": "# Hello World\\nThis is my document.",
    "title": "My Document",
    "isDraft": False,
})
data = res.json()`}</CodeBlock>

            <SubLabel>응답 200</SubLabel>
            <CodeBlock lang="json">{`{
  "id": "abc123",
  "editToken": "tok_aBcDeFgHiJkLmNoP",
  "created_at": "2026-04-15T00:00:00Z"
}`}</CodeBlock>
          </EndpointBlock>

          {/* ─── GET /api/docs/{id} ─── */}
          <EndpointBlock
            id="get-docs-id"
            method="GET"
            path="/api/docs/{id}"
            description="ID로 문서를 조회합니다. 임시 저장 문서는 소유자 인증이 필요합니다. 비밀번호 보호 문서는 x-document-password 헤더가 필요합니다."
          >
            <SubLabel>헤더 (선택)</SubLabel>
            <div style={{ marginBottom: 24 }}>
              <ParamRow name="x-user-id" type="string">
                소유권 확인용 사용자 UUID.
              </ParamRow>
              <ParamRow name="x-document-password" type="string">
                비밀번호 보호 문서용 비밀번호.
              </ParamRow>
              <ParamRow name="x-user-email" type="string">
                사용자 식별용 이메일.
              </ParamRow>
              <ParamRow name="Authorization" type="string">
                OAuth 인증 요청용 Bearer 토큰.
              </ParamRow>
            </div>

            <SubLabel>Request - curl</SubLabel>
            <CodeBlock lang="bash">{`curl https://mdfy.app/api/docs/abc123

# With password:
curl https://mdfy.app/api/docs/abc123 \\
  -H "x-document-password: mysecret"`}</CodeBlock>

            <SubLabel>Request - JavaScript</SubLabel>
            <CodeBlock lang="javascript">{`const res = await fetch("https://mdfy.app/api/docs/abc123");
const doc = await res.json();`}</CodeBlock>

            <SubLabel>Request - Python</SubLabel>
            <CodeBlock lang="python">{`import requests

res = requests.get("https://mdfy.app/api/docs/abc123")
doc = res.json()`}</CodeBlock>

            <SubLabel>응답 200</SubLabel>
            <CodeBlock lang="json">{`{
  "id": "abc123",
  "title": "My Document",
  "markdown": "# Hello World\\nThis is my document.",
  "created_at": "2026-04-15T00:00:00Z",
  "updated_at": "2026-04-15T01:00:00Z",
  "view_count": 42,
  "is_draft": false,
  "editMode": "token",
  "isOwner": true,
  "editToken": "tok_...",
  "hasPassword": false
}`}</CodeBlock>
          </EndpointBlock>

          {/* ─── PATCH /api/docs/{id} ─── */}
          <EndpointBlock
            id="patch-docs-id"
            method="PATCH"
            path="/api/docs/{id}"
            description="문서를 수정합니다. edit token 또는 소유자 인증이 필요합니다. 내용 수정, 소프트 삭제, 토큰 갱신, 편집 모드 변경 등 여러 작업을 지원합니다."
          >
            <SubLabel>매개변수</SubLabel>
            <div style={{ marginBottom: 24 }}>
              <ParamRow name="editToken" type="string" required>
                생성 시 반환된 edit token (token 모드에서 필수).
              </ParamRow>
              <ParamRow name="markdown" type="string">
                새 Markdown 내용.
              </ParamRow>
              <ParamRow name="title" type="string">
                새 문서 제목.
              </ParamRow>
              <ParamRow name="isDraft" type="boolean">
                임시 저장과 게시 상태를 전환합니다.
              </ParamRow>
              <ParamRow name="action" type="string">
                특수 작업: <InlineCode>{"soft-delete"}</InlineCode>, <InlineCode>{"rotate-token"}</InlineCode>.
              </ParamRow>
              <ParamRow name="changeSummary" type="string">
                변경 사항을 설명하는 버전 노트.
              </ParamRow>
              <ParamRow name="editMode" type="string">
                편집 모드 변경: <InlineCode>{"token"}</InlineCode>, <InlineCode>{"anyone"}</InlineCode>, <InlineCode>{"authenticated"}</InlineCode>.
              </ParamRow>
            </div>

            <SubLabel>Request - curl (내용 수정)</SubLabel>
            <CodeBlock lang="bash">{`curl -X PATCH https://mdfy.app/api/docs/abc123 \\
  -H "Content-Type: application/json" \\
  -d '{
    "editToken": "tok_aBcDeFgH",
    "markdown": "# Updated Content",
    "changeSummary": "Fixed typos"
  }'`}</CodeBlock>

            <SubLabel>Request - curl (소프트 삭제)</SubLabel>
            <CodeBlock lang="bash">{`curl -X PATCH https://mdfy.app/api/docs/abc123 \\
  -H "Content-Type: application/json" \\
  -d '{
    "editToken": "tok_aBcDeFgH",
    "action": "soft-delete"
  }'`}</CodeBlock>

            <SubLabel>Request - JavaScript</SubLabel>
            <CodeBlock lang="javascript">{`const res = await fetch("https://mdfy.app/api/docs/abc123", {
  method: "PATCH",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    editToken: "tok_aBcDeFgH",
    markdown: "# Updated Content",
  }),
});`}</CodeBlock>

            <SubLabel>Request - Python</SubLabel>
            <CodeBlock lang="python">{`import requests

res = requests.patch("https://mdfy.app/api/docs/abc123", json={
    "editToken": "tok_aBcDeFgH",
    "markdown": "# Updated Content",
})`}</CodeBlock>

            <SubLabel>응답 200</SubLabel>
            <CodeBlock lang="json">{`{
  "success": true,
  "id": "abc123",
  "updated_at": "2026-04-15T02:00:00Z"
}`}</CodeBlock>
          </EndpointBlock>

          {/* ─── HEAD /api/docs/{id} ─── */}
          <EndpointBlock
            id="head-docs-id"
            method="HEAD"
            path="/api/docs/{id}"
            description="문서의 마지막 수정 시각을 확인합니다. x-updated-at 응답 헤더를 반환합니다. 전체 내용을 다운로드하지 않고 동기화 폴링에 유용합니다."
          >
            <SubLabel>Request - curl</SubLabel>
            <CodeBlock lang="bash">{`curl -I https://mdfy.app/api/docs/abc123

# Response headers:
# x-updated-at: 2026-04-15T01:00:00Z
# x-content-length: 1234`}</CodeBlock>

            <SubLabel>Request - JavaScript</SubLabel>
            <CodeBlock lang="javascript">{`const res = await fetch("https://mdfy.app/api/docs/abc123", {
  method: "HEAD",
});
const updatedAt = res.headers.get("x-updated-at");`}</CodeBlock>

            <SubLabel>Request - Python</SubLabel>
            <CodeBlock lang="python">{`import requests

res = requests.head("https://mdfy.app/api/docs/abc123")
updated_at = res.headers["x-updated-at"]`}</CodeBlock>
          </EndpointBlock>

          {/* ─── GET /api/user/documents ─── */}
          <EndpointBlock
            id="get-user-documents"
            method="GET"
            path="/api/user/documents"
            description="사용자가 소유한 모든 문서를 조회합니다. 헤더를 통한 사용자 식별이 필요합니다."
          >
            <SubLabel>헤더</SubLabel>
            <div style={{ marginBottom: 24 }}>
              <ParamRow name="x-user-id" type="string" required>
                사용자 UUID. 또는 <InlineCode>{"x-user-email"}</InlineCode> 또는 <InlineCode>{"Authorization: Bearer"}</InlineCode>를 사용할 수 있습니다.
              </ParamRow>
            </div>

            <SubLabel>Request - curl</SubLabel>
            <CodeBlock lang="bash">{`curl https://mdfy.app/api/user/documents \\
  -H "x-user-id: user-uuid-here"`}</CodeBlock>

            <SubLabel>Request - JavaScript</SubLabel>
            <CodeBlock lang="javascript">{`const res = await fetch("https://mdfy.app/api/user/documents", {
  headers: { "x-user-id": "user-uuid-here" },
});
const { documents } = await res.json();`}</CodeBlock>

            <SubLabel>Request - Python</SubLabel>
            <CodeBlock lang="python">{`import requests

res = requests.get("https://mdfy.app/api/user/documents",
    headers={"x-user-id": "user-uuid-here"})
documents = res.json()["documents"]`}</CodeBlock>

            <SubLabel>응답 200</SubLabel>
            <CodeBlock lang="json">{`{
  "documents": [
    {
      "id": "abc123",
      "title": "My Document",
      "created_at": "2026-04-15T00:00:00Z",
      "updated_at": "2026-04-15T01:00:00Z",
      "is_draft": false,
      "view_count": 42
    }
  ]
}`}</CodeBlock>
          </EndpointBlock>

          {/* ─── POST /api/upload ─── */}
          <EndpointBlock
            id="post-upload"
            method="POST"
            path="/api/upload"
            description="이미지 파일을 업로드합니다. 공개 URL을 반환합니다. file 필드가 포함된 multipart form-data를 사용합니다."
          >
            <SubLabel>Request - curl</SubLabel>
            <CodeBlock lang="bash">{`curl -X POST https://mdfy.app/api/upload \\
  -F "file=@screenshot.png"`}</CodeBlock>

            <SubLabel>Request - JavaScript</SubLabel>
            <CodeBlock lang="javascript">{`const form = new FormData();
form.append("file", fileBlob, "screenshot.png");

const res = await fetch("https://mdfy.app/api/upload", {
  method: "POST",
  body: form,
});
const { url } = await res.json();`}</CodeBlock>

            <SubLabel>Request - Python</SubLabel>
            <CodeBlock lang="python">{`import requests

with open("screenshot.png", "rb") as f:
    res = requests.post("https://mdfy.app/api/upload",
        files={"file": f})
url = res.json()["url"]`}</CodeBlock>

            <SubLabel>응답 200</SubLabel>
            <CodeBlock lang="json">{`{
  "url": "https://storage.mdfy.app/uploads/screenshot.png"
}`}</CodeBlock>
          </EndpointBlock>

          {/* ─── 인증 ─── */}
          <SectionHeading id="authentication">인증</SectionHeading>
          <p
            style={{
              fontSize: 14,
              color: "var(--text-muted)",
              lineHeight: 1.7,
              marginBottom: 24,
              maxWidth: 640,
            }}
          >
            mdfy.app는 점진적 인증 방식을 사용합니다. 기본 작업은 인증이 필요 없습니다.
            고급 기능은 edit token 또는 사용자 식별 정보를 사용합니다.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))",
              gap: 16,
              marginBottom: 24,
            }}
          >
            {[
              {
                title: "인증 불필요",
                desc: "POST /api/docs와 GET /api/docs/{id}는 인증 없이 동작합니다. 반환된 editToken이 소유권 증명이 됩니다.",
              },
              {
                title: "Edit token",
                desc: "모든 문서는 생성 시 editToken을 받습니다. PATCH 요청 시 이 토큰을 포함하여 수정하거나 삭제합니다. MCP 서버와 CLI는 토큰을 자동으로 관리합니다.",
              },
              {
                title: "사용자 식별",
                desc: "사용자 범위 작업(목록 조회, 소유권 확인)에는 x-user-id 헤더, x-user-email 헤더, 또는 Authorization: Bearer JWT 토큰을 제공합니다.",
              },
              {
                title: "MCP / CLI 인증",
                desc: "MCP 서버와 CLI 모두 mdfy login의 JWT를 사용합니다. 실행: npm install -g mdfy-cli && mdfy login",
              },
            ].map((item) => (
              <div
                key={item.title}
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border-dim)",
                  borderRadius: 14,
                  padding: "24px",
                }}
              >
                <h3
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color: "var(--text-primary)",
                    marginTop: 0,
                    marginBottom: 10,
                  }}
                >
                  {item.title}
                </h3>
                <p
                  style={{
                    fontSize: 13,
                    color: "var(--text-muted)",
                    lineHeight: 1.6,
                    margin: 0,
                  }}
                >
                  {item.desc}
                </p>
              </div>
            ))}
          </div>

          {/* ─── 요청 제한 ─── */}
          <SectionHeading id="rate-limits">요청 제한</SectionHeading>
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border-dim)",
              borderRadius: 14,
              padding: "24px",
              marginBottom: 24,
            }}
          >
            <p
              style={{
                fontSize: 14,
                color: "var(--text-muted)",
                lineHeight: 1.7,
                margin: 0,
              }}
            >
              모든 엔드포인트는 <strong>IP당 분당 10회</strong>로 요청이 제한됩니다.
              제한 초과 시 <InlineCode>{"429 Too Many Requests"}</InlineCode>를 반환합니다.
              응답에 포함된 <InlineCode>{"Retry-After"}</InlineCode> 헤더로 대기 시간(초)을 확인할 수 있습니다.
              최대 문서 크기는 <strong>500KB</strong>입니다.
            </p>
          </div>

          {/* ─── 에러 ─── */}
          <SectionHeading id="errors">에러</SectionHeading>
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border-dim)",
              borderRadius: 14,
              padding: "24px",
              marginBottom: 24,
            }}
          >
            <div style={{ marginBottom: 16 }}>
              <ParamRow name="400" type="error">Bad Request. 필수 필드 누락 또는 잘못된 매개변수.</ParamRow>
              <ParamRow name="401" type="error">Unauthorized. 유효하지 않거나 누락된 edit token / 인증 정보.</ParamRow>
              <ParamRow name="403" type="error">Forbidden. 비밀번호가 필요하거나 비밀번호가 틀림.</ParamRow>
              <ParamRow name="404" type="error">Not Found. 문서가 존재하지 않거나 삭제됨.</ParamRow>
              <ParamRow name="410" type="error">Gone. 문서가 만료됨.</ParamRow>
              <ParamRow name="429" type="error">Too Many Requests. 요청 제한 초과.</ParamRow>
              <ParamRow name="500" type="error">Internal Server Error. 다시 시도하거나 지원팀에 문의해 주세요.</ParamRow>
            </div>
            <SubLabel>에러 응답 형식</SubLabel>
            <CodeBlock lang="json">{`{
  "error": "Document not found",
  "status": 404
}`}</CodeBlock>
          </div>
        </main>
      </div>

      <DocsFooter breadcrumb="REST API" />
    </div>
  );
}
