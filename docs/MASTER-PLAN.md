# MDCORE — Master Plan

> ⚠️ **이 문서는 `updatedDirection.md` v5.0에 의해 전략 방향이 업데이트되었다.**
> 기술 구현 세부사항과 사용자 여정은 유효하나, 전략 방향/해자/수익 모델/우선순위는 updatedDirection.md가 기준이다.
>
> 주요 변경 (v5.0):
> - "콘텐츠 인프라 소유" → "AI 출력 → 즉시 퍼블리셔블 URL" (크로스 AI 레이어)
> - 해자 추가: 바이럴 뱃지, 크로스 AI 포지셔닝, 공유 = 배포
> - 수익 모델: Pro $12/mo → $8/mo (시장 검증 가격), Free에 7일 만료 + 바이럴 뱃지
> - mditor: WYSIWYG Writer 모드 도입 (MD를 몰라도 사용 가능)
> - 우선순위: 바이럴 뱃지 + Chrome 익스텐션 먼저, 나머지 순차 확장
>
> Last updated: 2026-03-23
> Version: 4.1 (updatedDirection.md v5.0 반영)

---

## 1. 이 사업은 무엇인가

### 한 문장 정의

> **AI와 사람 사이의 콘텐츠 인프라를 소유한다.**

모든 AI는 Markdown으로 말한다. 하지만 사람은 Markdown을 읽지 않는다. 동시에, AI에게 뭔가를 먹이려면 모든 것을 Markdown으로 바꿔야 한다. 이 양방향 간극 — **X → MD (AI가 읽도록)** 그리고 **MD → 사람이 보는 문서** — 에 인프라 레이어가 필요하다. 우리가 그 레이어다.

### 이전 문서들의 혼란을 정리

이전 문서들은 이 사업을 "렌더링 회사", "도구 회사", "인프라 회사", "표준 기구"로 각각 다르게 설명했다. 이것은 사업의 정체성이 분열된 것이 아니라, **단계별로 다른 얼굴을 보여주는 하나의 사업**이다.

```
사용자에게는 → 도구 (mdfy.cc: "뭐든 MD로, MD를 뭐든으로")
개발자에게는 → 엔진 (@mdcore: "최고의 MD 파싱·렌더링·변환 라이브러리")
기업에게는   → API (mdcore.ai: "양방향 MD 인프라")
업계에게는   → 표준 (mdcore.md: "AI-Native Markdown Spec")
```

하나의 핵심 기술(렌더링 엔진)이 네 가지 표면으로 나타나는 것이다. 이것이 Databricks가 Spark 하나로 노트북 → 오픈소스 → 클라우드 플랫폼 → 업계 표준이 된 방식이고, Cloudflare가 CDN 하나로 DNS → Workers → 보안 → 인터넷 인프라가 된 방식이다.

### 핵심 기술 자산 (The One Thing)

```
                    ┌──────────────────────────────────────────────────┐
                    │            mdcore unified engine                 │
                    │  (parser + renderer + transformer + converter)   │
                    └──┬───────┬───────┬───────┬───────┬───────┬──────┘
                       │       │       │       │       │       │
                  mdfy.cc  @mdcore/ mdcore.ai mdcore.md  확장 표면들
                  (웹제품)  engine   (API)    (표준)       ↓
                          (npm)                    ┌──────────────┐
                                                   │ @mdcore/     │
                                                   │  terminal    │ ← CLI/터미널
                                                   │  vscode      │ ← VS Code 확장
                                                   │  wasm        │ ← 브라우저/Edge
                                                   │  email       │ ← 뉴스레터
                                                   │  obsidian    │ ← Obsidian 플러그인
                                                   │  github-action│ ← CI/CD
                                                   └──────────────┘
```

**양방향 엔진**이 유일한 핵심 기술 자산이다:
- **인바운드**: HTML, PDF, DOCX, 웹페이지 → 깨끗한 Markdown (AI가 읽을 수 있도록)
- **아웃바운드**: Markdown → 아름다운 HTML, PDF, DOCX (사람이 읽을 수 있도록)
- **정규화**: GFM, Obsidian, MDX, Pandoc 등 어떤 MD flavor든 자동 감지 → 일관된 렌더링

에디터를 만들지 않는다. 지식 관리 도구를 만들지 않는다. **변환·렌더링 엔진**을 만든다.
엔진이 좋으면 **표면(surface)**은 무한히 확장 가능하다 — 이것이 플랫폼 사업의 본질.

### 엔진 적용 가능 표면 (Surface Map)

엔진 하나로 닿을 수 있는 모든 곳. 우선순위(★)가 높을수록 먼저 실행.

