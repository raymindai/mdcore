# MDcore — Product Specification v2.0

> **AI 시대의 문서 인프라. 렌더링부터 편집, 공유, 에코시스템까지.**
> "어디서든 같은 품질. 어디서든 같은 경험."
>
> Last updated: 2026-04-06

---

## 1. MDcore란 무엇인가

MDcore는 **AI 문서 인프라의 전체 스택**이다.

렌더링 엔진만이 아니다. 렌더링, 편집, AI 감지, 파일 변환, 공유, 오프라인 — 문서가 만들어지고 소비되는 모든 과정을 하나의 통합된 경험으로 제공한다.

```
MDcore = 렌더링 + 편집 + AI 감지 + 파일 변환 + 공유 + 에코시스템

                    ┌─────────────────────────────────┐
                    │           MDcore                 │
                    │    AI Document Infrastructure    │
                    └──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┘
                       │  │  │  │  │  │  │  │  │  │
         mdfy.app ──────┘  │  │  │  │  │  │  │  │  │
         VS Code ext ─────┘  │  │  │  │  │  │  │  │
         Chrome ext ─────────┘  │  │  │  │  │  │  │
         mdfy for Mac ──────────┘  │  │  │  │  │  │
         QuickLook ────────────────┘  │  │  │  │  │
         @mdcore/engine (npm) ────────┘  │  │  │  │
         @mdcore/terminal (CLI) ─────────┘  │  │  │
         mdcore.ai (API) ───────────────────┘  │  │
         mdcore.org (커뮤니티) ─────────────────┘  │
         mdcore.md (스펙) ─────────────────────────┘
```

모든 표면이 같은 엔진, 같은 렌더링 품질, 같은 편집 경험을 공유한다.
온라인과 오프라인이 끊기지 않는다.

---

## 2. 핵심 원칙

1. **통합된 경험.** 웹에서 편집한 문서를 Mac 앱에서 이어 쓰고, VS Code에서 열고, QuickLook으로 미리보기한다. 어디서든 같다.
2. **최고 수준의 UX.** 각 표면이 그 플랫폼의 네이티브 앱보다 좋아야 한다. 웹은 웹답게, Mac은 Mac답게, VS Code는 VS Code답게.
3. **Markdown은 엔진이지 인터페이스가 아니다.** 사용자는 MD를 몰라도 된다.
4. **온라인/오프라인 연결.** 오프라인에서 만든 문서가 온라인에서 공유되고, 온라인 문서가 오프라인에서 편집된다.
5. **AI-native.** AI 출력을 가장 잘 다루는 도구. 크로스 AI 레이어.

---

## 3. 에코시스템 표면

### 3.1 mdfy.app — 웹 (핵심 제품)

**"Paste. See it beautiful. Share."**

| 기능 | 상태 |
|------|------|
| Markdown 렌더링 (GFM, Obsidian, MDX, Pandoc) | ✅ |
| 코드 하이라이팅, KaTeX 수식, Mermaid 다이어그램 | ✅ |
| 공유 URL (mdfy.app/{id}) | ✅ |
| WYSIWYG 편집 (contentEditable + 소스 싱크) | ✅ |
| AI 대화 감지 + 포맷 | ✅ |
| 파일 임포트 (PDF, DOCX, CSV, LaTeX 등 15+ 포맷) | ✅ |
| 비밀번호 보호 + 만료 URL | ✅ |
| Embed (iframe) | ✅ |
| My Documents + 자동저장 | ✅ |
| 바이럴 뱃지 ("Published with mdfy.app") | 🔜 |
| 유료화 (Pro 티어) | 안정화 후 결정 |

### 3.2 VS Code Extension

**VS Code 안에서 mdfy.app와 동일한 렌더링 + 편집 + 클라우드 싱크.**

