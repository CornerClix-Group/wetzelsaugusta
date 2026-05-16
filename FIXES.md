# Wetzels of Augusta — Fix Bundle

Audit + repair of the production deploy, May 2026.

## TL;DR — what was broken and why

The repo built fine locally; the deploy was breaking for end users.
Three things compound to produce "doesn't load" with no obvious cause:

1. **A stuck PWA service worker** keeps serving the last bundle forever
   after a bad ship. `main.tsx` only cleaned up SWs in iframes/preview
   hosts, never for real users. Once a broken build deploys, every device
   is frozen on that broken build until it's manually nuked.
2. **No top-level error boundary** — any uncaught render error blanks
   the entire tree with no diagnostic.
3. **Supabase client throws at module-eval** if env vars are missing,
   which is exactly what produces a fully blank page with a generic
   console error that no end user will ever read.

Plus a handful of follow-ons (no SPA redirects, no chunk splitting,
`.env` checked in, etc.) that don't crash the app but make it brittle
or slow.

---

## What changed

### Security
- `.env` is no longer tracked. Added to `.gitignore`. Created `.env.example`
  as the template. The committed Supabase anon key is *designed* to be
  public so this isn't catastrophic, but it shouldn't live in git regardless.
  Consider rotating it via Supabase → Settings → API → Reset anon key
  for hygiene; not strictly required.

### Reliability
- **Service-worker kill switch** (`src/main.tsx`): bumping the
  `APP_KILLSWITCH_VERSION` constant causes every device to unregister
  its SW and clear caches on next open. Use this any time the prod
  site is stuck and you need to forcibly recover users.
- **ErrorBoundary** (`src/components/ErrorBoundary.tsx`): wraps the
  entire app. If Supabase env vars are missing it renders a clear
  config-error screen. If any descendant throws it shows a "Reset app"
  card that wipes storage + SW + caches and reloads.
- **Hardened Supabase client** (`src/integrations/supabase/client.ts`):
  no longer throws on missing env vars; instead exports
  `isSupabaseConfigured` and `MISSING_SUPABASE_ENV` that the
  ErrorBoundary reads. Falls back to a Proxy stub that rejects every
  call with a clear error.

### Routing
- **`public/_redirects`**: `/* /index.html 200` for Netlify, Cloudflare
  Pages, and Lovable static hosting.
- **`vercel.json`**: SPA rewrite + cache-control headers for Vercel.
- **`public/404.html` + tiny snippet in `index.html`**: GitHub Pages
  SPA fallback. Harmless on any other host.

### Performance
- **Lazy-loaded dashboard routes** (`src/App.tsx`): every route past
  `/dashboard` is `React.lazy`. The TimeClock terminal users (the
  highest-volume traffic) no longer download the entire dashboard.
- **`vite.config.ts` chunking**: only `@supabase/*` is forced into
  `supabase-vendor` via `manualChunks`. React, Radix, charts, etc. stay on
  Rollup/Vite's default graph so we avoid circular vendor chunks while still
  isolating the big stable Supabase bundle for caching.
- Result after lazy routes + Supabase split: initial JS **much smaller**
  than the original ~773 KB single bundle (exact gzip varies by route graph).

### Service-worker correctness
- **`NetworkOnly`** for `/functions/v1/*` and `/auth/v1/*`. Caching
  mutation calls or auth tokens for 5 minutes was dangerous —
  imagine a stale clock-out punch.
- `NetworkFirst` with a 5s timeout retained for read-only Supabase
  REST traffic.
- `navigateFallbackDenylist` extended to `^/functions/`, `^/rest/`,
  `^/auth/v1/`.

### Misc
- `tailwindcss-typography` is now actually loaded (it was an unused dep).
- `react-query` defaults: no refetch on focus, retry once, 30 s staleTime.
  Better fit for a tablet-mounted ops dashboard.
- Updated `index.html` with the GitHub Pages SPA reader.

---

## How to apply in Cursor

1. Pull this branch / patch into your local clone.
2. Open the repo in Cursor.
3. Verify the diff matches the file list below.
4. Run `npm install` (no new deps; just confirms tree).
5. Run `npm run build` — should be green.
6. Run `npm run preview` and click around; deep links should work.
7. Commit + push. Lovable will redeploy.

### Files touched
```
M  .gitignore
D  .env                            (removed from tracking, file stays local)
A  .env.example
A  FIXES.md
M  index.html
A  public/_redirects
A  public/404.html
A  src/App.tsx                     (full rewrite — error boundary + lazy)
A  src/components/ErrorBoundary.tsx
M  src/integrations/supabase/client.ts
M  src/main.tsx
M  tailwind.config.ts
A  vercel.json
M  vite.config.ts
```

---

## If users are still stuck after the deploy

The service-worker kill switch should auto-recover everyone the first
time they open the app after the new deploy lands. If individual
devices are still stuck:

1. On the device: open the app in Chrome
2. DevTools → Application → Service Workers → Unregister
3. DevTools → Application → Storage → Clear site data
4. Reload

For future deploys, the kill switch is one-line maintenance: edit
`APP_KILLSWITCH_VERSION` in `src/main.tsx` to a new value and ship.
Every device will self-clean on next open.

---

## Things I did NOT change but flagged

- **`Badge` TS errors** (props children typing) — runtime works fine,
  it's a type-only smell. Fix in a follow-up by widening `BadgeProps`
  in `src/components/ui/badge.tsx` to `React.PropsWithChildren<...>`.
- **`MobileBottomNav.tsx`, `PhotoUpload.tsx`, `SignaturePad.tsx`**
  use bare `React.*` types without `import * as React`. Works under
  the JSX transform; fails strict typecheck. Same follow-up.
- **Supabase Edge Functions auth**: `clock-action` and `pin-login` take
  a 4-digit PIN as the sole credential with no rate-limiting or
  attempt counting visible in the code. That's a separate auth-hardening
  conversation — RLS on `clock_employees.pin_code` and a Postgres
  `pg_cron` job to lock out brute-force attempts would be the next step.
- **The `Employees.tsx` file is 40 KB**. Worth splitting into smaller
  components for maintainability. Doesn't affect bundle size much
  (it's already lazy-loaded with the dashboard) but it'll matter for
  future iteration speed.