| 표면 | 형태 | 뭘 해결하나 | 타겟 사용자 | 우선순위 |
|------|------|-----------|-----------|---------|
| **mdfy.cc** | 웹앱 | MD 붙여넣기 → 예쁜 URL + 양방향 변환 | 모든 사람 | ★★★★★ Phase 1 |
| **Chrome Extension** | 브라우저 확장 | ChatGPT/Claude 출력 원클릭 저장+공유 | AI 사용자 | ★★★★ Phase 2 |
| **@mdcore/terminal** | CLI 도구 | 터미널에서 MD 실시간 렌더링 (Claude Code 등) | 개발자 | ★★★★ Phase 3 |
| **@mdcore/vscode** | VS Code 확장 | MD 프리뷰를 mdcore 렌더링으로 대체 | 개발자 | ★★★ Phase 3 |
| **@mdcore/wasm** | WASM 모듈 | 브라우저/Edge/Cloudflare Workers에서 초경량 렌더링 | 개발자/인프라 | ★★★ Phase 3-4 |
| **@mdcore/obsidian** | Obsidian 플러그인 | Obsidian 렌더링 엔진을 mdcore로 대체 | PKM 사용자 | ★★ Phase 4 |
| **@mdcore/email** | 라이브러리 | MD → 이메일 호환 HTML (뉴스레터 등) | 마케터/개발자 | ★★ Phase 4 |
| **@mdcore/github-action** | CI/CD Action | PR 코멘트, CHANGELOG, 문서 자동 렌더링 | DevOps | ★★ Phase 4 |
| **@mdcore/slack** | Slack 앱 | /mdfy 명령으로 MD → 예쁜 Slack 메시지 | 팀 | ★ Phase 5 |
| **@mdcore/raycast** | Raycast 확장 | 클립보드 MD 빠른 프리뷰/변환 | macOS 사용자 | ★ Phase 5 |
| **Mobile SDK** | iOS/Android | 네이티브 앱에 MD 렌더링 embed | 앱 개발자 | ★ Phase 5+ |

> 핵심: 표면을 많이 만드는 것이 아니라, **엔진을 완벽하게 만들면 표면은 커뮤니티가 만든다.** 우리는 가장 임팩트 큰 3-4개만 직접 만들고, 나머지는 오픈소스 기여로 받는다.

---

## 2. 왜 지금인가

### 시장 신호

| 신호 | 시기 | 의미 |
|------|------|------|
| Cloudflare "Markdown for Agents" | 2026.02 | 웹 콘텐츠를 AI에게 MD로 제공. MD가 AI 교환 포맷이 됨 |
| Laravel Cloud MD content negotiation | 2026.01 | 서버 프레임워크가 MD를 1급 시민으로 대우 |
| Visual Studio 2026 Copilot + MD | 2026.03 | Microsoft가 MD를 AI 작업 표면으로 공식 채택 |
| GitHub "Spec-driven development" | 2025 | MD가 문서화에서 프로그래밍으로 진화 |
| a16z $1.7B AI 인프라 펀드 | 2025 | "Agent-native infrastructure"가 최우선 투자 테마 |

### 핵심 관찰

Markdown은 AI 시대의 **교환 포맷(interchange format)**이 되었다. 양방향 변환 수요가 폭발하고 있다:

```
                         ┌─────────────┐
  HTML, PDF, DOCX ──────→│             │──────→ 아름다운 HTML, PDF, DOCX
  웹페이지, 이미지 ──────→│             │──────→ 공유 가능한 URL
  AI 출력 (ChatGPT등) ──→│   Markdown  │──────→ Slack, Email, Notion
  Obsidian, MDX 등 ─────→│  (허브 포맷) │──────→ 표준화된 문서
  ★ 캔버스 (생각 정리) ──→│             │──────→ 터미널, VS Code, 어디서든
                         └─────────────┘
                     X → MD (인바운드)      MD → X (아웃바운드)

                     전부 우리 ─────────────── 전부 우리
```

**X → MD 방향**: Cloudflare(웹→MD), Jina Reader(URL→MD), Microsoft MarkItDown(파일→MD), Docling(PDF→MD) 등이 각각 한 조각씩 해결 중. 통합 솔루션은 없다.
**MD → X 방향**: Unmarkdown($8/mo), Rentry(무료, 기본) 정도. 아직 인프라 수준의 플레이어 없음.
**mdcore의 기회**: 양방향을 하나의 엔진으로 통합하는 유일한 플레이어.

### 경쟁 분석 요약

**MD → 사람 방향 (아웃바운드)**:

| 플레이어 | 뭘 하나 | 가격 | mdfy.cc가 이기는 포인트 |
|---------|---------|------|----------------------|
| **Unmarkdown** | MD → 예쁜 문서 + 공유 URL + 62 템플릿 + 목적지별 복사 | Free(5문서) / Pro $8/mo | **로그인 없이 즉시 사용**, MD flavor 자동 감지, 오픈소스 엔진, "MD를 없앤다"가 아니라 "MD를 제대로 보여준다" 포지셔닝 |
| **Rentry.co** | 기본 MD 붙여넣기 → URL | 무료 | 렌더링 품질 10x, 수식/다이어그램/코드 하이라이팅 지원, 테마 |
| **Pandoc** | CLI로 MD ↔ 모든 포맷 변환 | 무료 | UX/API/URL 공유 없음. 개발자 전용. 내부 의존성으로 사용 가능 |
| **Claude Exporter 등** | 크롬 익스텐션으로 AI 대화 저장 | 무료 | 렌더링 엔진/URL 공유/API 없음. 보완적 관계 |

**X → MD 방향 (인바운드)**:

| 플레이어 | 뭘 하나 | 한계 |
|---------|---------|------|
| **Cloudflare Markdown for Agents** | 자사 CDN 통과하는 HTML → MD 자동 변환 | CF 고객만. PDF/DOCX 미지원. 우리와 경쟁이 아니라 상호보완 |
| **Jina Reader** | URL 앞에 r.jina.ai/ 붙이면 웹→MD | URL만 지원. 파일 변환 없음. API 중심 |
| **Microsoft MarkItDown** | Python 라이브러리. PDF/Office/이미지→MD | 라이브러리만. UX/API 서비스 없음. 우리 엔진의 의존성으로 활용 가능 |
| **Marker** (datalab) | PDF→MD 고정밀 변환 | PDF 특화. 범용 아님 |
| **Docling** (IBM) | PDF/DOCX/PPTX/이미지→MD+JSON | AI 파이프라인용. 최종 사용자 제품 없음 |

