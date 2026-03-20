# mdcore / mdfy — Product Roadmap v2

> 이전 버전 대비 변경 사항: 1인+AI 팀 전제로 타임라인 재조정, 모순 제거, MVP 범위 축소, GTM 전략 추가, 수익 모델 재설계, Phase 간 경계 명확화

---

## Vision

> Markdown은 AI의 네이티브 언어다.
> 우리는 AI 시대의 Markdown 인프라를 소유한다.

AI 에이전트의 입출력, RAG 파이프라인, 지식 관리, 문서 생성 — 모든 것이 Markdown으로 수렴하고 있다. Cloudflare가 "Markdown for Agents"를 발표하고, Visual Studio 2026이 Copilot과 Markdown 통합을 강화하는 지금, 이 시장은 형성 중이다. 아직 이 레이어를 "인프라 수준"에서 잡고 있는 플레이어가 없다.

---

## 팀 & 전제

- **팀 구성**: 파운더 1명 + AI(Claude) 페어 프로그래밍
- **투입**: 풀타임
- **강점**: 의사결정 즉시, 코딩 속도 팀 5명급, 피벗 즉시 가능
- **약점**: 마케팅/커뮤니티에 직접 시간 투입해야 함, 동시에 여러 제품 운영 불가
- **원칙**: 한 번에 하나만 제대로. 다음 Phase는 이전 Phase가 작동할 때만.

---

## 시장 현황 — 왜 지금인가

### Markdown이 AI 인프라가 된 증거들

- **Cloudflare**: "Markdown for Agents" 출시. HTML → MD 자동 변환, `Accept: text/markdown` 헤더로 콘텐츠 협상.
- **Laravel Cloud**: 동일한 HTTP content negotiation 기반 Markdown for Agents 기능 출시.
- **Visual Studio 2026**: Copilot이 생성한 Markdown을 IDE 내에서 직접 프리뷰. Mermaid 렌더링 통합.
- **모든 LLM**: ChatGPT, Claude, Gemini — 전부 Markdown으로 출력. 사실상 AI의 표준 출력 포맷.

### 핵심 문제 — 표준의 파편화

CommonMark이 10년 전 표준화를 시도했지만, 현실은 GFM, MDX, Obsidian flavor, Markdoc 등이 각각 다르게 동작한다. AI 에이전트가 생성하는 Markdown은 어떤 스펙도 따르지 않는다.

### 경쟁 환경

| 영역 | 기존 플레이어 | 약점 |
|------|-------------|------|
| 에디터 | Obsidian, Typora, Bear | 에디터끼리의 싸움. AI-native가 아님 |
| 지식관리 | Notion, Logseq | Markdown은 내부 포맷일 뿐, 인프라를 제공하지 않음 |
| 변환 | Pandoc | CLI 기반, UX 없음, API 없음, AI 비인지 |
| 파서 | markdown-it, remark, micromark | AI 확장 없음, 렌더링은 각자 알아서 |
| AI 출력 → 문서 | 없음 | **이것이 빈 공간** |

---

## 도메인 전략

```
mdfy.cc        →  핵심 제품 (변환 + 공유 + 렌더링)
mdfy.online    →  mdfy.cc로 리다이렉트 (보조 도메인)

mdcore.ai      →  기술 플랫폼 & API (Phase 3)
mdcore.org     →  오픈소스 커뮤니티 & 거버넌스 (Phase 2)
mdcore.md      →  스펙 문서 & 플레이그라운드 (Phase 4)
```

> ⚠️ v1에서 mdfy.online을 "웹 에디터"로 배정했으나, "에디터를 만들지 마라" 원칙과 모순. mdfy.cc로 리다이렉트하는 보조 도메인으로 변경.

---

## Phase 0: 검증 (Week 1–2)

### 왜 Phase 0가 필요한가

코드를 쓰기 전에 수요를 확인한다. 2주를 투자해서 "이 제품을 사람들이 원하는가"를 검증한다.

### 실행

1. **랜딩 페이지** — mdfy.cc에 원페이지 배포
   - 헤드라인: "Paste Markdown. Get a beautiful document."
   - 이메일 수집 (waitlist)
   - 3개 핵심 가치: Share / Convert / Beautify

