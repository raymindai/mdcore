# CLAUDE.md — mdcore/mdfy Project Context


> 이 파일은 Claude Code CLI가 자동으로 읽는 프로젝트 컨텍스트 파일이다.
> 프로젝트에 대한 모든 핵심 정보를 담고 있다.

---

#### 

#### Vision

**“The fastest way from thought to shared document.”**

AI 출력물의 크로스플랫폼 퍼블리싱 레이어. Markdown은 엔진이지 인터페이스가 아니다.
사용자는 MD를 몰라도 된다. AI 회사가 구조적으로 복제 불가능한 포지션(크로스 AI 레이어).
핵심 해자: 바이럴 뱃지(“Published with mdfy.app”) + 크로스 AI + 렌더링 품질.
상세 전략: `docs/updatedDirection.md` v5.0 참조.

## 팀

- 파운더 1명 (Hyunsang, [hi@raymind.ai](mailto:hi@raymind.ai)) + AI(Claude) 페어 프로그래밍
- 풀타임, 의사결정 즉시, 한 번에 하나만 제대로

## 도메인

- **mdfy.app** — 핵심 제품 (현재 라이브, Vercel 자동 배포)
- **mdfy.online** — mdfy.app로 리다이렉트 (보조)
- **mdcore.ai** — 기술 플랫폼 & API (Phase 3)
- **mdcore.org** — 오픈소스 커뮤니티 (Phase 2)
- **mdcore.md** — 스펙 문서 & 플레이그라운드 (Phase 4)

## GitHub

- **Repo**: `raymindai/mdcore`
- **CI**: GitHub Actions (test-engine → build-wasm → build-web)
- **Deploy**: Vercel 자동 배포, push하면 mdfy.app에 반영

---

## 프로젝트 구조

```text
mdcore/
├── packages/
│   ├── engine/              # Rust 엔진 (comrak 기반)
│   │   ├── Cargo.toml
│   │   └── src/
│   │       ├── lib.rs       # WASM 바인딩 (wasm-bindgen)
│   │       ├── render.rs    # 핵심 렌더링 로직 (comrak → HTML)
│   │       └── flavor.rs    # Markdown flavor 감지
│   ├── mdcore/              # @mdcore/engine npm 패키지 (TypeScript)
│   │   ├── tsup.config.ts   # 빌드 설정 (WASM binary → dist/ 복사)
│   │   ├── wasm/            # WASM 빌드 출력 (engine에서 빌드)
│   │   └── src/
│   │       ├── index.ts     # mdcore 객체 + re-exports
│   │       ├── types.ts     # FlavorInfo, RenderResult, RenderOptions 등
│   │       ├── postprocess.ts  # highlight.js + KaTeX + ASCII 다이어그램
│   │       ├── mermaid-style.ts # Mermaid SVG 후처리
│   │       ├── html-to-md.ts   # HTML → Markdown (Turndown)
│   │       ├── ai-conversation.ts # AI 대화 감지 + 포맷
│   │       ├── cli-to-md.ts    # CLI 출력 → Markdown
│   │       └── file-import.ts  # 다중 포맷 파일 임포트
│   ├── styles/              # @mdcore/styles (CSS 전용)
│   │   └── src/
│   │       ├── index.css    # 메인 엔트리 (전체 임포트)
│   │       ├── theme-dark.css  # 다크 테마 변수 (기본)
│   │       ├── theme-light.css # 라이트 테마 변수
│   │       ├── rendered.css # .mdcore-rendered 문서 스타일
│   │       ├── code.css     # highlight.js 라이트 모드 오버라이드
│   │       ├── diagram.css  # Mermaid + ASCII 컨테이너
│   │       └── print.css    # 인쇄 / PDF 내보내기 스타일
│   ├── api/                 # @mdcore/api (HTTP 클라이언트)
│   │   └── src/
│   │       ├── client.ts    # MdfyClient 클래스 + MdfyApiError
│   │       ├── documents.ts # 독립 실행 함수 (publish, pull, update 등)
│   │       ├── upload.ts    # 이미지 업로드
│   │       └── types.ts     # TypeScript 인터페이스
│   └── ai/                  # @mdcore/ai (AI 프로바이더)
│       └── src/
│           ├── mdfy-text.ts     # 원시 텍스트 → 구조화된 Markdown
│           ├── ascii-render.ts  # ASCII/Mermaid → 스타일드 HTML
│           ├── conversation.ts  # AI 대화 감지 + 파싱
│           ├── config.ts        # 기본 모델, 온도, 토큰 설정
│           └── providers/       # Gemini, OpenAI, Anthropic
├── apps/
│   ├── web/                 # Next.js 15 웹앱 (mdfy.app)
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── layout.tsx      # 루트 레이아웃 (FOUC 방지 + Analytics)
│   │   │   │   ├── globals.css     # 다크/라이트 테마 CSS 변수 + print CSS
│   │   │   │   ├── page.tsx
│   │   │   │   ├── about/page.tsx  # About 페이지 (매니페스토, 기술스택)
│   │   │   │   ├── api/docs/       # 문서 CRUD API (POST, GET, PATCH, DELETE)
│   │   │   │   ├── api/og/         # OG 이미지 동적 생성 (@vercel/og)
│   │   │   │   ├── d/[id]/         # SSR 뷰어 (OG 메타태그 + 비밀번호 보호)
│   │   │   │   └── embed/[id]/     # Embed 뷰어 (iframe용)
│   │   │   ├── components/
│   │   │   │   ├── MdEditor.tsx    # 메인 에디터 컴포넌트
│   │   │   │   └── MdCanvas.tsx    # Mermaid 비주얼 에디터 (캔버스)
│   │   │   └── lib/
│   │   │       ├── engine.ts       # WASM 엔진 로더
│   │   │       ├── share.ts        # URL 공유 (short URL + hash fallback + editToken)
│   │   │       ├── supabase.ts     # Supabase 서버 클라이언트
│   │   │       ├── rate-limit.ts   # IP 기반 레이트 리밋
│   │   │       ├── canvas-to-mermaid.ts # 캔버스 → Mermaid 코드 변환
│   │   │       └── wasm/           # WASM 바인딩 (빌드 산출물)
│   │   └── package.json
│   ├── vscode-extension/    # VS Code 익스텐션
│   └── chrome-extension/    # 크롬 익스텐션 (ChatGPT/Claude/Gemini/GitHub → mdfy.app)
├── docs/
│   ├── PACKAGES.md          # 패키지 아키텍처 가이드
│   ├── MANIFESTO.md         # 프로젝트 매니페스토
│   ├── ARCHITECTURE.md      # 기술 아키텍처 결정 문서
│   ├── ROADMAP.md           # 제품 로드맵 v2 (Phase 0~4)
│   └── MASTER-PLAN.md       # 마스터 플랜
├── .github/workflows/
│   ├── ci.yml               # CI 파이프라인
│   └── rebuild-wasm.yml     # WASM 수동 리빌드
├── vercel.json
└── package.json

```