**핵심 인사이트**: X→MD 방향은 개발자 도구/라이브러리만 있고, 일반 사용자용 제품이 없다. MD→X 방향은 Unmarkdown이 유일한 진지한 플레이어인데 로그인 필수 + MD를 없애는 방향. **양방향을 하나의 제품으로 통합한 곳은 없다.**

---

## 3. 시장 Pain Points (리서치 기반)

mdfy.cc가 해결하는 실제 문제들. 조사 결과 6개 카테고리에서 공통 pain point 확인.

**가장 뜨거운 문제 (MVP에서 바로 해결)**:
- AI 출력 복사→붙여넣기 시 포맷 손실 — ChatGPT/Claude 수억 사용자가 매일 겪음
- MD를 링크 하나로 공유할 방법이 없음 — "이거 뭐로 여는 거야?" 문제
- MD flavor 파편화 — GFM/Obsidian/MDX/Pandoc이 서로 호환 안 됨
- 테이블 문법이 망가져 있음 — 셀 병합 불가, 긴 텍스트 깨짐
- 수식/다이어그램이 네이티브 지원 안 됨

**성장 단계에서 해결할 문제 (Phase 2)**:
- MD → 예쁜 PDF가 안 됨 — 학술, 블로거, 엔터프라이즈 공통 불만
- PDF/DOCX/웹페이지 → 깨끗한 MD가 어려움 — AI 파이프라인 핵심 니즈
- 목적지별 붙여넣기 최적화 — Docs, Slack, Email 각각 다르게 깨짐
- 접근성(a11y) — alt text 미지원, 스크린 리더 비호환

**장기 인프라 문제 (Phase 3-5)**:
- LLM 스트리밍 렌더링 — 토큰 단위 출력 시 파서가 제대로 동작 안 함
- 엔터프라이즈 버전/권한 관리 — Git 기반은 개발자 전용
- AI 메타데이터 보존 — 누가 만들었는지, 어떤 모델인지 추적 불가

---

## 4. 사용자 여정 — "보고 나서 뭘 하는가"

mdfy.cc가 일회용 뷰어로 끝나면 Rentry와 같아진다. 사용자가 **돌아오는 이유**를 만들어야 한다.

### 전체 여정

```
INPUT → RENDER → REFINE → SHARE → COLLABORATE → ITERATE
  ↑                                                  │
  └──────────────────────────────────────────────────┘
                    (돌아온다)
```

| 단계 | 뭘 하나 | Phase | 핵심 기능 |
|------|---------|-------|----------|
| **INPUT** | 뭐든 넣는다 | 1-2 | MD 붙여넣기, 파일 드래그, URL→MD, AI 대화 복붙, ★ 캔버스 |
| **RENDER** | 예쁘게 본다 | 1 | flavor 자동 감지, 테마, 실시간 프리뷰 |
| **REFINE** | 다듬고 고친다 | 1-2 | ★ 인터랙티브 수정(테이블/다이어그램/수식 직접 편집+생성), AI 명령, 섹션 재배치, 버전 히스토리 |
| **SHARE** | 내보낸다 | 1-2 | URL, PDF/DOCX, 목적지별 복사, Embed, QR |
| **COLLABORATE** | 함께 한다 | 2-3 | 코멘트, 제안 모드, (장기) 실시간 동시 편집 |
| **ITERATE** | 돌아온다 | 2-3 | 내 문서 대시보드, 문서 간 연결, 템플릿 재사용 |

### ★ 캔버스 모드 — "Excalidraw for MD"

**문제**: MD는 구조화된 문법이라 생각을 바로 쓰기 어렵다. 사람은 비구조적으로 생각한다.
**해결**: 초경량 캔버스에서 자유롭게 생각을 던지고 → AI가 구조화된 MD로 정리.

```
┌────────────────────────────────────────────┐
│  mdfy.cc/canvas                            │
│                                            │
│   ┌──────┐        ┌──────────┐             │
│   │ 배경  │───────→│ 핵심 주장 │             │
│   │ 설명  │        └────┬─────┘             │
│   └──────┘             │                   │
│                   ┌────▼─────┐  ┌────────┐ │
│                   │ 근거 1   │  │ 근거 2  │ │
│                   └──────────┘  └────────┘ │
│                                            │
│          [ ✨ MD로 정리하기 ]               │
└────────────────────────────────────────────┘
                     ↓ AI 구조화
┌────────────────────────────────────────────┐
│  # 핵심 주장                               │
│                                            │
│  ## 배경                                   │
│  배경 설명 텍스트...                        │
│                                            │
│  ## 근거                                   │
│  1. 근거 1 텍스트...                        │
│  2. 근거 2 텍스트...                        │
└────────────────────────────────────────────┘
```

**왜 이게 킬러인가:**
- Mermaid 문법을 모르는 사람도 비주얼로 플로우차트를 만들 수 있다
- 기존 Mermaid 코드를 캔버스에 불러와서 비주얼로 수정 가능 (역방향)
- "에디터를 만들지 마라" 원칙에 안 어긋남 — Mermaid 코드의 인풋 레이어