2. **수요 테스트 포스팅**
   - Hacker News "Show HN" (랜딩 페이지만으로도 가능)
   - Reddit r/ChatGPT, r/ClaudeAI, r/SideProject
   - Twitter/X (AI + developer 커뮤니티)
   - Product Hunt "Coming Soon" 페이지

3. **통과 기준 (Go/No-Go)**
   - waitlist 200명+ → Phase 1 진행
   - waitlist 50~200명 → 메시지 수정 후 재시도
   - waitlist 50명 미만 → 가치 제안 재검토

---

## Phase 1: mdfy.cc MVP — "Paste. Share. Done." (Week 3–8)

### 범위 — 의도적으로 좁게

v1 로드맵에서 4개 기능을 동시에 넣으려 했던 것을 수정. **딱 하나만 먼저 완벽하게 한다.**

**MVP 핵심 기능 (오직 하나)**:
> Markdown을 붙여넣으면 아름다운 공유 URL이 생긴다.

이것만 한다. 변환(PDF/DOCX)은 Phase 1.5에서. API는 Phase 2에서.

### 구체적 동작

1. 사용자가 mdfy.cc에 접속
2. Markdown 텍스트를 붙여넣기 (또는 .md 파일 드래그앤드롭)
3. 실시간으로 아름답게 렌더링된 프리뷰 표시
4. "Share" 클릭 → `mdfy.cc/abc123` 고유 URL 생성
5. 누구나 이 URL로 아름답게 렌더링된 문서를 볼 수 있음

### 렌더링이 핵심 경쟁력

GitHub Gist와의 차이점은 **렌더링 퀄리티**다:

- 타이포그래피: 본문, 제목, 코드 각각 최적의 폰트 + 간격
- 코드 블록: 언어별 신택스 하이라이팅 + 원클릭 복사
- 수식: KaTeX 기본 지원
- 다이어그램: Mermaid 기본 지원
- 테이블: 정렬, 스트라이핑, 반응형
- 다크/라이트 모드
- 모바일 완벽 대응

### 기술 스택

```
프론트엔드    Next.js 15 + TailwindCSS + shadcn/ui
렌더러       unified (remark + rehype) 기반 커스텀 파이프라인
             → 이것이 나중에 @mdcore/renderer가 됨
스토리지     Cloudflare R2 (또는 Supabase Storage)
데이터베이스  Supabase (PostgreSQL)
인프라       Vercel (프론트) + Cloudflare Workers (API)
인증         없음 (MVP). 나중에 Clerk 또는 Supabase Auth
```

### Phase 1 마일스톤

- **Week 3–4**: 렌더링 엔진 + 붙여넣기 UI + URL 생성
- **Week 5–6**: 테마 2종 (Light Minimal, Dark Developer) + 모바일 대응
- **Week 7**: 수정/삭제 기능, 비밀번호 보호 옵션
- **Week 8**: 퍼포먼스 최적화 + 런칭

### Phase 1 런칭 채널

- Product Hunt 런칭
- Hacker News "Show HN"
- Twitter/X thread: "I built the Gist for Markdown documents"
- Reddit: r/webdev, r/SideProject, r/ChatGPT

### Phase 1 성공 기준

- DAU 500+
- 생성된 URL 5,000+
- 유기적 공유 발생 (다른 사람이 mdfy.cc 링크를 퍼가는 것)

---

## Phase 1.5: 변환 + 수익화 (Week 9–14)

### 왜 분리했는가

변환은 "있으면 좋은 것"이지 MVP의 핵심이 아니다. Phase 1에서 사람들이 실제로 공유 기능을 쓰는 걸 확인한 후에 추가한다.

### 추가 기능

1. **MD → PDF 내보내기**: 렌더링된 문서를 PDF로 다운로드
2. **MD → HTML 내보내기**: 스타일 포함된 standalone HTML
3. **AI Output 모드**: ChatGPT/Claude 대화 형식 자동 감지 → 깔끔한 문서로 정리
4. **Embed**: `<iframe>` 코드 생성 — 블로그, Notion 등에 삽입 가능