---

## 기술 스택 & 아키텍처

### Core: Rust → WASM

- **comrak** — Rust Markdown 파서 (GFM 전체 지원, GitLab/Reddit 사용)
- **wasm-bindgen** — Rust → WASM 컴파일
- **wasm-pack** — `--target bundler`로 빌드, `--release` 모드

### 중요: syntect는 제거됨

syntect의 onig C 라이브러리가 `wasm32-unknown-unknown` 타겟에서 컴파일 불가능하여 제거.
코드 하이라이팅은 프론트엔드에서 **highlight.js**로 처리.

### 중요: wasm-opt 비활성화

현재 wasm-opt 버전이 Rust WASM의 bulk memory operations를 지원하지 않음.
Cargo.toml에 `[package.metadata.wasm-pack.profile.release] wasm-opt = false` 설정.

### Frontend: Next.js 15

- **highlight.js** — 코드 하이라이팅 (github-dark 테마, 라이트 모드는 CSS 오버라이드)
- **KaTeX** — 수학 렌더링
- **Mermaid** — 다이어그램 (동적 import, 테마별 변수)
- **TailwindCSS** — 스타일링

### 렌더링 파이프라인

```text
사용자 입력 (Markdown)
  → WASM 엔진 (comrak, Rust)
    → 원시 HTML 출력
      → postprocess.ts:
        1. highlightCode() — highlight.js로 <pre lang="..."> 처리
        2. processKatex() — <span data-math-style> → KaTeX 렌더링
        3. processMermaid() — <pre lang="mermaid"> → mermaid-container div
        4. addCodeCopyButtons() — 복사 버튼 추가
      → MdEditor.tsx의 React state에 반영
        → Mermaid: useEffect에서 mermaid.js 동적 렌더링

```

### comrak 출력 형식 (중요!)

`github_pre_lang: true` 설정으로 comrak은 다음 형식으로 출력:

- 코드 블록: `<pre lang="rust"><code>...</code></pre>` (NOT `<code class="language-rust">`)
- 수학: `<span data-math-style="inline">...</span>`, `<span data-math-style="display">...</span>`
- postprocess.ts의 regex는 이 형식에 맞춰져 있음. 변경 시 주의!