**구현 (완료 — Phase 2)**:
- 자체 경량 캔버스 (React, 외부 의존성 0) — tldraw 대신 직접 구현
- 요소: 텍스트 노드 (4가지 shape: round/square/circle/diamond) + 화살표 (라벨 지원)
- Mermaid 코드 생성: 캔버스 노드+엣지 → `graph LR/TD` 코드 자동 생성
- Mermaid 코드 Import: 기존 Mermaid 코드 → 캔버스에 노드/엣지로 auto-layout
- AI 불필요 — 알고리즘 기반 변환 (그래프 구조 → Mermaid 문법은 1:1 매핑)
- 향후 Gemini Flash Lite 연동으로 "더 똑똑한 정리" 옵션 추가 가능

### ★ 인터랙티브 수정 — "렌더링 위에서 바로 고친다"

**문제**: MD 소스를 직접 수정하는 건 고통이다. 테이블의 파이프 문자(|) 사이를 찾아 편집하고, Mermaid 문법을 알아야 다이어그램을 고치고, LaTeX를 알아야 수식을 수정한다.
**해결**: 렌더링된 결과물을 보면서 직접 수정. 뒤에서 MD 소스가 자동 sync.

```
사용자가 보는 것 (렌더링)          뒤에서 일어나는 것 (MD 소스)
┌───────────────────────┐        ┌──────────────────────────┐
│                       │        │                          │
│  예쁜 테이블          │  sync  │  | col1 | col2 |        │
│  ┌────┬────┐ ←클릭   │ ←────→ │  |------|------|        │
│  │ A  │ B● │  수정    │        │  | A    | B    |        │
│  └────┴────┘         │        │                          │
│                       │        │                          │
│  ┌──→──┐              │  sync  │  ```mermaid              │
│  │ A   │──→ B ←드래그 │ ←────→ │  graph LR               │
│  └─────┘              │        │    A --> B               │
│                       │        │  ```                     │
└───────────────────────┘        └──────────────────────────┘
```

**수정 가능한 요소:**

| 요소 | 수정 방법 | 생성 방법 | Phase |
|------|----------|----------|-------|
| **테이블** | 셀 더블클릭 → 인라인 편집, 행/열 우클릭 → 추가/삭제/정렬 | 툴바에서 "테이블 삽입" → 크기 선택 → 스프레드시트처럼 입력 | Phase 1 (기본), 2 (고급) |
| **체크박스** | 클릭으로 토글 | 자동 — `- [ ]` 감지 | Phase 1 |
| **Mermaid 다이어그램** | 노드 클릭 → 텍스트 수정, 드래그로 연결선 추가/삭제 | 툴바 "다이어그램 삽입" → 캔버스 모드에서 시각적으로 생성 → Mermaid 코드 자동 생성 | Phase 2 |
| **수식 (KaTeX)** | 클릭 → LaTeX 에디터 팝업 (실시간 프리뷰) | 툴바 "수식 삽입" → 비주얼 수식 에디터 (분수, 적분 등 버튼) | Phase 2 |
| **코드블록** | 클릭 → 미니 에디터 (syntax highlighting + 언어 선택) | 툴바 "코드 삽입" → 언어 선택 → 에디터 | Phase 1 |
| **이미지** | 드래그로 크기 조절, 클릭으로 교체/캡션 수정 | 드래그앤드롭 또는 URL 붙여넣기 | Phase 2 |
| **텍스트/헤딩** | 클릭 → 인라인 편집 (볼드/이탤릭 단축키) | 자연스럽게 타이핑 | Phase 1 (기본) |
| **차트 (Chart.js)** | 데이터 테이블 수정 → 차트 자동 업데이트 | 데이터 입력 → 차트 타입 선택 → 자동 생성 | Phase 2-3 |

**핵심 원칙:**
- **MD 소스가 진실(source of truth)이다.** 비주얼 수정은 전부 MD 소스로 역변환된다. 어떤 MD 에디터에서 열어도 동일한 결과.
- **에디터가 아니다.** 글을 쓰는 도구(Obsidian, Typora)가 아니라, 렌더링된 문서 위에서 **요소를 조작하는 도구**다. Google Docs의 표 편집처럼.
- **"생성"도 지원한다.** 빈 문서에서 시작해도, 테이블·다이어그램·수식·코드블록을 비주얼로 만들 수 있다. MD 문법을 모르는 사람도 구조화된 문서를 만든다.
- **AI가 돕는다.** "이 테이블에 열 추가해줘", "이 다이어그램을 시퀀스 다이어그램으로 바꿔줘" 같은 자연어 명령으로도 수정 가능.

**이게 바꾸는 것:**
```
Before: mdfy.cc = MD 뷰어 (보는 도구)
After:  mdfy.cc = MD 위의 인터랙티브 문서 도구 (보고 + 고치고 + 만드는 도구)
```

---

## 5. 도메인 전략

5개 도메인은 단계별로 순차 활성화. 동시에 여러 개를 운영하지 않는다.

| 도메인 | 역할 | 활성화 시점 | 현재 상태 |
|--------|------|-----------|----------|
| **mdfy.cc** | 핵심 제품 (유일한 사용자 접점) | Phase 1 (지금) | 바로 작동하는 제품 → SaaS |
| mdfy.online | mdfy.cc 리다이렉트 | Phase 1 | 301 redirect 설정만 |
| mdcore.org | 오픈소스 프로젝트 홈 | Phase 3 | 미활성. Phase 3까지 건드리지 않음 |
| mdcore.ai | API 플랫폼 | Phase 4 | 미활성. Phase 4까지 건드리지 않음 |
| mdcore.md | 스펙 문서 사이트 | Phase 5 | 미활성. Phase 5까지 건드리지 않음 |