### 수익 모델 (v2 — 사용량 기반 하이브리드)

v1의 고정 가격 모델을 수정. 업계 트렌드에 맞춰 사용량 기반 하이브리드로 전환.

| 티어 | 가격 | 내용 |
|------|------|------|
| Free | $0 | 월 10개 URL 생성, 공개만, mdfy.cc 워터마크, PDF 내보내기 3회/월 |
| Pro | $12/월 | 무제한 URL, 비공개 옵션, 워터마크 제거, 무제한 내보내기, 커스텀 테마, 커스텀 도메인 |
| Team | $29/월 | Pro + 팀 워크스페이스, 브랜딩, 분석 대시보드 |

> 왜 $12인가: $9는 너무 저렴하고, $15는 개인이 망설이는 구간. $12는 "커피 2잔"으로 포지셔닝 가능하며 연간 결제($99/yr) 할인이 깔끔.

### Phase 1.5 성공 기준

- 유료 전환율 2%+ (Free → Pro)
- MRR $1,000+ 달성
- PDF 내보내기 사용률이 공유보다 높으면 → 변환 중심 피벗 고려

---

## Phase 2: @mdcore 오픈소스 엔진 (Month 4–8)

### 왜 이 시점인가

- Phase 1/1.5에서 렌더링 엔진을 이미 만들었음. 이걸 추출하여 오픈소스화.
- 사용자가 있으니 "실전 검증된" 엔진으로 공개할 수 있음.
- Cloudflare의 "Markdown for Agents"와 상호보완적 — Cloudflare는 HTML→MD, 우리는 MD→렌더링.

### 핵심 컴포넌트 (축소)

v1에서 5개 패키지를 계획했으나, 1인 팀에서 5개는 비현실적. **2개로 시작.**

```
@mdcore/engine      — 파서 + 렌더러 통합 패키지
                       CommonMark superset, 플러그인 기반
                       (remark/rehype 위에 구축, 0부터 쓰지 않음)

@mdcore/themes      — 렌더링 테마 컬렉션
                       mdfy.cc에서 검증된 테마를 패키지로 공개
```

나중에 수요가 생기면 분리:
```
@mdcore/parser      → @mdcore/engine에서 분리
@mdcore/renderer    → @mdcore/engine에서 분리
@mdcore/transformer → Phase 3에서 추가
@mdcore/extensions  → Phase 4에서 추가
```

### AI-Native 확장 — 접근 방식 수정

v1에서 `:::directive` 문법을 제안했으나, MDX/Markdoc/Pandoc과 충돌 우려.

**수정된 접근**: 기존 frontmatter 확장 + 주석 기반 어노테이션으로 시작.

```markdown
---
mdcore: 1.0
ai:
  model: claude-opus-4
  generated_at: 2026-03-05T09:00:00Z
  token_count: 1247
  prompt_hash: sha256:abc123
  human_edited: true
---

# 분석 리포트

<!-- @ai-generated -->
이 섹션은 AI가 생성한 콘텐츠입니다.
<!-- @/ai-generated -->

<!-- @source: https://example.com -->
AI가 참조한 원본 소스에서 발췌한 내용.
<!-- @/source -->
```

**왜 이 방식인가:**
- frontmatter는 이미 모든 Markdown 도구가 지원
- HTML 주석은 모든 Markdown 렌더러가 무시하므로 하위 호환성 100%
- 기존 .md 파일이 깨지지 않음
- 나중에 `:::directive`로 마이그레이션해도 병행 가능

### Phase 2 마일스톤

- **Month 4**: @mdcore/engine v0.1 (mdfy.cc 렌더러 추출 + 정리)
- **Month 5**: npm 공개 + README + mdcore.org에 문서
- **Month 6**: @mdcore/themes v0.1 + GitHub 공개
- **Month 7–8**: 커뮤니티 피드백 반영 + v0.2

### Phase 2 성공 기준

- npm 주간 다운로드 1,000+
- GitHub 스타 500+
- 외부 기여자 5명+

### GTM (오픈소스)

