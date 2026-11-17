# HandleHunt

A Next.js 16 / React 19 / TypeScript / Tailwind discovery workspace for memorable Instagram-style usernames. Ranking measures creative quality, **never availability**. No scraping, private Instagram endpoints, credential collection or automated signup/OTP flows.

## Run locally

Use Node.js 22+ (Node 24 was validated), npm and an existing checkout. Cloud tasks are already isolated; no Git worktree is needed.

```bash
npm ci
npm run dev -- --hostname 0.0.0.0
```

Open the app on port 3000 in your normal local development environment. `/` is the landing page; `/discover` is the generator. `/saved`, `/queue`, `/history` and `/settings` form the private workspace.

With **both Supabase variables absent**, the app runs a prominently labeled **local demo**. Saved handles, observations and recent history stay in this browser's localStorage, without an account or server persistence. Existing v1 browser data is migrated on load. Storage may be unavailable in private browsing; export CSV backups. Demo data is not automatically uploaded when cloud authentication is enabled. The collection and recent demo history are capped at 2,000 entries. Browser UI renders 24 results at a time; generation is bounded at 100 candidates per batch.

## Supabase setup

1. Create a Supabase project. In its SQL editor, run [`supabase/migrations/202611170001_handlehunt.sql`](supabase/migrations/202611170001_handlehunt.sql) **once**, or apply it through your normal Supabase migrations workflow. Never run `supabase/tests/bootstrap.sql` against a real project: it is only an isolated test shim.
2. Copy `.env.example` to `.env.local` and uncomment/set:
   - `NEXT_PUBLIC_SUPABASE_URL`: the project's HTTPS URL.
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: its **publishable** key. This key is intentionally public; RLS and authenticated ownership enforce data access. Never use a service-role or secret key in a `NEXT_PUBLIC_*` variable. No privileged key is needed by this app.
3. Enable email sign-in under Supabase Authentication. Set Site URL to your deployment origin and add exact redirect URLs such as `http://localhost:3000/auth/callback` and `https://your-domain.example/auth/callback` to the redirect allowlist. Links use the PKCE code exchange and should be opened in the browser that requested them.
4. The default sign-in email can contain a magic link. To support numeric email codes too, include `{{ .Token }}` in the Supabase magic-link email template while retaining `{{ .ConfirmationURL }}` for links. The login page accepts the HandleHunt email code. Supabase manages expiry, one-time use, email throttling and verification. Configure production SMTP, suitable auth rate limits and CAPTCHA in Supabase as appropriate to your deployment.
5. Restart the dev server. Public environment variables are inlined at build time: **rebuild before deployment whenever these change**. Sign in at `/login`; configure a second account to verify ownership separation in your project.
6. In restricted cloud environments, allow your exact Supabase project hostname in environment network settings. The required hostname is the host portion of `NEXT_PUBLIC_SUPABASE_URL`. The server needs HTTPS access to Supabase Auth and REST endpoints. npm installation uses `registry.npmjs.org`.

Cloud mode requires authentication for generation and all collection writes/reads. A server proxy refreshes session cookies and redirects unauthenticated workspace navigation. Every private API independently validates the session using Supabase `getUser()`. There is no demo fallback for failed cloud writes. Email delivery, project configuration and a real Supabase deployment require your own project; local PostgreSQL tests do not prove these services work.

These accounts belong to **HandleHunt**, not Instagram. Never enter an Instagram password, Instagram OTP or Instagram cookie into this app.

## Discovery and verification

- 2–10 characters, eight styles: balanced, real words, invented, minimal, aesthetic, brand-like, random and OG. OG restricts output to 2–5 clean letters.
- Prefix, suffix, substring, required keyword, inspiration and vowel filters. Defaults exclude numbers, dots and underscores; enable them explicitly. Pattern `?` means a letter, `#` a digit, and all other characters are literal. Example: `sky_??##` requires underscores and numbers enabled.
- Instagram-style syntax: lowercase letters, numbers, dots, underscores; no leading/trailing or consecutive dots. The product intentionally supports 2–10 characters rather than Instagram's entire maximum length.
- Deduplicated, bounded generation, client pagination, grid/table views, sorting, search and CSV export. A finite dictionary or very restrictive filters can return fewer names. Names may already be taken, reserved, restricted or trademarked.
- Brand score rewards brevity, vowels/pronunciation, dictionary quality, clean spelling and memorable patterns; punctuation, digits and awkward repetition reduce it. It is an aesthetic heuristic, not a rarity, popularity, trademark or account-existence score.

Save favourites, select them in `/queue`, and open Instagram's official website. Complete any signup, login and OTP there. Try a candidate in Instagram's own username field, then return and record what you observed. HandleHunt records server timestamps in cloud mode and browser timestamps in demo mode, the manual method, notes and history.