**원칙: 지금은 mdfy.cc만 존재한다.** 다른 도메인은 존재하지 않는 것처럼 취급.

---

## 6. 실행 계획

### 왜 랜딩 페이지가 아닌가

이전 버전(v3.0)에서는 "Phase 0: 랜딩 페이지 + Waitlist"로 시작했다. 이것은 **틀렸다.**

Excalidraw는 2020년 1월 1일에 작동하는 제품을 바로 HN에 올렸다. 가입 없음, 온보딩 없음, 랜딩 페이지 없음 — 접속하면 바로 그리기. 1년 만에 주간 활성 2만 명. Carbon.now.sh도 동일. Rentry.co도 동일. 이 도구들의 공통점: **제품이 곧 데모이고, 데모가 곧 랜딩 페이지.**

mdfy.cc는 정확히 같은 종류의 도구다. "Markdown 붙여넣기 → 예쁜 URL"은 써보면 3초 만에 이해되는 제품이다. 이런 제품에 "coming soon" 랜딩 페이지를 만드는 것은:

1. **렌더링 품질을 보여줄 수 없다.** 유일한 차별점이 "얼마나 예쁘게 렌더링하느냐"인데 목업으로는 증명 불가.
2. **개발자는 waitlist에 가입하지 않는다.** 써볼 수 있으면 써보고, 없으면 넘어간다.
3. **시간 낭비다.** AI와 함께하면 MVP 자체를 2주에 만들 수 있는데, 왜 2주를 빈 페이지에 쓰나?

**결론: 바로 만든다. 제품 자체가 수요 검증이다.**

---

### Phase 1: mdfy.cc — 작동하는 제품 (Week 1–3)

**목표**: Markdown 붙여넣기 → 아름다운 공유 URL. 접속하면 바로 쓸 수 있다. Excalidraw처럼.

**홈페이지 = 제품**:
```
mdfy.cc 접속
  → 왼쪽: Markdown 입력 에디터
  → 오른쪽: 실시간 렌더링 프리뷰
  → 상단: [Share] 버튼
  → Share 클릭 → mdfy.cc/{id} URL 생성
  → 누구나 이 URL로 렌더링된 문서 조회 가능
```

설명 텍스트가 아닌 **작동하는 도구가 방문자를 맞이한다.** 처음 방문한 사람도 3초 안에 무엇을 하는 곳인지 안다.

**범위 (IN)**:
- Markdown 붙여넣기 / .md 드래그앤드롭
- **MD flavor 자동 감지**: GFM 테이블, Obsidian `[[wikilink]]`, 수식 `$...$`, frontmatter YAML 등 입력 즉시 감지 → 최적 렌더링 (상단에 "GFM detected" 뱃지 표시)
- 실시간 렌더링 프리뷰 (split view)
- 공유 URL 생성 (mdfy.cc/{id})
- **공유 UX**: URL 복사 원클릭, OG 이미지 자동 생성 (제목+첫 몇 줄 기반), QR 코드
- 2개 테마 (Light Minimal, Developer Dark)
- 코드 하이라이팅 (Shiki), KaTeX 수식, Mermaid 다이어그램
- 코드 블록 원클릭 복사
- **인터랙티브 수정 (기본)**: 체크박스 토글, 테이블 셀 더블클릭 편집, 텍스트/헤딩 인라인 편집, 코드블록 클릭→미니 에디터
- 모바일 반응형 (뷰어)
- 수정/삭제 (토큰 기반, 계정 불필요)

**범위 (OUT — Phase별 추가)**:
- **인터랙티브 수정 (고급)**: Mermaid 비주얼 편집, 수식 비주얼 에디터, 차트 편집, 이미지 조작 → Phase 2
- **인터랙티브 생성**: 빈 문서에서 테이블/다이어그램/수식을 비주얼로 생성 → Phase 2
- **캔버스 모드**: Excalidraw for MD → Phase 2 후반
- **X → MD 변환** (HTML/웹페이지 붙여넣기 → MD) → Phase 2 초반
- PDF/DOCX → MD 변환 → Phase 2
- MD → PDF/DOCX 내보내기 → Phase 2
- 유료 결제 → Phase 2
- API → Phase 3
- 크롬 익스텐션 → Phase 2
- 사용자 계정 → Phase 2
- 비밀번호 보호 → Phase 2

**기술 스택**:
```
Next.js 15 + TailwindCSS + shadcn/ui
unified (remark + rehype) 커스텀 렌더링 파이프라인
  → Shiki (코드 하이라이팅)
  → KaTeX (수식)
  → Mermaid (다이어그램)
  → rehype-slug + TOC 자동 생성
Supabase (PostgreSQL + Storage)
Vercel (배포 + Edge Functions)
Plausible (분석 — 개인정보 보호형)
```

**일간 계획**:

Week 1:
- Day 1–2: 프로젝트 셋업 (Next.js + Supabase + Vercel + 도메인 연결)
- Day 3–4: 렌더링 엔진 코어 (remark/rehype 파이프라인 + Shiki + KaTeX)
- Day 5–7: 붙여넣기 UI (split view editor + live preview)

Week 2:
- Day 8–9: URL 생성 + 공유 뷰어 페이지 (OG 메타태그 + SEO)
- Day 10–11: 테마 2종 (Minimal Light, Developer Dark)
- Day 12–13: Mermaid 다이어그램 + 코드 복사 버튼 + TOC
- Day 14: 모바일 반응형 (뷰어 우선)