| 기능 | 상태 |
|------|------|
| comrak WASM 렌더링 (mdfy.app 동일 엔진) | ✅ |
| WYSIWYG 프리뷰 (contentEditable) | ✅ |
| 양방향 클라우드 싱크 | ✅ |
| Publish to mdfy.app | ✅ |
| CDN 기반 하이라이팅 + KaTeX + Mermaid | ✅ |
| 이미지 업로드 | ✅ |

### 3.3 Chrome Extension

**ChatGPT/Claude/Gemini 출력을 원클릭 캡처 → mdfy.app 문서화.**

| 기능 | 상태 |
|------|------|
| ChatGPT, Claude, Gemini 감지 | ✅ |
| 대화 추출 + Markdown 변환 | ✅ |
| mdfy.app로 전송 | ✅ |
| 컨텍스트 메뉴 (선택 텍스트 캡처) | ✅ |

### 3.4 mdfy for Mac — macOS 네이티브 앱 (계획)

**오프라인 편집 + 클라우드 싱크. Mac 네이티브 경험.**

- Swift + WebKit + mdcore WASM
- 오프라인에서 편집, 온라인 복귀 시 자동 싱크
- Finder 통합 (Quick Actions)
- 메뉴바 앱 (빠른 문서 생성)
- mdfy.app 계정 연동

### 3.5 QuickLook 플러그인 (계획)

**Finder에서 스페이스바 → mdfy.app 품질 프리뷰.**

- .md 파일 선택 → 스페이스바 → KaTeX + Mermaid + 코드 하이라이팅 포함 렌더링
- macOS 시스템 다크/라이트 모드 자동 감지
- "Open in mdfy.app" 버튼
- Swift QLPreviewingController + WebKit + mdcore WASM
- `brew install --cask mdfy-quicklook`

### 3.6 @mdcore/engine — npm 패키지 (구현됨, 미공개)

**개발자가 자기 프로젝트에 mdfy.app 렌더링을 통합.**

```typescript
import { mdcore } from '@mdcore/engine';
const { html } = await mdcore.render('# Hello $x^2$');
```

| 모듈 | 기능 |
|------|------|
| `postProcessHtml` | 코드 하이라이팅 + KaTeX + ASCII 다이어그램 |
| `styleMermaidSvg` / `renderMermaidElements` | Mermaid SVG 스타일링 + 렌더링 |
| `htmlToMarkdown` | HTML → Markdown (Turndown) |
| `isAiConversation` / `formatConversation` | AI 대화 감지 + 포맷 |
| `cliToMarkdown` | CLI 출력 → Markdown |
| `convertToMarkdown` | 12개 포맷 → Markdown (CSV, JSON, LaTeX, RST 등) |

### 3.7 @mdcore/terminal — CLI (계획)

**터미널에서 Markdown을 아름답게.**

```bash
mdcore README.md              # 파일 렌더링
cat README.md | mdcore         # stdin 파이프
claude "explain this" | mdcore # AI 출력 렌더링
mdcore README.md --share       # mdfy.app 공유
```

### 3.8 mdcore.ai — API 플랫폼 (계획)

**프로그래매틱 문서 렌더링 + 변환.**

```
POST https://api.mdcore.ai/v1/render
{ "markdown": "# Hello", "output": "html" }
```

---

## 4. 통합 경험: 온라인 ↔ 오프라인

```
┌─ 온라인 ──────────────────────────────────────────┐
│                                                   │
│  mdfy.app (웹) ←── 싱크 ──→ mdcore.ai (API)       │
│      ↑                          ↑                 │
│      │ 싱크                     │ API             │
│      ↓                          │                 │
│  Chrome Extension               │                 │
│  (AI 대화 캡처)                  │                 │
│                                  │                 │
└──────────────┬───────────────────┘                 │
               │ 클라우드 싱크                       │
               │ (양방향, 충돌 해결)                 │
┌──────────────┴────────────────────────────────────┐
│                                                   │
│  ┌─ 오프라인 ──────────────────────────────────┐  │
│  │                                             │  │
│  │  VS Code Extension ←→ 로컬 .md 파일        │  │
│  │  mdfy for Mac      ←→ 로컬 저장소          │  │
│  │  QuickLook         ←  읽기 전용 프리뷰      │  │
│  │  @mdcore/terminal  ←  CLI 렌더링           │  │
│  │                                             │  │
│  └─────────────────────────────────────────────┘  │
│                                                   │
└───────────────────────────────────────────────────┘
```