---

## 패키지 구조

5개의 독립 패키지로 구성. 각 패키지는 *별도로* 설치/사용 가능. 상세: `docs/PACKAGES.md` 참조.

| 패키지 | npm 이름 | 설명 | 의존성 |
| --- | --- | --- | --- |
| packages/engine | (Rust crate) | comrak 기반 Markdown 파서, WASM 컴파일 | Rust only |
| packages/mdcore | @mdcore/engine | WASM 래퍼 + postprocess (highlight.js, KaTeX) + 파일 임포트 | highlight.js, katex, turndown |
| packages/styles | @mdcore/styles | CSS 전용 — 다크/라이트 테마, 렌더링 스타일, 인쇄 | 없음 (순수 CSS) |
| packages/api | @mdcore/api | mdfy.app HTTP 클라이언트 (publish, pull, update, delete, versions) | 없음 (native fetch) |
| packages/ai | @mdcore/ai | AI 프로바이더 (Gemini, OpenAI, Anthropic) + mdfyText + asciiToMermaid | 없음 (native fetch) |

### 패키지 간 관계

```text
engine (Rust) → WASM → mdcore (TS) → postprocess → 최종 HTML
styles: CSS 변수 + .mdcore-rendered 스타일 (독립)
api: HTTP 클라이언트 (독립)
ai: AI 호출 (독립)

```

패키지 간 import 없음. 모두 독립적으로 사용 가능.

### 핵심 export

- `@mdcore/engine`: `mdcore.init()`, `mdcore.render()`, `postProcessHtml()`, `htmlToMarkdown()`, `isCliOutput()`, `cliToMarkdown()`, `convertToMarkdown()`
- `@mdcore/styles`: CSS 임포트 (`@import "@mdcore/styles"`)
- `@mdcore/api`: `MdfyClient`, `publish()`, `pull()`, `update()`, `deleteDocument()`, `upload()`
- `@mdcore/ai`: `callAI()`, `mdfyText()`, `asciiToMermaid()`, `isAiConversation()`, `parseConversation()`, `formatConversation()`

---

## 현재 상태 (2026-03-21)

### Phase 1 완료

- Rust 엔진 + WASM 컴파일 + Next.js 통합
- mdfy.app 라이브 배포 (Vercel)
- GFM 전체, KaTeX 수학, Mermaid 다이어그램, 코드 하이라이팅
- 모바일 반응형 레이아웃 (위아래 스플릿 뷰 포함)
- 드래그 앤 드롭 .md 파일 지원
- 짧은 URL 공유 (`mdfy.app/{nanoid}`) — Supabase PostgreSQL 저장
- hash 기반 공유 (fallback, Supabase 미설정 시)
- 다크/라이트 모드 토글 (CSS 변수 시스템, localStorage 저장)
- GitHub Actions CI (test → build-wasm → build-web)
- 문서 수정/삭제 (editToken 기반, 계정 불필요)
- OG 이미지 자동 생성 (@vercel/og)
- Vercel Analytics + Speed Insights
- 레이트 리밋 (IP당 분당 10회)
- QR 코드 공유
- About 페이지 (/about)
- 런칭 포스팅 초안 (docs/launch/)

### Phase 2 완료

- MD → PDF 내보내기 (브라우저 print + 커스텀 print CSS)
- 비밀번호 보호 + 만료 URL (password_hash, expires_at)
- Embed 코드 (iframe, /embed/[id])
- 목적지별 최적화 복사 (Docs/Email용 rich text, Slack용 mrkdwn)
- HTML → MD 변환 (Turndown, 붙여넣기 자동 감지)
- 크롬 익스텐션 (apps/chrome-extension/) — AI 캡처 + GitHub .md 연동
- 체크박스 토글 (렌더링 위에서 클릭 → MD 소스 sync)
- 테이블 셀 편집 (더블클릭 → 인라인 편집 → MD 소스 sync)
- AI 대화 모드 (ChatGPT/Claude 출력 자동 감지 + 정리)
- Mermaid 비주얼 에디터 (캔버스 모드 — 자체 구현, 외부 라이브러리 0)
  - 노드 shape 4종 (round/square/circle/diamond)
  - 엣지 라벨, 방향 전환 (LR/TD)
  - Import: 기존 Mermaid 코드 → 캔버스 로드
  - Generate: 캔버스 → ```mermaid 코드블록
- AI side panel (VS Code + Desktop) — 2x2 그리드 액션 + 채팅 인터페이스
- Document outline panel (all channels) — 헤딩 기반 문서 구조 탐색
- Diff highlight on AI/sync changes — 변경된 블록 오렌지 하이라이트
- Hidden .mdfy.json sidecar files — dot prefix로 워크스페이스 정리, 자동 마이그레이션
- Email notifications (Resend)
- Admin dashboard (/admin)

### 다음 작업 (Updated Direction v5.0)

**즉시 (바이럴 루프 시작):**

- 바이럴 뱃지 (“Published with mdfy.app”) 추가
- 무료 문서 7일 만료 적용
- Chrome 익스텐션 완성 (ChatGPT/Claude/Gemini → 원클릭 캡처)
- AI 감지 + 자동 정리 강화

**Phase 2 (바이럴 확인 후):**

- Stripe 결제 (Pro $8/mo)
- 커스텀 도메인
- 조회 분석 (누가 몇 번 열었나)
- 워터마크 제거 (Pro)

**Phase 3 (매출 확인 후):**

- @mdcore/engine npm 패키지 공개
- mditor WYSIWYG (Writer 모드)
- macOS QuickLook 플러그인
- @mdcore/terminal CLI 렌더러
- API 플랫폼 (mdcore.ai)

---

## 개발 가이드

### 로컬 개발

```bash
# 웹앱 개발 서버
cd apps/web
npm install
npm run dev    # → http://localhost:3000