Week 3:
- Day 15–16: 수정/삭제 (토큰 기반) + 에러 핸들링 + 레이트 리밋
- Day 17–18: Lighthouse 95+ 최적화 + Edge 캐싱
- Day 19–20: 런칭 준비 (포스팅 초안 작성)
- Day 21: **런칭**

**런칭**:
- Hacker News "Show HN: mdfy.cc — paste Markdown, get a beautiful shareable URL"
- Reddit: r/webdev, r/SideProject, r/ChatGPT, r/ClaudeAI
- Twitter/X: 런칭 스레드 + 렌더링 품질 스크린샷
- Product Hunt

**Go/No-Go (런칭 2주 후 = Week 5 기준)**:
- ✅ 생성된 URL 1,000+ & 유기적 공유 발생 → Phase 2 진행
- ⚠️ URL 200–1,000 → 렌더링 품질 개선 + 재런칭
- ❌ URL <200 → 가치 제안 근본 재검토

> DAU보다 **생성된 URL 수**가 진짜 지표다. 사람들이 실제로 만들어서 공유하느냐가 핵심.

---

### Phase 2: 성장 + 수익화 (Week 6–12)

**목표**: 사용자가 오고 있다. 이제 성장을 가속하고 돈을 받기 시작한다.

**추가 기능 (우선순위 순)**:

*성장 드라이버 (Week 6–8):*
1. **크롬 익스텐션**: ChatGPT/Claude 페이지에서 원클릭 "Save to mdfy" — 최대 성장 드라이버
2. **HTML → MD 변환**: 웹페이지 URL 붙여넣기 → 깨끗한 MD로 변환 + 렌더링. "AI에게 먹이기 좋은 MD 만들기" 유즈케이스
3. **AI 대화 모드**: ChatGPT/Claude 출력 형식 자동 감지 → 깔끔한 문서로 정리

*인터랙티브 고급 + 생성 (Week 8–9):*
4. **Mermaid 비주얼 편집**: 렌더링된 다이어그램에서 노드 클릭→텍스트 수정, 드래그→연결선 추가/삭제. 새 다이어그램도 비주얼로 생성 → Mermaid 코드 자동 생성
5. **수식 비주얼 에디터**: 클릭 → LaTeX 팝업 + 버튼(분수, 적분, 합 등)으로 수식 생성/수정
6. **테이블 고급**: 행/열 드래그 정렬, 셀 병합(확장 MD 문법), 데이터에서 차트 자동 생성

*양방향 변환 (Week 9–10):*
7. **X → MD**: PDF, DOCX, 웹페이지 → 깨끗한 Markdown (MarkItDown/Docling 기반)
8. **MD → X**: MD → PDF, standalone HTML, DOCX 내보내기
9. **목적지별 최적화 복사**: Google Docs, Slack, Email, Notion 각각에 맞는 클립보드 복사 (Unmarkdown의 핵심 기능을 더 잘 구현)

*캔버스 + 수익화 (Week 10–12):*
10. **캔버스 모드 v1**: 초경량 Excalidraw for MD — 텍스트 박스 + 화살표 → AI가 MD 구조화
11. **비밀번호 보호 + 만료 URL**: 문서 접근 제한
8. **Embed 코드**: iframe으로 블로그/Notion에 삽입
9. **Stripe 결제**: Pro 플랜 활성화

**수익 모델**:

| 티어 | 가격 | 핵심 제한 |
|------|------|----------|
| Free | $0 | 월 10개 URL, 공개만, 워터마크, PDF 3회/월 |
| Pro | $12/월 ($99/년) | 무제한, 비공개, 워터마크 제거, 커스텀 테마, 커스텀 도메인 |
| Team | $29/월 | Pro + 팀 워크스페이스, 브랜딩, 분석 |

> 무료 워터마크 "Made with mdfy.cc"가 핵심 바이럴 장치. 모든 공유 문서가 광고.

**Go/No-Go (Week 12 기준)**:
- ✅ MRR $1,000+ → Phase 3 진행
- ⚠️ MRR $200–$1,000 → 가격/가치 제안 반복 개선
- ❌ MRR <$200 → 비즈니스 모델 재검토

---

### Phase 3: @mdcore 오픈소스 (Month 4–8)

**목표**: mdfy.cc의 렌더링 엔진을 추출하여 오픈소스 공개. 개발자 생태계를 만든다.

**왜 이 시점인가**:
- Phase 1/2에서 이미 렌더링 엔진을 만들었음
- 실전 검증된 코드를 공개하는 것 (이론이 아님)
- 오픈소스 채택 → 표준의 정당성 확보 → Phase 4/5의 기반

**공개 패키지**:
```
@mdcore/engine    — 파서 + 렌더러 + flavor 자동 감지 (remark/rehype 기반 확장)
@mdcore/convert   — 양방향 변환 (HTML/PDF/DOCX ↔ MD)
@mdcore/themes    — 렌더링 테마 컬렉션
@mdcore/terminal  — 터미널 MD 렌더러 (★ 킬러 오픈소스 프로젝트)
```

**@mdcore/terminal — 상세 계획**:

Claude Code, Cursor, GitHub Copilot CLI 등 AI CLI 도구가 뱉는 MD를 터미널에서 바로 예쁘게 렌더링.
Glow(Charm, 16K+ GitHub stars)의 "AI 시대 후계자" 포지셔닝.

