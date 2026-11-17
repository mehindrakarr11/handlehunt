# HandleHunt — Phase 1

A polished Next.js App Router application for discovering and ranking short Instagram-style handle ideas. **No generated handle is asserted to be available.** The app has a manual verification workflow and local save/export tools, but **it does not perform automated Instagram checks.**

## Quick start

Requires Node.js 20.9+ (Node.js 22 LTS recommended), npm, and internet access for initial package installation.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

No `.env` variables, login, database, Instagram access token, or Meta account is required for Phase 1. See `.env.example`.

## Project structure

```text
handlehunt/
├── __tests__/
│   └── generator.test.ts          # Pure generator tests
├── public/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── availability/route.ts # Honest manual-required adapter
│   │   │   ├── generate/route.ts   # POST generator API
│   │   │   └── health/route.ts     # GET service capabilities
│   │   ├── about/page.tsx         # Verification + privacy explanation
│   │   ├── saved/page.tsx         # Browser-persisted shortlist
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx               # Discovery dashboard
│   ├── components/
│   │   ├── discovery-page.tsx
│   │   ├── handle-card.tsx
│   │   ├── saved-page.tsx
│   │   ├── site-shell.tsx
│   │   └── verification-dialog.tsx
│   └── lib/
│       ├── client-store.tsx      # localStorage context
│       ├── csv.ts                # Safe CSV export
│       ├── handle-generator.ts  # Core logic + scoring + validation
│       ├── types.ts
│       ├── verification/provider.ts # Future verification boundary
│       └── words.ts             # Curated short real-word pool
├── .env.example
├── eslint.config.mjs
├── next-env.d.ts
├── package.json
├── postcss.config.mjs
└── tsconfig.json
```

## What Phase 1 actually does

- Generate up to 100 3–6 letter candidates per batch via `POST /api/generate`.
- Choose **Balanced**, **Real words**, **Invented**, or **Minimal**; select length range and optional inspiration / prefix / substring / suffix; optionally require a vowel.
- Rank with a **brand score** (aesthetic heuristic based on length/pronounceability/letter patterns). This is **not** a rarity, popularity, account-existence, availability, or trademark score.
- Search/sort/filter candidates; bookmark and remove names; store list and manual checks in this browser's `localStorage`.
- Open official Instagram settings/profile links and record a user-observed status and timestamp.
- Export filtered results or saved handles as CSV.
- Build/run without secret keys, Instagram cookies, scrapers, or proxies.

### API examples

```bash
curl -X POST http://localhost:3000/api/generate \
  -H 'content-type: application/json' \
  -d '{"minLength":3,"maxLength":5,"count":30,"style":"balanced","inspiration":"sky","startsWith":"","contains":"","endsWith":"","requireVowel":true}'

curl 'http://localhost:3000/api/availability?username=heaven'
# Returns "manual_required". It does not contact Instagram.

curl 'http://localhost:3000/api/health'
```

### Verification status meaning

| Status | What it means |
|---|---|
| Unverified | No user check is recorded; this is the default for all suggestions. |
| Appeared claimable | A user manually reported that Instagram's username editor appeared to allow it at a point in time. **Not guaranteed available now**. |
| Not claimable | A user manually saw an indication it could not be used. |
| Claimed by you | A user reports they actually set it on their own account. |

For an authoritative decision, the person must attempt the username in Instagram's own username editor. A profile URL returning an error or no page does **not** mean the handle can be registered. Never use the app as a bulk username checker.

### Limitations and operational notes

- Dictionary names may already be taken, reserved, blocked, or trademarked. Invented names can also be taken.
- "Real words" mode has a finite pool. If filters are too restrictive, the backend returns fewer than requested rather than inventing fake dictionary words.
- Data is **browser-only**; clearing site data loses the saved list. The CSV export is a portable backup.
- There is **no account management** and no multi-user synchronization in Phase 1.
- Generator route bounds count and length; **before opening a public API to third parties, add a durable rate limiter and abuse monitoring**.
- Not affiliated with Meta/Instagram. Respect Meta's terms and rights of third parties. Do not collect login credentials or develop automated scraping as a shortcut to claiming usernames.

## Phase 2 / 3 roadmap

1. Add PostgreSQL + Prisma for registered users, watchlists, audit events, and per-account privacy.
2. Add authentication (e.g. Auth.js) and proper user-specific authorization for saved names and verification reports.
3. Track verification **evidence type**, checked timestamp, expiry window, and manual/source reliability rather than claiming global real-time availability.
4. Consider an authorized official integration only **if Meta exposes the necessary API and grants appropriate access**; until then `VerificationProvider` deliberately returns `manual_required`. Do not ship private endpoint probes, proxy rotation, credential reuse, or scraping bypasses.
5. Add background jobs only for permitted tasks (generation, score recalculation, local analytics), not unauthorized Instagram crawling.
6. Add a moderation/reporting mechanism, API rate limiting, and privacy-policy review before public launch.

## Technology

Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, Lucide icons. No database or external API for Phase 1.

## Notes for development

The initial source archive intentionally contains no `node_modules` or platform-specific build artifacts. After downloading, run `npm install` on a connected machine. A full Next.js production build requires npm dependencies to be installed.
