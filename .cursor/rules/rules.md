# Claude.md — app-psy-sophia Stack Guide (v1)

> **Purpose**: Give a coding agent everything it needs to build and ship **app-psy-sophia** (community‑driven deals/promos app for Morocco) across **Expo (mobile)**, **Next.js (web)**, and **Django REST (API)**. This doc captures the agreed architecture, constraints, and conventions.

---

## 0) Product brief (essentials)
- **Core**: 
- **Ranking**: 
- **Locales**: FR + AR (RTL) + Darija. Numbers may contain **Arabic‑Indic digits**;
- **Compliance**: CNDP (Morocco). If API/web workloads run in EU and touch personal data, notify **transfer** in addition to treatment declaration.

---

## 1) High‑level architecture
```
Mobile (Expo RN) ────────────────┐ 
                                 │ 
            (JWT: in‑memory      │ 
             + SecureStore)      │ 
                                 ▼ 
                       ┌────────────────────────────┐
                       │  Django REST API (Render)  │
                       │  Auth, ...   │
                       └───────────────┬────────────┘
                                       │
                              private tunnel / allow‑list
                                       │
                               PostgreSQL (Morocco)
                             Redis (cache/queues; opt.)
                               MinIO + CDN (media)
```
- **API ↔ DB**: DB hosted in a Moroccan DC (e.g., N+ONE/inwi). API runs in EU (e.g., Frankfurt) with **tunnel** or **egress IP allow‑listing**.
- **Media**: Upload to MinIO via **pre‑signed URLs**, served behind CDN. Thumbnails/variants.
- **Background jobs**: Celery for notifications, scoring aggregation, duplicate sweeps.

---

## 2) Monorepo layout (Turborepo + PNPM)
```
app-psy-sophia/
├─ apps/
│  ├─ mobile/                 # Expo (public app)
│  └─ api/                    # Django REST (backend)
├─ packages/
│  ├─ ui/                     # RN design system (StyleSheet)
│  ├─ state/                  # Zustand stores (UI; session per‑platform)
│  ├─ queries/                # TanStack Query (keys, hooks, net listeners)
│  ├─ api-client/             # Fetcher abstraction (native vs web BFF)
│  ├─ schemas/                # Zod schemas (shared validation)
│  └─ utils/                  # Helpers (format, i18n, platform)
├─ infra/                     # docker-compose (Postgres, Redis, MinIO, Mailhog), tunnel samples
├─ config/                    # tsconfig, eslint, prettier, babel
├─ .github/workflows/         # CI: api, mobile, web
├─ docs/                      # ARCHITECTURE.md, CNDP-CHECKLIST.md, CONTRIBUTING.md
└─ turbo.json, pnpm-workspace.yaml, package.json, .env.example
```

---

## 3) Frontend: shared UI strategy
### 3.1 Design system
- **React Native primitives** only (`View`, `Text`, `Pressable`, `TextInput`, `Modal`, `FlatList`).
- Styling via **StyleSheet**, with **tokens** + **ThemeProvider** (light/dark). No Tailwind on mobile.
- **expo-image** as the default image component; provide a **web override** to `next/image` if needed later.
- Provide **.web.tsx / .native.tsx** overrides for platform‑specific optimizations.

**Key components** (in `packages/ui`): `Button`, `Card`, `Tag`, `Badge`, `TextField`, `NumberField`, `Select`, `Switch`, `DateField`, `ImageField (expo-image)`, `DealCard`.

### 3.2 Accessibility & i18n
- Always set `accessibilityRole`, labels, and ensure focus order (web). RTL friendly layout using `start/end` instead of left/right.
- i18n in `packages/utils/i18n.ts`; forms errors come from **Zod** for consistent translation.

---

## 4) State & data fetching
### 4.1 TanStack Query (shared)
- Lives in `packages/queries` with **stable query keys** (`qk.deals(params)`, `qk.deal(id)`, `qk.comments(dealId)`, `qk.me`).
- Setup **online/focus managers** per platform: `mobile.net.ts` (NetInfo/AppState) and `web.net.ts` (document visibility/navigator.online).
- Offline cache (optional) on mobile with AsyncStorage/MMKV.