```
설치: brew install mdcore (또는 npm i -g @mdcore/terminal)
사용: claude | mdcore              ← 파이프라인
      mdcore render README.md     ← 파일 렌더링
      mdcore watch .              ← 실시간 감시
```

구현 방식 (하이브리드):
- 기본: ANSI 렌더링 (헤딩=bold+color, 코드=배경색+Shiki, 테이블=box drawing)
- 리치: iTerm2/Kitty/WezTerm 그래픽 프로토콜로 Mermaid 다이어그램, 수식을 인라인 이미지 렌더링
- 초경량: 단일 바이너리, 의존성 0, <5MB

왜 이게 중요한가:
1. Claude Code 사용자 = 개발자 = 오픈소스 타겟과 100% 일치
2. `brew install mdcore` 한 줄로 즉시 가치 → 바이럴
3. 매일 쓰는 도구가 됨 → @mdcore/engine 채택의 가장 강력한 드라이버
4. Glow를 능가하는 GitHub stars 가능 (AI 시대 + 양방향 변환이라는 차별점)

**AI-Native Markdown 확장** (하위 호환 방식):
```yaml
# frontmatter 확장 — 모든 MD 도구가 이미 지원
---
mdcore: 1.0
ai:
  model: claude-opus-4
  generated_at: 2026-03-20T09:00:00Z
  token_count: 1247
  human_edited: true
---
```
```html
<!-- HTML 주석 어노테이션 — 모든 렌더러가 무시하므로 100% 호환 -->
<!-- @ai-generated -->
이 섹션은 AI가 생성했습니다.
<!-- @/ai-generated -->
```

**Go/No-Go**:
- ✅ @mdcore/engine npm 주간 1,000+ & GitHub 스타 500+ → Phase 4 진행
- ✅ @mdcore/terminal이 HN/Reddit에서 바이럴 → Phase 4 가속
- ❌ 6개월 후에도 의미있는 채택 없음 → 오픈소스는 유지하되 Phase 4 보류

---

### Phase 4: mdcore.ai API (Month 7–12)

**목표**: 렌더링 엔진을 API로 판매한다. B2B/B2D 수익.

**핵심 API**:
```
# MD → 사람 (렌더링/변환)
POST https://api.mdcore.ai/v1/render
{ "markdown": "...", "theme": "minimal-light", "output": "html|png|pdf|docx" }

# X → MD (인바운드 변환)
POST https://api.mdcore.ai/v1/convert
{ "source": "https://example.com" | <base64 file>, "format": "html|pdf|docx|url", "output": "markdown" }

# MD flavor 정규화
POST https://api.mdcore.ai/v1/normalize
{ "markdown": "...", "source_flavor": "auto", "target": "commonmark|gfm|mdcore" }
```

**타겟**: AI 에이전트 개발자(웹→MD 필요), SaaS(문서 렌더링 필요), RAG 파이프라인(PDF→MD 필요), 문서 자동화 도구

**수익 모델**: $19–$199/월, 사용량 기반

**Go/No-Go**:
- ✅ API MRR $2,000+ → Phase 5 검토
- ❌ API 수요 미미 → mdfy.cc SaaS에 집중

---

### Phase 5: 표준화 (Month 12–18+)

**목표**: AI-Native Markdown Specification을 mdcore.md에 공개.

**진입 조건 (2개 이상 충족 시에만)**:
- mdfy.cc MAU 5,000+
- @mdcore/engine npm 주간 2,000+
- mdcore.ai API 활성 고객 50+

**핵심**: 표준은 선언하는 것이 아니라 채택되는 것이다. Phase 1–4에서 사용자와 개발자가 이미 우리 방식으로 일하고 있으면, 그걸 문서화하는 것이 표준이 된다.

> Phase 5는 선택적 업사이드. 이것 없이도 사업은 성립한다.

---

## 7. 재무

### 단위 경제

- MD 렌더링은 텍스트 기반 → 인프라 비용 극소
- 무료 사용자 1명: ~$0.02/월
- Pro 사용자 1명: ~$0.05/월
- **Pro 사용자 100명 = $1,200 MRR에 인프라 비용 $75** → 즉시 흑자

### 18개월 전망 (보수적, 유기적 성장만)

| 월 | Phase | MRR | 인프라비용 | 순이익 |
|----|-------|-----|----------|--------|
| 3 | 1 런칭 | $0 | $25 | -$25 |
| 5 | 1.5 | $360 | $50 | +$310 |
| 7 | 1.5/2 | $1,345 | $75 | +$1,270 |
| 9 | 2/3 | $3,025 | $100 | +$2,925 |
| 12 | 3 | $5,450 | $200 | +$5,250 |
| 18 | 4 | $16,820 | $500 | +$16,320 |

> 외부 투자 없이 부트스트랩 가능. VC 피칭은 Phase 2 이후 트랙션을 증명한 뒤에.

---

## 8. VC 스토리 (Phase 2+ 시점용)

> "Markdown은 AI 시대의 교환 포맷이 되었습니다. 모든 AI가 MD를 출력하고, 모든 AI가 MD를 입력으로 원합니다.
> 하지만 PDF를 MD로 바꾸는 것도, MD를 사람이 읽을 문서로 바꾸는 것도 아직 깨져 있습니다.
>
> mdcore는 Markdown 양방향 인프라입니다.
> mdfy.cc로 시장을 증명했고 (MAU X, MRR $Y),
> @mdcore 엔진을 오픈소스로 공개하여 npm 주간 Z 다운로드를 달성했고,
> mdcore.ai API로 W개 기업이 Markdown 변환·렌더링을 우리에게 의존합니다.
>
> Cloudflare가 웹→MD 한 조각을 해결했다면, 우리는 양방향 전체를 해결합니다.
> AI 에이전트 시대의 콘텐츠 인프라에 투자하실 기회입니다."

