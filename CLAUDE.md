# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev            # Dev server on 0.0.0.0:3000
npm run test           # Full validation: lint + build + i18n  (run before committing)
npm run lint           # ESLint only
npx tsc --noEmit       # Type check only (the build is what CI uses for type checking)
npm run i18n           # Validate translations against de.json + report unused keys
npm run db:generate    # Generate a migration after editing lib/db/schema.ts
npm run db:migrate     # Apply migrations manually
npm run db:studio      # Drizzle Studio GUI
```

There is **no unit test runner**. `npm test` is lint + build + i18n; CI (`.github/workflows/pr-checks.yml`) additionally runs `db:generate` + `db:migrate` to verify the schema and migrations are in sync. To validate a single concern, run that script alone.

## Architecture

Next.js 16 (App Router) + React 19 + SQLite/Drizzle + better-auth. Self-hosted, single container, `output: "standalone"`.

### Startup side effects (important)

- **`lib/db/index.ts` runs `migrate()` at import time.** Importing `db` anywhere applies pending migrations from `drizzle/` against `DATABASE_URL` (default `./data/sqlite.db`). You usually don't need `db:migrate` in dev.
- **`instrumentation.ts`** runs once on server boot: preloads version info and starts `autoSyncService` (background polling of external calendar feeds).

### `proxy.ts` is the middleware

Next.js 16 renamed `middleware.ts` → `proxy.ts`. It is the single gate in front of every request and does four things in order:

1. **Health gate** — cached (10s TTL) direct DB probe; unhealthy ⇒ redirect everything to `/system-unavailable` except `/api/health`, `/api/version`, `/api/releases`, `/manifest.json`.
2. **Share tokens** — `/share/token/[token]` validates the token, stores it in a cookie, records usage.
3. **Admin gate** — `/admin/*` requires a session cookie *and* an admin role; denials are audit-logged.
4. Guest-access handling based on `allowGuestAccess()`.

### Auth and permissions

Auth can be turned off entirely (`AUTH_ENABLED=false` ⇒ single-user mode, all checks bypassed). Server code reads flags from `lib/auth/feature-flags.ts` (`isAuthEnabled()`, `allowGuestAccess()`, …); **client components must use `hooks/useAuthFeatures.ts`**, never the server module.

Two independent permission systems, don't confuse them:

- **Calendar permissions** (`lib/auth/permissions.ts`): resolution order is owner → `calendarShares` row → cookie access token → `calendar.guestPermission`. Use `canViewCalendar` / `canEditCalendar` / `canManageCalendar` / `canDeleteCalendar` rather than re-deriving.
- **User roles** (`user`/`admin`/`superadmin`): custom checks live in `lib/auth/admin.ts`. `lib/auth/access-control.ts` only exists to satisfy better-auth's admin plugin — it grants both admin roles everything, and the real restrictions come from `lib/auth/admin.ts`. First registered user is auto-promoted to superadmin (`lib/auth/first-user.ts`).

### API route shape

```typescript
const user = await getSessionUser(request.headers);       // lib/auth/sessions
if (!(await canEditCalendar(user?.id, calendarId))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
const limited = rateLimit(request, user?.id, "calendar-create"); if (limited) return limited;  // lib/rate-limiter
await logUserAction("ACTION", user.id, metadata, request); // lib/audit-log
```

`rateLimit()` takes a fixed union of operation types (each with its own window); some types key on a resource id instead of the caller. Audit metadata is a typed union in `lib/audit-log.ts` — add an interface there rather than passing loose objects. Helpers: `logUserAction`, `logAdminAction`, `logSecurityEvent`, `logSystemEvent`.

### Client data layer

TanStack Query only; no server-side data fetching for app data. Every key comes from `lib/query-keys.ts` — adding a query means adding a factory there, otherwise invalidation breaks.

Mutations follow the optimistic pattern in `hooks/useShifts.ts`: `onMutate` cancels + snapshots + patches the cache, `onError` rolls back and toasts, `onSettled` invalidates. API responses cross the boundary through normalizers (e.g. `normalizeShift`) that turn timestamps back into `Date`s. Rate-limit responses are detected with `isRateLimitError()` / `handleRateLimitError()` from `lib/rate-limit-client.ts`.

`app/page.tsx` is the whole calendar screen: it composes ~15 hooks and delegates all dialogs/sheets to `components/dialog-manager.tsx`.

### Two UI modes

`lib/feature-flags.ts` → `FEATURE_FLAGS.ENABLE_EMPLOYEE_BASED_INTERFACE` (default **true**, override with `NEXT_PUBLIC_ENABLE_EMPLOYEE_BASED_INTERFACE`) switches between:

- **employee-based**: shifts are assigned to roster members (`employee-shift-*` components, `shifts.userId`, `employeeCalendarSettings`, the `fill-shift-plan` auto-scheduler),
- **shift-based** (original): free-text titles, presets, all-day events.

Features added to one mode need an explicit decision about the other.

### Dates

Work in **local dates with no timezone conversion**. Serialize with `formatDateToLocal(date)` → `YYYY-MM-DD`, parse with `parseLocalDate()` (both `lib/date-utils.ts`) — never `new Date("YYYY-MM-DD")`, which is UTC-parsed. Display via `date-fns` with `getDateLocale(locale)`.

### External sync is read-only

Shifts with `syncedFromExternal === true` / `externalSyncId` set come from a subscribed feed and must not be edited or deleted — check before allowing any mutation.

## Conventions

- **i18n**: `messages/de.json` is the source of truth; `cs/en/es/fr/it` follow. Add the German key first, then `npm run i18n` reports what's missing/unused elsewhere. `DEFAULT_LOCALE` is validated at import and throws on an unknown value.
- **UI**: shadcn/ui + Radix in `components/ui/` (don't hand-edit primitives — they're generated). Sheets and dialogs build on `components/ui/base-sheet.tsx`. Form logic goes into a hook (`useShiftForm`, `useDialogStates`, …), not the component.
- **Schema changes**: edit `lib/db/schema.ts`, then `db:generate` and commit the generated migration + snapshot; CI fails if the schema and `drizzle/` diverge.
- **Public config**: server env exposed to the client is injected as `window.__PUBLIC_CONFIG__` in `app/layout.tsx` (`lib/public-config.ts`) and read through `components/public-config-provider.tsx` — not via `NEXT_PUBLIC_` reads scattered in components.