### 4.2 Zustand (shared UI; per‑platform session)
- `packages/state/ui.ts`: UI filters (`sort`, `window`, `city`), modal states, prefs, draft forms. **Do not** store API data here.
- `packages/state/session.native.ts`: mobile **access token in memory** (not persisted), refresh token in **SecureStore**. 
- `packages/state/session.web.ts`: web uses **cookies HttpOnly**; store can keep `user` only.

### 4.3 API client abstraction
- `packages/api-client/http.ts` exposes `createHttp(env: 'native'|'web')`:
  - **native**: adds `Authorization: Bearer <accessToken>`.
  - **web**: uses `credentials: 'include'` to send cookies to a **Next BFF** at `/api/*`.

---

## 5) Forms (react-hook-form + Zod)
- All validation in **Zod** (`packages/schemas`) for shared logic.
- Special numeric preprocessor: **Arabic‑Indic digit support** and locale number parsing → floats (MAD).
- Typical discriminator: `channel ∈ {online, in_store}` with differing required fields (`url` vs `city`).
- File/image pickers: client uploads to MinIO via pre‑signed URL; set `proofImageUri` in payload.

**DealCreate schema (summary)**
- `title` (6..140), `merchantId`, `priceNow`, optional `priceWas > priceNow`, `couponCode?`, `expiresAt?`, `proofImageUri?`, `sourceUrl?`
- `online`: requires `url`; `in_store`: requires `city`
- Require **one proof** at least (image or source URL)

---

## 6) Ranking & feeds (no heavy algorithm)
- **Pure +1/−1 net score**, but reflect **time windows**:
  - **Hot 24h**: sum of votes within last 24h; show only if ≥ **5 votes**.
  - **Top 30d / 365d**: sum within window.
  - **Trends 6h**: sum within last 6h; order by recent delta.
- **Downvote reasons** (spam/fake price/expired). Without a reason, treat as −0.5 (configurable).
- **New accounts** (<24h): vote weight 0.5 (configurable). 
- **Duplicates**: merge target absorbs votes; display redirect notice on duplicates.

**Data**:
- `votes(deal_id, user_id, value, created_at)`; enforce 1 vote per user+deal at DB level.
- Materialize `deal_scores(deal_id, score_6h, score_24h, score_30d, score_365d, trend_6h, updated_at)` via Celery periodic tasks or SQL views + refresh jobs.

---

## 7) Backend (Django REST)
### 7.1 Apps
- `users`, `deals`, `votes`, `comments`, `merchants`, `moderation`, `subscriptions`, `notifications`.

### 7.2 Models (simplified)
**Deal**
- `id`, `title`, `merchant` (FK), `channel` (online/in_store), `city?`, `url?`, `price_now`, `price_was?`, `discount_pct (computed)`, `expires_at?`, `evidence` (image url/source url), `status` (active/expired/merged_into), `author`, timestamps.

**Vote**
- `user`, `deal`, `value ∈ {1,−1}`, `reason?`, `created_at`
- **UniqueConstraint** on `(user, deal)`.

**Comment**
- `user`, `deal`, `body`, `created_at`, `edited_at?`

**Merchant**
- `name`, `website?`, `trust_score` (baseline 0), locations (optional).

**Moderation**
- Flags with reason; duplicate links; resolutions (+ audit log).

**Subscription**
- `user` + one of: `category | merchant | keyword | city | price_max`

**Notification**
- Push/payload logs; failure reasons; token lifecycle.

