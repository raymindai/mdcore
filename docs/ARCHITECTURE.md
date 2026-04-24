# mdcore Engine Architecture Decision

> “유니버설 엔진”이 되려면 뭘로 만들어야 하는가?
>
> Last updated: 2026-03-23
>
> ⚠️ **전략 업데이트 (2026-03-23)**: 기술 결정(Rust/WASM/comrak)은 전부 유효.
> 변경된 것은 우선순위: 엔진 표면 확장(npm, CLI, VS Code 등)보다 **mdfy.cc 바이럴 루프**(뱃지 + Chrome 익스텐션)를 먼저 완성.
> 컴파일 타겟에 **macOS QuickLook** (aarch64-apple-darwin)도 추가됨.
> 상세: `updatedDirection.md` v5.0 참조.

---

## 핵심 결론: Rust

**Rust core → 다중 타겟 컴파일**이 유일한 정답이다.

TypeScript로는 “제품”을 만들 수 있다. Rust로는 “인프라”를 만든다.
mdcore의 비전이 “AI와 사람 사이의 콘텐츠 인프라”라면, 인프라의 언어로 만들어야 한다.

---

## 왜 Rust인가: Surface Map × Compilation Target 매핑

| #   | Surface                | 실행환경       | 필요한 컴파일 타겟     | TypeScript     | Rust               |
| --- | ---------------------- | -------------- | ---------------------- | -------------- | ------------------ |
| 1   | mdfy.cc (웹 제품)      | Browser        | WASM / JS              | ✅             | ✅ WASM            |
| 2   | @mdcore/engine (npm)   | Node.js        | Native addon / WASM    | ✅             | ✅ napi-rs         |
| 3   | @mdcore/terminal (CLI) | OS native      | 독립 바이너리          | ❌ Node 필요   | ✅ 단일 바이너리   |
| 4   | VS Code 확장           | Node + Web     | JS / WASM              | ✅             | ✅ 둘 다           |
| 5   | WASM 모듈              | 어디서나       | wasm32                 | ❌ 직접 불가   | ✅ 네이티브        |
| 6   | Obsidian 플러그인      | Electron       | JS                     | ✅             | ✅ WASM            |
| 7   | Email 렌더러           | Server         | Node / Native          | ✅             | ✅                 |
| 8   | GitHub Action          | Docker/Node    | 바이너리 / JS          | ✅             | ✅                 |
| 9   | Slack App              | Server         | API 서버               | ✅             | ✅                 |
| 10  | Raycast 확장           | Node.js        | JS                     | ✅             | ✅ napi-rs         |
| 11  | Mobile SDK             | iOS/Android    | Swift FFI / Kotlin JNI | ❌ 브릿지 필요 | ✅ UniFFI          |
| 12  | Cloudflare Workers     | Edge           | WASM                   | ❌ 제한적      | ✅ WASM            |
| 13  | Deno                   | Runtime        | WASM / ESM             | ⚠️ 호환이슈    | ✅ WASM 1st class  |
| 14  | macOS Quick Look       | Swift + WebKit | WASM (WebKit 내)       | ❌ 불가        | ✅ WASM via WebKit |

**결론**: TypeScript는 11/14 표면에서 “돌아가긴” 하지만, 4개 핵심 표면(CLI, Mobile, Edge, macOS Quick Look)에서 구조적 한계가 있다. Rust는 14/14 모두 네이티브로 커버한다.

---

## 실제 선례: “한 언어 → 모든 곳” 패턴

| 프로젝트    | 코어 언어 | 배포 채널                               | 교훈                                         |
| ----------- | --------- | --------------------------------------- | -------------------------------------------- |
| SWC         | Rust      | npm (napi-rs) + WASM + CLI              | 20x faster than Babel. Next.js 기본 컴파일러 |
| Biome       | Rust      | CLI + VS Code (LSP) + WASM (Playground) | 하나의 Service Layer → 3개 인터페이스        |
| Typst       | Rust      | WASM (웹 에디터) + CLI (네이티브)       | 과학 문서 조판. Leptos로 웹 렌더링           |
| tree-sitter | C/Rust    | WASM + 네이티브 바인딩                  | VS Code, Zed, Neovim 전부 사용               |
| Turbopack   | Rust      | Next.js 내장 (v16 기본값)               | 700x faster than Webpack                     |

**공통점**: 전부 Rust(또는 C) 코어 → WASM + napi-rs + 네이티브 바이너리 패턴.