- GitHub 공개 + README에 mdfy.cc 렌더링 데모 링크
- "Awesome Markdown" 목록 등재
- dev.to / Hashnode 블로그 시리즈: "Building an AI-native Markdown engine"
- Cloudflare의 Markdown for Agents 관련 기술 블로그에 연결

---

## Phase 3: mdcore.ai API 플랫폼 (Month 7–12)

### v1과의 차이 — 범위 축소

v1에서 4개 서비스(Rendering API + Agent Content Hub + Validation API + Theming Marketplace)를 동시에 계획했으나, **API 하나에 집중**.

### 핵심 제품: Markdown Rendering API

```
POST https://api.mdcore.ai/v1/render
Content-Type: application/json

{
  "markdown": "# Hello\n\nThis is **bold**.",
  "theme": "minimal-light",
  "output": "html"  // "html" | "png" | "pdf"
}
```

**타겟 고객:**
- AI 챗봇/에이전트 개발자: AI 출력을 예쁘게 보여주고 싶은 사람들
- SaaS 제품: 사용자 콘텐츠에 Markdown 렌더링이 필요한 서비스
- 문서 도구: Markdown → PDF/이미지 변환이 필요한 곳

**mdfy.cc와의 관계:**
- mdfy.cc = B2C (개인 사용자가 브라우저에서 직접 사용)
- mdcore.ai API = B2B/B2D (개발자가 자기 서비스에 통합)
- 내부적으로 같은 @mdcore/engine 사용

### 수익 모델 (사용량 기반)

| 티어 | 가격 | 내용 |
|------|------|------|
| Free | $0 | 월 1,000 API 콜, 워터마크 |
| Starter | $19/월 | 월 10,000 콜, 워터마크 제거 |
| Growth | $49/월 | 월 100,000 콜, 커스텀 테마 |
| Scale | $199/월 | 월 1,000,000 콜, SLA, 전용 지원 |
| 초과분 | $0.001/콜 | 모든 유료 티어에 적용 |

### Phase 3 마일스톤

- **Month 7**: API v1 베타 (HTML 출력만)
- **Month 9**: PNG/PDF 출력 추가 + 공식 런칭
- **Month 10**: SDK 배포 (JS, Python)
- **Month 12**: self-hosted 옵션 (Enterprise)

### Phase 3 성공 기준

- API 월 호출 10만+
- 유료 API 고객 20+
- API MRR $2,000+

---

## Phase 4: 표준화 (Month 12–18+)

### 진입 조건 — 이전 Phase들이 작동할 때만

- mdfy.cc MAU 5,000+
- @mdcore/engine npm 주간 다운로드 2,000+
- mdcore.ai API 활성 사용자 50+

위 조건 중 2개 이상 충족 시 Phase 4 진입. 아니면 Phase 1–3 강화에 집중.

### 접근

1. **mdcore.md**에 "AI-Native Markdown Specification v1.0" 초안 공개
2. GitHub Discussions로 커뮨니티 피드백 수집
3. 주요 AI 회사들(Anthropic, OpenAI, Google)에 피드백 요청
4. 에디터/도구 메이커들과 워킹 그룹 구성
5. IETF 또는 W3C에 RFC 제출 검토

### 스펙에 포함될 내용

- AI 메타데이터 frontmatter 표준 (`mdcore` 키)
- AI 생성 콘텐츠 어노테이션 (주석 기반 → 디렉티브 전환 검토)
- 프롬프트 해시 / 재현성 메타데이터
- `Accept: text/markdown` content negotiation 표준 (Cloudflare 방식 확장)
- 토큰 카운트 메타데이터

---

## 전체 타임라인

```
Week  1─2    3─────8    9────14    Month 4──8    7──12    12──18+
  │           │           │          │             │         │
  ▼           ▼           ▼          ▼             ▼         ▼
Phase 0     Phase 1    Phase 1.5   Phase 2      Phase 3   Phase 4
검증        MVP         수익화      오픈소스     API       표준화
랜딩페이지   공유URL     변환+결제   엔진공개    플랫폼    스펙제안
waitlist    런칭                    npm공개     런칭

           mdfy.cc ──────────────────────────────────────────→
                                    mdcore.org ──────────────→
                                                mdcore.ai ───→
                                                        mdcore.md
```

---