### 7.3 Endpoints (sketch)
- `POST /auth/login`, `POST /auth/refresh`, `POST /auth/register`, `POST /auth/logout` (mobile uses JWT; web uses cookies via BFF)
- `GET /me`
- `GET /deals?sort=hot|top|new&window=24h|30d|365d&city=&merchant=&category=&online=`
- `POST /deals` (create), `PATCH /deals/{id}` (author/mod only)
- `POST /deals/{id}/expire`, `POST /deals/{id}/merge` (mods)
- `POST /votes` (idempotent upsert), `DELETE /votes/{dealId}`
- `GET/POST /comments`
- `GET/POST /subscriptions` (manage alerts)

### 7.4 Permissions & throttling
- Author can edit own deals; moderators can edit any. 
- Throttles: posting deals/comments/votes per IP & per user (e.g., 60/h votes, 10/h comments, 5/h deals; tune later).
- Anti‑abuse: dampen new users, require reasons for downvotes to have full impact.

### 7.5 Background tasks (Celery)
- Recompute windowed scores; auto‑expire by `expires_at`.
- Notification digests (daily) + instant “big deal” push (`score_6h ≥ 30` or `trend_6h ≥ 20` and clicks ≥ 10).
- Duplicate sweeps (title/domain/price proximity, image pHash).

### 7.6 Security
- Argon2 password hashing; DRF throttling; `django-axes` (option) for login brute force.
- CORS restricted to prod web origin; CSRF for cookie flows; strict JSON content types.
- Validate uploads (MIME/size/virus scan) before publishing image URLs.

---

## 8) Web (Next.js)
- **App Router** with a **BFF** under `/app/api/*` that proxies to Django, forwarding cookies and adding CSRF where needed.
- **RNW integration**: alias `react-native → react-native-web`, transpile shared packages.
- **SEO**: sitemaps (categories/merchants/cities), structured data (`Offer`/`Product`), canonical URLs, pagination tags.
- **PWA**: offline read for lists/images; defer SSR if not needed initially (CSR is acceptable at first).

**BFF example**:
- `/app/api/deals/route.ts` forwards query to `${API_BASE}/deals`, returns response body + content‑type. Writes add CSRF header if required.

---

## 9) Mobile (Expo)
- **Expo Router**; deep links/universal links planned.
- **Auth**: access token in memory; refresh in **SecureStore**; auto refresh on 401.
- **Push**: `expo-notifications`; topics (big deals, subscriptions, daily digest). Token rotation & cleanup.
- **Images**: `expo-image` with BlurHash placeholders; prefetch thumbnails for lists.
- **Offline**: optional react‑query persistence; graceful retry banners.

---

## 10) Media pipeline
- Client picks image → requests **pre‑signed URL** → uploads to MinIO → posts deal with `proofImageUri`.
- Server validates download head (size/type), stores canonical path, and triggers thumbnail/variant generation.
- CDN edge cache with variant URLs (e.g., `w=160/320/640`).

---

## 11) Infrastructure & deployment
### 11.1 Local dev (`infra/docker-compose.yml`)
- Postgres, Redis, MinIO, Mailhog. API connects via env. Web & mobile point to localhost/BFF.

### 11.2 Staging/Prod
- **API**: Render (EU region). 
- **DB/MinIO**: Moroccan DC; private tunnel (Cloudflare Tunnel or Tailscale) or IP allow‑listing of PaaS egress.
- **Web**: Vercel or Render static. 
- **Mobile**: Expo EAS (builds/updates). 
- **Secrets**: 1Password/Doppler; no tokens in VCS. 
- **Backups**: Nightly DB snapshots + restore rehearsal; MinIO lifecycle (versions/retention).

---

## 12) Security & privacy
- **PII minimization**: email, username, salted hash; avoid storing IP/device unless strictly needed; redact in logs.
- **User rights**: export/delete endpoints; retention policy documented.
- **CNDP**: declare treatment; if API/web in EU access data → notify **transfer**; list subprocessors; DPA with providers.
- **Rate limits**: IP & user; blocklists; soft‑dampen suspected brigading instead of hard bans initially.

---