---

## Rust MD 생태계 현황

### 파서 후보

| 라이브러리       | CommonMark | GFM     | MDX | 확장성                    | 사용처                       |
| ---------------- | ---------- | ------- | --- | ------------------------- | ---------------------------- |
| comrak           | ✅ 0.31.2  | ✅ 전체 | ❌  | 커스텀 포매터, 하이라이터 | GitLab, crates.io, Reddit    |
| pulldown-cmark   | ✅ 0.31    | ⚠️ 부분 | ❌  | 이벤트 기반               | Rust 생태계 표준             |
| markdown-rs      | ✅         | ✅      | ✅  | micromark 아키텍처        | Vercel 후원, unified.js 연계 |
| markdown-it-rust | ✅         | ⚠️      | ❌  | 플러그인 시스템           | markdown-it 포트             |

### 추천 조합

```text
Core Parser:   comrak (GFM 완전 지원, 프로덕션 검증)
MDX 지원:      markdown-rs (Vercel 후원, MDX 네이티브)
하이라이팅:    tree-sitter 또는 syntect (Rust 네이티브)
수학:          KaTeX WASM 또는 자체 TeX 파서
다이어그램:    mermaid-js (WASM 아님, JS로 유지)

```

---

## 아키텍처 설계

### 레이어 구조

```text
┌─────────────────────────────────────────────────────────────────────┐
│                        Consumer Layer (JS/TS)                       │
│   mdfy.cc (React)  │  @mdcore/sdk (npm)  │  VS Code  │  Obsidian  │
└──────────┬──────────┴──────────┬──────────┴─────┬─────┴─────┬──────┘
           │                     │                │           │
     ┌─────┴─────────────────────┴────────────────┴───────────┴──────┐
     │                     Binding Layer                              │
     │   WASM (browser/edge)  │  napi-rs (Node)  │  UniFFI (mobile)  │
     └──────────┬─────────────┴──────────┬────────┴──────────┬───────┘
                │                        │                   │
     ┌──────────┴────────────────────────┴───────────────────┴───────┐
     │                     mdcore-engine (Rust)                       │
     │                                                                │
     │   ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐ │
     │   │  Parser   │  │ Renderer │  │Converter │  │Flavor Detect │ │
     │   │ (comrak)  │  │ (custom) │  │ (X↔MD)   │  │  (auto)      │ │
     │   └──────────┘  └──────────┘  └──────────┘  └──────────────┘ │
     │                                                                │
     │   ┌──────────┐  ┌──────────┐  ┌──────────┐                   │
     │   │Highlight │  │  Math    │  │  AST     │                   │
     │   │(syntect) │  │ (TeX)    │  │ (mdast)  │                   │
     │   └──────────┘  └──────────┘  └──────────┘                   │
     └────────────────────────────────────────────────────────────────┘

```

### 핵심 설계 원칙

1. **Zero-copy AST**: Rust 소유권 시스템으로 메모리 복사 최소화
2. **Plugin via Trait**: `trait MdPlugin { fn transform(&self, ast: &mut MdAst); }` — 코어 건드리지 않고 확장
3. **WASM-first 렌더링**: 브라우저에서는 항상 WASM, Node에서는 napi-rs (WASM fallback)
4. **Streaming parser**: 대용량 문서도 첫 토큰부터 렌더 시작 (pulldown-cmark 이벤트 모델)

---

## 컴파일 & 배포 매트릭스

```text
                        mdcore-engine (Rust 소스코드)
                                    │
            ┌───────────────────────┼───────────────────────┐
            │                       │                       │
      wasm-bindgen              napi-rs                cargo build
            │                       │                       │
     ┌──────┴──────┐        ┌──────┴──────┐         ┌──────┴──────┐
     │    WASM     │        │   Native    │         │   Binary    │
     │   (.wasm)   │        │   (.node)   │         │  (ELF/Mach) │
     └──────┬──────┘        └──────┬──────┘         └──────┬──────┘
            │                       │                       │
     ┌──────┼──────┐        ┌──────┴──────┐         ┌──────┴──────┐
     │      │      │        │             │         │             │
  Browser  Edge   Deno    Node.js      Raycast    CLI        GitHub
  mdfy.cc  CF     import  @mdcore/     Extension  @mdcore/   Action
           Worker         engine                  terminal
                                                  brew install

```

### npm 패키지 구조 (SWC 패턴)