**핵심**: 어떤 표면에서 문서를 만들든, 다른 모든 표면에서 동일한 품질로 접근 가능.

---

## 5. 기술 레이어

```
┌─ 사용자 표면 (Surfaces) ──────────────────────────┐
│  mdfy.app · VS Code · Chrome · Mac · QuickLook     │
│  Terminal · API                                    │
└───────────────────┬───────────────────────────────┘
                    │
┌───────────────────┴───────────────────────────────┐
│  @mdcore/engine (공유 엔진)                        │
│                                                   │
│  ┌─ Rust WASM Core ────────────────────────────┐  │
│  │  comrak (파서) → HTML                        │  │
│  │  flavor 감지 (GFM/Obsidian/MDX/Pandoc)      │  │
│  │  frontmatter 파싱 · TOC 추출                │  │
│  └─────────────────────────────────────────────┘  │
│                                                   │
│  ┌─ JS 후처리 ─────────────────────────────────┐  │
│  │  highlight.js · KaTeX · Mermaid 스타일링    │  │
│  │  ASCII 다이어그램 · 이미지 처리              │  │
│  └─────────────────────────────────────────────┘  │
│                                                   │
│  ┌─ 변환 유틸리티 ─────────────────────────────┐  │
│  │  HTML↔MD · AI 대화 · CLI · CSV · JSON       │  │
│  │  LaTeX · RST · RTF · XML                    │  │
│  └─────────────────────────────────────────────┘  │
│                                                   │
└───────────────────────────────────────────────────┘
                    │
┌───────────────────┴───────────────────────────────┐
│  Supabase (클라우드)                               │
│  문서 저장 · 사용자 인증 · 파일 스토리지           │
│  실시간 싱크 · 버전 관리                           │
└───────────────────────────────────────────────────┘
```

---

## 6. 실행 우선순위

### 런칭 (전 기능 무료)
1. 바이럴 뱃지 ("Published with mdfy.app")
2. mdfy.app + Chrome ext + VS Code ext 동시 출시
3. 런칭 포스팅 (HN, Reddit, Twitter)

### 안정화 후
4. 유료화 (가격/기능은 사용자 데이터로 결정)

### 에코시스템 확장
5. mdfy for Mac (오프라인 + 싱크)
6. QuickLook 플러그인
7. @mdcore/engine npm 공개
8. @mdcore/terminal CLI
9. mdcore.ai API

**원칙: 한 번에 하나. 이전 것이 작동할 때만 다음으로.**

---

## 7. 경쟁 포지션

| | Notion | Obsidian | GitHub Gist | MDcore |
|---|---|---|---|---|
| **AI 크로스플랫폼** | ❌ 자체 AI만 | ❌ | ❌ | ✅ 모든 AI |
| **렌더링 품질** | 보통 | 좋음 | 기본 | 최고 (Rust WASM) |
| **오프라인** | 제한적 | ✅ | ❌ | ✅ (Mac앱, VS Code) |
| **공유 = 배포** | ✅ | ❌ | ✅ | ✅ + 바이럴 |
| **Zero friction** | 로그인 필요 | 설치 필요 | 로그인 필요 | ❌ 불필요 |
| **개발자 API** | ❌ | ❌ | ❌ | ✅ |
| **네이티브 앱** | ✅ | ✅ | ❌ | ✅ (계획) |

**MDcore의 유일한 포지션: AI 출력 → 프로페셔널 문서를 모든 환경에서 동일 품질로.**
AI 회사가 구조적으로 복제 불가능 (경쟁사 AI 출력을 모아주는 도구를 왜 만들겠나).

---

*Version: 2.0*
*Author: Hyunsang Cho + Claude*
