# StudyBond Admin

Internal operations console for StudyBond.

## Current State

This repo is now an implemented Next.js admin workspace, not just a scaffold.

It follows the canonical architecture plan in:

- `STUDYBOND_ADMIN_ARCHITECTURE.md`

Current implemented areas:

- admin login and session refresh through backend auth
- HTTP-only admin access/refresh cookies
- route protection through `src/proxy.ts`
- dashboard, analytics, users, banned users, user-360, premium, questions, reports, audit logs, and settings routes
- superadmin step-up UX for sensitive operations
- question create/edit/bulk upload workflows
- premium grant/extend/revoke workflows
- backend proxy routes for auth, admin, questions, and admin reports
- OpenAPI-derived API aliases from the backend generated contract
- shared UI primitives and responsive admin navigation
- app-level error, global-error, not-found, and loading boundaries

Integration notes:

- backend/OpenAPI exposes admin report moderation at `/api/admin/reports`
- the admin reports client uses `/api/admin/reports` through the generic admin proxy
- legacy `/api/adminReports` compatibility routes forward to `/api/admin/reports`
- admin API aliases consume the vendored generated contract at `src/lib/api/generated/openapi-types.d.ts`
- after backend API schema changes, run `npm run openapi:sync` in `studybond-admin` before admin typecheck/build

## Core Commands

```bash
npm install
npm run dev
npm run lint
npm run typecheck
npm run build
```

Latest local verification after the reports/OpenAPI type alignment:

- `npm run typecheck`
- `npm run build`

## Environment

Copy `.env.example` to `.env.local` and set the backend base URL.

```bash
BACKEND_API_BASE_URL=http://localhost:5000
NEXT_PUBLIC_API_BASE_URL=http://localhost:5000
NEXT_PUBLIC_WEB_URL=https://studybond.app
```

## Production Wiring

Set these in Vercel for `studybond-admin`:

```bash
BACKEND_API_BASE_URL=https://your-railway-backend.up.railway.app
NEXT_PUBLIC_API_BASE_URL=https://your-railway-backend.up.railway.app
NEXT_PUBLIC_WEB_URL=https://your-web-domain.vercel.app
```

`BACKEND_API_BASE_URL` is the critical one. The admin app proxies all browser `/api/*` calls through its own Next.js routes and those routes forward to this backend URL.