## Go-to-Market 전략 (전체)

### 핵심 원칙: "개발자 → 개발자" 바이럴

Markdown을 가장 많이 쓰는 사람은 개발자와 AI 사용자다. 이들은 좋은 도구를 발견하면 자발적으로 공유한다.

### 채널별 전략

| 채널 | Phase 0–1 | Phase 1.5–2 | Phase 3–4 |
|------|-----------|-------------|-----------|
| Hacker News | Show HN 런칭 | 기술 블로그 포스팅 | 스펙 발표 |
| Twitter/X | 빌드 과정 공유 #buildinpublic | 오픈소스 공개 | 워킹 그룹 모집 |
| Reddit | r/SideProject, r/ChatGPT | r/webdev, r/javascript | r/programming |
| Product Hunt | 런칭 | 업데이트 | — |
| dev.to/Hashnode | — | 기술 시리즈 연재 | 스펙 설명 |
| GitHub | — | 오픈소스 + README | Discussions |

### Build in Public 전략

1인+AI 팀이라는 것 자체가 스토리. "Claude와 함께 AI-native Markdown 인프라를 만들고 있습니다"는 2026년에 강력한 내러티브.

- 매주 1회 Twitter/X 스레드: 진행 상황 + 배운 것
- 매월 1회 블로그 포스트: 기술적 의사결정 과정
- mdfy.cc 자체를 사용해서 이런 글을 공유 (dogfooding)

---

## 핵심 지표 (KPI) 요약

| Phase | 기간 | 핵심 지표 | 목표 |
|-------|------|-----------|------|
| 0 | Week 1–2 | Waitlist | 200+ |
| 1 | Week 3–8 | DAU | 500+ |
| 1.5 | Week 9–14 | MRR | $1,000+ |
| 2 | Month 4–8 | npm 주간 DL | 1,000+ |
| 3 | Month 7–12 | API MRR | $2,000+ |
| 4 | Month 12–18 | 스펙 채택 도구 | 5+ |

---

## 리스크 & 대응

| 리스크 | 확률 | 대응 |
|--------|------|------|
| Phase 0에서 수요 검증 실패 | 중간 | 메시지 피벗. "공유" → "변환" → "AI 문서화"로 가치 제안 변경 |
| Cloudflare가 렌더링까지 확장 | 낮음 | Cloudflare는 인프라에 집중. UX 제품은 우리 영역 |
| 에디터 시장 진입 유혹 | 중간 | 에디터는 만들지 않는다. 에디터가 쓰는 엔진을 만든다 |
| 표준 채택 실패 | 중간 | 표준 없이도 도구와 API로 수익 가능한 구조 |
| 대형 AI 회사가 자체 스펙 발표 | 중간 | 오히려 기회. 통합 표준의 필요성이 커짐 |
| 번아웃 (1인 팀) | 높음 | Phase별 명확한 Go/No-Go 기준. 안 되면 쉬거나 피벗 |
| 무료 사용자만 몰림 | 높음 | Free 제한 엄격하게. 워터마크가 곧 마케팅 |

---

## 핵심 원칙

1. **에디터를 만들지 마라.** 에디터가 쓰는 엔진을 만들어라.
2. **표준을 선언하지 마라.** 너무 좋은 도구를 만들어서 그게 표준이 되게 하라.
3. **한 번에 하나만.** Phase 1이 죽으면 Phase 2는 없다.
4. **2주 안에 검증, 6주 안에 런칭.** 완벽한 제품이 아니라 작동하는 제품.
5. **변환으로 돈을 벌고, 렌더링으로 시장을 잡고, 표준으로 해자를 만들어라.**
6. **Build in public.** 1인+AI 팀 자체가 마케팅.

---

## 즉시 다음 행동 (Phase 0)

- [ ] mdfy.cc 랜딩 페이지 디자인 & 카피 작성
- [ ] 랜딩 페이지 배포 (Vercel)
- [ ] waitlist 이메일 수집 설정
- [ ] Hacker News / Reddit / Twitter 포스팅 초안
- [ ] 2주 후 Go/No-Go 판단

---

*Last updated: 2026-03-05*
*Version: 2.0*