```text
@mdcore/engine                    ← 메인 패키지 (JS wrapper + 타입)
@mdcore/engine-linux-x64-gnu      ← Linux x64 네이티브
@mdcore/engine-linux-arm64-gnu    ← Linux ARM64
@mdcore/engine-darwin-x64         ← macOS Intel
@mdcore/engine-darwin-arm64       ← macOS Apple Silicon
@mdcore/engine-win32-x64-msvc     ← Windows
@mdcore/engine-wasm               ← WASM fallback (모든 플랫폼)

```

설치 시 OS/Arch 감지 → 맞는 네이티브 패키지 자동 선택. 없으면 WASM fallback.

---

## TypeScript가 아닌 이유

“TypeScript로 먼저 빠르게 만들고 나중에 Rust로 갈아타자”는 위험하다:

| 항목               | TS 먼저 → Rust 나중에        | Rust 처음부터           |
| ------------------ | ---------------------------- | ----------------------- |
| Phase 1 속도       | ⚡ 빠름 (2-3주)              | 🐢 느림 (4-6주)         |
| Phase 2 전환 비용  | 💀 전면 재작성               | ✅ 없음                 |
| API 호환성         | ⚠️ 갈아탈 때 breaking change | ✅ 처음부터 안정        |
| CLI 배포           | Node 런타임 필요             | 단일 바이너리           |
| 외부 기여자 인식   | “또 하나의 JS 래퍼”          | “진짜 인프라”           |
| npm 다운로드 성능  | JS 속도                      | 25x 빠름 (Unifast 기준) |
| 경쟁사 모방 난이도 | 쉬움                         | 어려움 (Rust 모트)      |

**가장 위험한 시나리오**: TS로 MVP 만듦 → 유저 모임 → Rust 재작성 필요 → API 호환성 깨짐 → 유저 이탈. SWC가 Babel을 이긴 이유는 “점진적 교체”가 아니라 “처음부터 Rust”였기 때문.

---

## 하지만 현실적으로: 솔로 파운더 + Rust

**걱정**: “Rust 러닝커브가 높지 않나?”

**답변**: mdcore 엔진의 80%는 이미 존재한다.

```text
직접 만들어야 하는 것:
├── Flavor detection logic (~500줄)
├── Renderer customization layer (~1000줄)
├── X→MD converter wrappers (~800줄)
├── WASM binding glue (~200줄)
└── napi-rs binding glue (~200줄)

이미 존재하는 것 (가져다 쓰는 것):
├── comrak → 파싱 + GFM 전체
├── syntect → 코드 하이라이팅
├── pulldown-cmark → 스트리밍 파서 (대용량용)
├── wasm-bindgen → WASM 컴파일
├── napi-rs → Node 바인딩
└── serde → JSON 직렬화

```

실질적으로 작성해야 하는 Rust 코드는 **~2,700줄** 정도. 나머지는 설정과 glue code.

---

## Phase별 실행 계획

### Phase 1 (Week 1-4): Core Engine + WASM

```text
Week 1: Rust 프로젝트 셋업
  - cargo new mdcore-engine --lib
  - comrak 통합, 기본 파싱/렌더링
  - Flavor detection (GFM, Obsidian, MDX, Pandoc)
  - 테스트 스위트 (CommonMark spec tests)

Week 2: WASM 컴파일 + 웹 통합
  - wasm-bindgen 셋업
  - parse(md) → HTML 함수 WASM으로 노출
  - mdfy.cc (Next.js)에서 WASM import
  - 렌더링 커스터마이징 (테마, 스타일)

Week 3: napi-rs + npm 패키지
  - napi-rs 바인딩
  - @mdcore/engine npm 패키지 첫 배포
  - 플랫폼별 prebuild (linux-x64, darwin-arm64, wasm)
  - TypeScript 타입 정의 자동 생성

Week 4: mdfy.cc MVP
  - Next.js + WASM 엔진 통합
  - 입력 → 렌더링 → 공유 기본 플로우
  - Shiki (하이라이팅), KaTeX (수학), Mermaid (다이어그램)은 JS로 유지
  - Vercel 배포

```

### Phase 2 (Week 5-8): 확장 표면

```text
- @mdcore/terminal (CLI) — cargo build로 네이티브 바이너리
- VS Code 확장 — WASM 번들
- X→MD 변환기 — HTML/PDF/DOCX → MD
- Interactive editing layer — JS/React (WASM 엔진 위)

```