## 13) Testing strategy
- **Unit/component**: Jest + @testing-library/react‑native (mobile), Vitest + @testing-library/react (web), pytest (API).
- **Integration**: DRF endpoints (permissions, throttles, windows via freezegun), Next BFF (cookies/CSRF), RN screens + MSW.
- **E2E**: Mobile (Detox or Maestro) for create→vote→Hot; Web (Playwright) for browse→filter→vote→comment.
- **Contract**: OpenAPI (drf‑spectacular) + schemathesis fuzz on critical endpoints.
- **Static**: eslint/tsc, ruff/mypy/bandit, audits.

**Coverage targets**: overall ≥70%; critical (votes/scores/permissions) ≥90%.

---

## 14) Observability & analytics
- **Errors**: Sentry (mobile/web/api).
- **Product analytics**: PostHog/Matomo self‑hosted, events:
  - `deal_posted`, `deal_viewed`, `vote_cast`, `comment_posted`,
  - `notification_sent`, `notification_opened`, `click_outbound`,
  - `merge_duplicate`, `mark_expired`, `subscribe_created`.
- **SLIs**: p95 list fetch < 300ms, image TTFB < 150ms (CDN), push success rate > 98%.

---

## 15) Performance budgets
- Images ≤ 200KB for list thumbnails; use variants.
- RN list virtualization everywhere (FlashList/FlatList). Max initial render ≤ 12 rows.
- API pagination default 20–30, with index coverage.
- Web LCP < 2.5s on 3G Fast; keep JS for public pages < 200KB (gzip) initially.

---

## 16) Environment variables (samples)
```
# Common
EXPO_PUBLIC_API_BASE=https://api.app-psy-sophia.ma
NEXT_PUBLIC_API_BASE=/api               # Next BFF path
IMAGES_BASE=https://cdn.app-psy-sophia.ma

# API
DJANGO_SECRET_KEY=...
DATABASE_URL=postgres://...
REDIS_URL=redis://...
MINIO_ENDPOINT=...
MINIO_ACCESS_KEY=...
MINIO_SECRET_KEY=...
ALLOWED_HOSTS=app-psy-sophia.ma,api.app-psy-sophia.ma

# Web BFF
API_BASE=https://api.app-psy-sophia.ma
CSRF_SECRET=...
```

---

## 17) Coding conventions
- Typescript strict in all TS packages; ESLint/Prettier enforced.
- React Query keys as tuples with literal params; no string concat.
- No business data in Zustand; only UI/session metadata.
- Zod schemas as the **source of truth** for client validation; mirror critical rules in DRF serializers.
- Avoid ever persisting access tokens on mobile; use SecureStore for refresh only.

---

## 18) Roadmap (first 30 days)
**Week 1**: Monorepo bootstrapped; auth flows; Deals/Votes/Comments CRUD; lists (Hot/Top/New) using windows.

**Week 2**: Image uploads (pre‑signed), duplicate detection v1, moderation basics, subscriptions + big‑deal notifications.

**Week 3**: Daily digest, city/merchant/category pages (mobile), analytics/Sentry, docker‑compose dev infra.

**Week 4**: Add Next app, BFF proxy, first public pages (category/merchant/city) + basic SEO; tighten rate limits.

---

## 19) Open questions / switches kept easy
- **Web images**: keep `app-psy-sophiaImage.web.tsx` ready to switch to `next/image` if needed.
- **Search**: Postgres FTS now; can swap to OpenSearch later.
- **Notifications**: start with thresholds; can add ML/heuristics later without touching API contracts.
- **Reputation**: implement after MVP; current voting guardrails suffice.

---

## 20) Glossary
- **Hot**: ranking by votes in last 24h (thresholded).
- **Top**: ranking by votes in last 30d/365d.
- **Trends**: recent 6h delta momentum.
- **Duplicate merge**: mark one deal as canonical; redirect votes/traffic.
- **Proof**: receipt/photo/URL establishing price validity.

---

**End of Claude.md v1** — This file is intentionally concise yet complete for a coding agent to bootstrap app-psy-sophia end‑to‑end. Update alongside code changes (keep in /docs and link from README).