| State                  | UI label / meaning                          |
| ---------------------- | ------------------------------------------- |
| `UNVERIFIED`           | Unverified; no observation                  |
| `NEEDS_RECHECK`        | Needs recheck; repeat an older check        |
| `REPORTED_AVAILABLE`   | **User-reported available**; not guaranteed |
| `REPORTED_UNAVAILABLE` | User-reported unavailable at that time      |
| `RESERVED_OR_UNKNOWN`  | Reserved or unknown / unclear response      |
| `CLAIMED`              | Claimed by you; a user reports setting it   |

A claimed handle must move to Needs recheck (or Unverified) before a different observation. Old evidence does not establish current claimability. A missing profile, HTTP 404 or public-page error is **never proof that a username can be registered**.

`AvailabilityProvider` is an extension boundary only. The default provider is disabled for automated checking and returns `UNKNOWN`, `supported: false`, provider/source and timestamp. **No officially authorized availability integration is configured.** Instagram email/phone OTP is not permission for automated bulk checking. No private endpoints are contacted, and no Instagram credentials or tokens are stored.

## API and database

Responses use `{ ok: true, data: ... }` or `{ ok: false, error: { message } }`. Private routes return 401 without a valid cloud session, or 503 when cloud persistence is unconfigured. Writes reject foreign Origin headers. Zod validates request bodies, route IDs, usernames and pagination; streaming JSON bodies are limited to 8 KiB.

| Endpoint                                      | Behavior                                                                                              |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `POST /api/generate`                          | Bounded options; candidates, count, batch ID and unverified notice                                    |
| `GET /api/handles?page=1&limit=24&search=sky` | Owned collection; items and total; `exact=1` for an exact search                                      |
| `POST /api/handles`                           | Save a validated candidate, unique per user/username                                                  |
| `DELETE /api/handles/[id]`                    | Delete only the authenticated owner's UUID record                                                     |
| `GET /api/verifications?page=1&limit=24`      | Owned append-only observation history; `search` filters usernames                                     |
| `GET /api/verifications?current=1`            | Owned latest observations; same pagination                                                            |
| `POST /api/verifications`                     | `{username,status,method:"instagram_manual",note}`; atomically update current result and append event |
| `GET /api/health`                             | Configured mode/capabilities; deliberately **does not probe database connectivity**                   |
| `GET /api/availability?username=sky`          | Explicit unsupported/unknown provider result                                                          |

Tables: `user_profiles`, `generated_batches`, `saved_handles`, `handle_verifications`, `verification_events` and internal `rate_limit_buckets`. All have RLS; owner/time indexes support private queries. Profile IDs reference the auth UUID; other tables have UUID primary keys. Generation batches store options/counts, not every generated candidate. Cloud UI loads the newest 2,000 collection/check summaries; complete history and larger collections remain accessible through paginated APIs.

Authenticated generation has atomic PostgreSQL limits (30/minute/user), and collection/verification writes have 60/minute/user. Database triggers also protect direct table writes, and verification is an ownership-bound transaction. Rate-limit buckets are bounded to a few rows per user. Demo generation has a shared 30/minute per-process guard, **not a distributed public-service limiter**. Configure an edge/WAF limit before exposing demo mode publicly. Supabase Auth has its own limits. Plan retention/cleanup for batch/history data according to your privacy and storage policy.

## Validation

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm run start -- --hostname 0.0.0.0
# Separate terminal, against the running demo production server:
npm run test:smoke
# Optional Docker integration suite; disposable PostgreSQL 17, no network or host DB ports:
npm run test:db
```

Unit tests cover boundary lengths, normalization, invalid syntax, all modes, constraints, deduplication, finite spaces, scoring, statuses/transitions, provider behavior, CSV injection protection and demo throttling. The SQL suite applies the real migration to isolated PostgreSQL using an auth shim, then exercises ownership, forbidden reads/deletes/inserts, duplicate prevention, immutable history, transitions and rate limits. It does not emulate Supabase email delivery or cookie sessions. The smoke suite expects a running **demo** server at `SMOKE_BASE_URL` (default `http://127.0.0.1:3000`).

## Vercel deployment

Import this existing repository in Vercel with the Next.js preset. Install with `npm ci`, build with `npm run build`. Set the two public Supabase variables for each deployment environment, apply the migration to that environment's project, and add its exact callback URL in Supabase Auth. Configure production SMTP and your project access policies, then redeploy. No database password or service-role key belongs in Vercel for this implementation. Test email login, logout, user isolation, saving and verification history against the deployed project before a public launch.

No deployment or production Supabase changes are performed automatically by this repository. Not affiliated with Meta or Instagram.