### Phase 3 (Week 9-12): 생태계

```text
- Obsidian 플러그인
- GitHub Action
- Mobile SDK (UniFFI → Swift/Kotlin)
- Canvas mode (tldraw + WASM 엔진)

```

---

## Mermaid: WASM이 아닌 JS로 유지하는 것들

모든 것을 Rust로 만들 필요는 없다. 렌더링의 **일부 레이어**는 JS가 더 적합:

| 컴포넌트              | 언어                 | 이유                                   |
| --------------------- | -------------------- | -------------------------------------- |
| MD 파싱 + AST         | Rust                 | 성능, 유니버설                         |
| HTML 렌더링           | Rust                 | 코어 기능                              |
| Flavor 감지           | Rust                 | 코어 기능                              |
| X↔MD 변환             | Rust                 | 코어 기능                              |
| Syntax highlighting   | JS (highlight.js)    | syntect는 WASM 불가, Shiki보다 경량    |
| Math (KaTeX)          | JS                   | 브라우저 DOM 필요                      |
| Diagrams (Mermaid)    | JS                   | SVG 렌더링, DOM 의존                   |
| Interactive editing   | JS/React             | UI 레이어                              |
| Mermaid visual editor | JS/React (자체 구현) | tldraw 대신 경량 캔버스. 외부 의존성 0 |
| HTML → MD 변환        | JS (Turndown)        | 붙여넣기 자동 감지                     |
| 테마/스타일           | CSS/TailwindCSS      | 스타일은 코드 아님                     |

**원칙**: “데이터를 다루는 것은 Rust, 화면을 다루는 것은 JS”

---

## 최종 기술 스택

```text
┌─────────────── mdcore tech stack ───────────────────────┐
│                                                          │
│  CORE (Rust)                                             │
│  ├── comrak          — MD 파싱 (GFM)                     │
│  ├── pulldown-cmark  — 스트리밍 파싱 (대용량)              │
│  ├── syntect         — 코드 하이라이팅 (서버/CLI용)        │
│  ├── serde           — JSON 직렬화                       │
│  ├── wasm-bindgen    — WASM 바인딩                       │
│  └── napi-rs         — Node.js 네이티브 바인딩             │
│                                                          │
│  BINDING                                                 │
│  ├── @mdcore/engine  — npm 메인 패키지 (TS 타입)          │
│  ├── @mdcore/wasm    — WASM 번들 (브라우저/Edge)          │
│  └── uniffi          — iOS/Android 바인딩 (Phase 3)      │
│                                                          │
│  PRODUCT (TypeScript/React)                              │
│  ├── Next.js 15      — mdfy.cc 웹앱                     │
│  ├── TailwindCSS     — 스타일링                          │
│  ├── shadcn/ui       — UI 컴포넌트                       │
│  ├── Shiki           — 코드 하이라이팅 (브라우저)          │
│  ├── KaTeX           — 수학 렌더링                       │
│  ├── Mermaid         — 다이어그램                        │
│  ├── tldraw          — Canvas mode (Phase 2)             │
│  └── Supabase        — Auth, DB, Storage                 │
│                                                          │
│  INFRA                                                   │
│  ├── Vercel          — 프론트엔드 배포                    │
│  ├── Cloudflare Workers — Edge WASM 실행                 │
│  ├── GitHub Actions  — CI/CD + 멀티플랫폼 빌드           │
│  └── crates.io       — Rust 크레이트 배포                 │
│                                                          │
└──────────────────────────────────────────────────────────┘

```

---

## 이것이 만드는 모트(Moat)

1. **기술 모트**: Rust로 작성된 MD 엔진을 JS로 복제하는 것은 수개월~수년. JS 엔진을 Rust로 대체하는 것도 마찬가지. 먼저 Rust로 가는 쪽이 이김.
2. **배포 모트**: 하나의 코어가 13개 표면에 동시 배포. 경쟁자는 각 표면마다 별도 구현 필요.
3. **성능 모트**: WASM 엔진이 JS 대비 3-25x 빠름. 대용량 문서에서 체감 차이 극명.
4. **인식 모트**: “Rust로 만든 인프라”는 개발자 커뮤니티에서 “진짜”로 인식됨. SWC, Biome, Turbopack이 증명.

---

_“Infrastructure should be written in infrastructure languages.”_
_— mdcore의 기술 철학_