타겟 VC: a16z (AI infra), Sequoia, Y Combinator

---

## 9. 리스크와 킬 스위치

| 리스크 | 확률 | 대응 |
|--------|------|------|
| 수요 검증 실패 (Phase 0) | 중간 | 메시지 피벗 2회. 그래도 안 되면 접는다 |
| 무료 사용자만 → 돈 안 됨 | 높음 | 워터마크를 통한 바이럴. API 수익에 집중 |
| AI 회사가 네이티브 내보내기 추가 | 중간 | URL 공유 + API는 영향 없음. 인프라로 포지셔닝 |
| 표준 채택 실패 | 높음 | Phase 4는 선택적. 없어도 사업 성립 |
| 번아웃 | 높음 | 6주 스프린트 + Go/No-Go 게이트. 안 되면 쉰다 |

**킬 스위치**: Phase 2 종료 시점(Week 12)에서 MRR이 $200 미만이면, 이 사업은 접는다.
이것은 실패가 아니라 12주 만에 검증을 마친 것이다. 도메인은 보유하고 다음 기회를 기다린다.

---

## 10. 핵심 원칙 (변하지 않는 것)

1. **양방향 엔진이 전부다.** X→MD, MD→X, flavor 감지 — 이 하나의 엔진에서 제품, 오픈소스, API, 표준이 전부 나온다.
2. **에디터를 만들지 마라. 인터랙티브 레이어를 만든다.** 글쓰기 도구(Obsidian, Typora)가 아니라, 렌더링 위에서 요소를 조작하는 도구. MD 소스가 항상 진실.
3. **표준을 선언하지 마라.** 너무 좋은 도구를 만들어서 그게 표준이 되게 한다.
4. **한 번에 하나만.** 지금은 mdfy.cc만 존재한다. 다른 도메인은 없는 것처럼.
5. **Zero friction.** 로그인 없이, 설명 없이, 3초 안에 가치 전달. Unmarkdown처럼 가입부터 요구하지 않는다.
6. **아무 MD나 넣어도 된다.** GFM이든, Obsidian이든, MDX든, 깨진 MD든 — 자동 감지해서 최적 렌더링.
7. **Gate를 지켜라.** Go/No-Go 기준을 통과하지 못하면 다음 Phase로 가지 않는다.
8. **12주가 답이다.** Week 12에 MRR $200 미만이면 접는다. Sunk cost fallacy를 허용하지 않는다.

---

## 11. 지금 해야 할 것 (Phase 1, Day 1부터)

랜딩 페이지 없이 바로 제품을 만든다. 제품이 곧 데모이고, 데모가 곧 마케팅이다.

### Day 1–2: 기반
- [ ] GitHub repo 생성 (mdfy-cc)
- [ ] Next.js 15 + TailwindCSS + shadcn/ui 프로젝트 초기화
- [ ] Supabase 프로젝트 생성 (DB + Storage)
- [ ] Vercel 연결 + mdfy.cc DNS 설정
- [ ] mdfy.online → mdfy.cc 301 리다이렉트

### Day 3–7: 핵심 엔진
- [ ] remark + rehype 렌더링 파이프라인 구축
- [ ] **MD flavor 자동 감지 모듈** (GFM 테이블, frontmatter, 수식 $...$, Obsidian wikilink 등 패턴 분석 → 적절한 remark 플러그인 자동 활성화)
- [ ] Shiki 코드 하이라이팅 통합
- [ ] KaTeX 수식 렌더링
- [ ] 붙여넣기 UI (split view: 에디터 | 프리뷰)
- [ ] 테마 1종 우선 완성 (Minimal Light)

### Day 8–14: 공유 + 테마
- [ ] URL 생성 (POST /api/docs → mdfy.cc/{nanoid})
- [ ] 공유 뷰어 페이지 (OG 메타태그, SEO)
- [ ] 테마 2종째 (Developer Dark)
- [ ] Mermaid 다이어그램 + TOC 자동 생성
- [ ] 코드 블록 복사 버튼
- [ ] 모바일 반응형 (뷰어)

### Day 15–20: 완성 + 런칭 준비
- [ ] 수정/삭제 (토큰 기반)
- [ ] 레이트 리밋 + 에러 핸들링
- [ ] Lighthouse 95+ 최적화
- [ ] Edge 캐싱 (Vercel)
- [ ] Plausible 분석 설정
- [ ] 런칭 포스팅 초안 작성 (HN, Reddit, Twitter)

### Day 21: 런칭
- [ ] Hacker News "Show HN: mdfy.cc — paste Markdown, get a beautiful URL"
- [ ] Reddit 4건 (r/webdev, r/SideProject, r/ChatGPT, r/ClaudeAI)
- [ ] Twitter/X 런칭 스레드
- [ ] Product Hunt 런칭

### Week 5: 판단
- 생성된 URL 1,000+ & 유기적 공유 발생 → Phase 2 시작
- URL 200–1,000 → 렌더링 품질 개선 + 재런칭
- URL <200 → 가치 제안 재검토

---

*이 문서가 유일한 기준이다. 로드맵 v1, v2, Business Review DOCX는 참고 자료로만 보관한다.*