# Rust 엔진 테스트
cd packages/engine
cargo test     # 16개 테스트 통과해야 함

# WASM 빌드 (Rust 변경 시)
cd packages/engine
wasm-pack build --target bundler --out-dir ../../apps/web/src/lib/wasm --release

```

### 빌드 & 배포

- `git push origin main` → [GitHub](https://) Actions CI 실행 → Vercel 자동 배포
- CI 파이프라인: test-engine → build-wasm → build-web
- Vercel은 `apps/web` 디렉토리 기준으로 빌드
- package-lock.json이 없으므로 `npm ci` 대신 `npm install` 사용

### 코드 수정 시 주의사항

- **render.rs** 수정 후: `cargo test`로 16개 테스트 통과 확인
- **postprocess.ts** 수정 시: comrak의 `github_pre_lang: true` 출력 형식 유지해야 함
- **globals.css** 수정 시: `[data-theme="dark"]`와 `[data-theme="light"]` 양쪽 모두 CSS 변수 추가
- **MdEditor.tsx** 수정 시: 하드코딩 색상 X, CSS 변수(`var(--xxx)`) 사용
- **WASM 관련**: syntect 절대 추가하지 말 것 (WASM 컴파일 불가)

---

## 핵심 원칙

1. **Markdown은 엔진이지 인터페이스가 아니다.** 사용자는 MD를 몰라도 된다.
2. **바이럴 루프가 먼저.** 뱃지 + 공유 = 무료 마케팅. 이것 없이 다른 것 만들지 않는다.
3. **크로스 AI = 구조적 해자.** AI 회사가 절대 복제 못하는 포지션.
4. **제품 1개, 해자 1개.** 확장은 순차적으로.
5. **Web-Native Document.** 문서는 파일이 아니라 URL이다.
6. **Zero friction.** 로그인 없이, 3초 안에 가치 전달.
7. **Build in public.** 1인+AI 팀 자체가 마케팅.

---

## 전략 문서 참조

상세한 계획은 `docs/` 폴더 참조:

- `docs/PACKAGES.md` — 패키지 아키텍처 가이드, 의존성 그래프, 마이그레이션
- `docs/ROADMAP.md` — Phase 0~4 전체 로드맵, 타임라인, KPI, GTM 전략
- `docs/ARCHITECTURE.md` — Rust 선택 근거, Surface Map, 컴파일 타겟 매트릭스
- `docs/MANIFESTO.md` — 프로젝트 철학과 비전
- `docs/MASTER-PLAN.md` — 마스터 플랜

---

## 자주 겪는 문제

| 문제 | 원인 | 해결 |
| --- | --- | --- |
| WASM 빌드 실패 (syntect) | onig C 라이브러리가 wasm32에서 컴파일 불가 | syntect 의존성 제거, highlight.js 사용 |
| WASM 빌드 실패 (bulk memory) | wasm-opt가 bulk memory operations 미지원 | wasm-opt = false 설정 |
| Mermaid가 텍스트로 표시 | postprocess.ts regex가 comrak 출력 형식과 불일치 | 형식에 맞게 regex 수정 |
| CI의 npm ci 실패 | package-lock.json 없음 | npm install 사용 |
| git push 거부 | 원격에 rebuild-wasm workflow가 커밋 생성 | git pull –rebase 후 push |
