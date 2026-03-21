# CLAUDE.md — mdcore/mdfy Project Context

> 이 파일은 Claude Code CLI가 자동으로 읽는 프로젝트 컨텍스트 파일이다.
> 프로젝트에 대한 모든 핵심 정보를 담고 있다.

---

## Vision

**"AI와 사람 사이의 콘텐츠 인프라를 소유한다."**

Markdown은 AI의 네이티브 언어다. AI 에이전트의 입출력, RAG 파이프라인, 지식 관리, 문서 생성 — 모든 것이 Markdown으로 수렴하고 있다. 아직 이 레이어를 "인프라 수준"에서 잡고 있는 플레이어가 없다. 우리가 그 인프라를 만든다.

## 팀

- 파운더 1명 (Hyunsang, hi@raymind.ai) + AI(Claude) 페어 프로그래밍
- 풀타임, 의사결정 즉시, 한 번에 하나만 제대로

## 도메인

- **mdfy.cc** — 핵심 제품 (현재 라이브, Vercel 자동 배포)
- **mdfy.online** — mdfy.cc로 리다이렉트 (보조)
- **mdcore.ai** — 기술 플랫폼 & API (Phase 3)
- **mdcore.org** — 오픈소스 커뮤니티 (Phase 2)
- **mdcore.md** — 스펙 문서 & 플레이그라운드 (Phase 4)

## GitHub

- **Repo**: `raymindai/mdcore`
- **CI**: GitHub Actions (test-engine → build-wasm → build-web)
- **Deploy**: Vercel 자동 배포, push하면 mdfy.cc에 반영

---

## 프로젝트 구조

```
mdcore/
├── packages/
│   ├── engine/              # Rust 엔진 (comrak 기반)
│   │   ├── Cargo.toml
│   │   └── src/
│   │       ├── lib.rs       # WASM 바인딩 (wasm-bindgen)
│   │       ├── render.rs    # 핵심 렌더링 로직 (comrak → HTML)
│   │       └── flavor.rs    # Markdown flavor 감지
│   └── wasm/                # WASM 빌드 출력
│       └── pkg/
├── apps/
│   ├── web/                 # Next.js 15 웹앱 (mdfy.cc)
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
│   │   │       ├── postprocess.ts  # highlight.js + KaTeX + Mermaid 후처리
│   │   │       ├── share.ts        # URL 공유 (short URL + hash fallback + editToken)
│   │   │       ├── supabase.ts     # Supabase 서버 클라이언트
│   │   │       ├── rate-limit.ts   # IP 기반 레이트 리밋
│   │   │       ├── html-to-md.ts   # HTML → Markdown 변환 (Turndown)
│   │   │       ├── ai-conversation.ts  # AI 대화 감지 + 포맷
│   │   │       ├── canvas-to-mermaid.ts # 캔버스 → Mermaid 코드 변환
│   │   │       └── wasm/           # WASM 바인딩 (빌드 산출물)
│   │   └── package.json
│   └── chrome-extension/    # 크롬 익스텐션 (ChatGPT/Claude → mdfy.cc)
├── docs/
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

```
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

## 현재 상태 (2026-03-21)

### Phase 1 완료

- [x] Rust 엔진 + WASM 컴파일 + Next.js 통합
- [x] mdfy.cc 라이브 배포 (Vercel)
- [x] GFM 전체, KaTeX 수학, Mermaid 다이어그램, 코드 하이라이팅
- [x] 모바일 반응형 레이아웃 (위아래 스플릿 뷰 포함)
- [x] 드래그 앤 드롭 .md 파일 지원
- [x] 짧은 URL 공유 (`mdfy.cc/{nanoid}`) — Supabase PostgreSQL 저장
- [x] hash 기반 공유 (fallback, Supabase 미설정 시)
- [x] 다크/라이트 모드 토글 (CSS 변수 시스템, localStorage 저장)
- [x] GitHub Actions CI (test → build-wasm → build-web)
- [x] 문서 수정/삭제 (editToken 기반, 계정 불필요)
- [x] OG 이미지 자동 생성 (@vercel/og)
- [x] Vercel Analytics + Speed Insights
- [x] 레이트 리밋 (IP당 분당 10회)
- [x] QR 코드 공유
- [x] About 페이지 (/about)
- [x] 런칭 포스팅 초안 (docs/launch/)

### Phase 2 완료

- [x] MD → PDF 내보내기 (브라우저 print + 커스텀 print CSS)
- [x] 비밀번호 보호 + 만료 URL (password_hash, expires_at)
- [x] Embed 코드 (iframe, /embed/[id])
- [x] 목적지별 최적화 복사 (Docs/Email용 rich text, Slack용 mrkdwn)
- [x] HTML → MD 변환 (Turndown, 붙여넣기 자동 감지)
- [x] 크롬 익스텐션 기본 구조 (apps/chrome-extension/)
- [x] 체크박스 토글 (렌더링 위에서 클릭 → MD 소스 sync)
- [x] 테이블 셀 편집 (더블클릭 → 인라인 편집 → MD 소스 sync)
- [x] AI 대화 모드 (ChatGPT/Claude 출력 자동 감지 + 정리)
- [x] Mermaid 비주얼 에디터 (캔버스 모드 — 자체 구현, 외부 라이브러리 0)
  - 노드 shape 4종 (round/square/circle/diamond)
  - 엣지 라벨, 방향 전환 (LR/TD)
  - Import: 기존 Mermaid 코드 → 캔버스 로드
  - Generate: 캔버스 → ```mermaid 코드블록

### 다음 작업 (Phase 3)

- [ ] @mdcore/engine npm 패키지 공개
- [ ] @mdcore/terminal CLI 렌더러
- [ ] Stripe 결제 (Pro 플랜)
- [ ] 사용자 계정
- [ ] API (mdcore.ai)

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

- `git push origin main` → GitHub Actions CI 실행 → Vercel 자동 배포
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

1. **에디터를 만들지 마라.** 에디터가 쓰는 엔진을 만들어라.
2. **표준을 선언하지 마라.** 너무 좋은 도구를 만들어서 그게 표준이 되게 하라.
3. **한 번에 하나만.** Phase 1이 죽으면 Phase 2는 없다.
4. **2주 안에 검증, 6주 안에 런칭.**
5. **Build in public.** 1인+AI 팀 자체가 마케팅.

---

## 전략 문서 참조

상세한 계획은 `docs/` 폴더 참조:
- `docs/ROADMAP.md` — Phase 0~4 전체 로드맵, 타임라인, KPI, GTM 전략
- `docs/ARCHITECTURE.md` — Rust 선택 근거, Surface Map, 컴파일 타겟 매트릭스
- `docs/MANIFESTO.md` — 프로젝트 철학과 비전
- `docs/MASTER-PLAN.md` — 마스터 플랜

---

## 자주 겪는 문제

| 문제 | 원인 | 해결 |
|------|------|------|
| WASM 빌드 실패 (syntect) | onig C 라이브러리가 wasm32에서 컴파일 불가 | syntect 의존성 제거, highlight.js 사용 |
| WASM 빌드 실패 (bulk memory) | wasm-opt가 bulk memory operations 미지원 | `wasm-opt = false` 설정 |
| Mermaid가 텍스트로 표시 | postprocess.ts regex가 comrak 출력 형식과 불일치 | `<pre lang="mermaid">` 형식에 맞게 regex 수정 |
| CI의 npm ci 실패 | package-lock.json 없음 | `npm install` 사용 |
| git push 거부 | 원격에 rebuild-wasm workflow가 커밋 생성 | `git pull --rebase` 후 push |
