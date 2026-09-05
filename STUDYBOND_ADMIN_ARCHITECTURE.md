# StudyBond Admin Architecture

Last Updated: August 16, 2026
Status: Implemented admin workspace architecture and current guardrails for `studybond-admin`

## 1. Purpose

`studybond-admin` is the internal operations console for StudyBond.

It should support:

- admin authentication
- superadmin step-up
- analytics
- user moderation
- user-360
- premium management
- reports moderation
- question management
- bulk upload
- audit logs
- system controls

This app should feel like an operations product, not a copy of the learner web experience.

## 2. Current Reality

Current repo state:

- `studybond-admin` is now an implemented Next.js App Router admin workspace.
- It includes auth/session proxying, HTTP-only admin cookies, route protection through `src/proxy.ts`, and superadmin step-up UX.
- It has implemented dashboard, analytics, users, user-360, premium, questions, reports, audit logs, and settings routes.
- It has admin API proxy routes for auth, generic admin endpoints, questions, and legacy reports compatibility.
- Its API type layer now consumes generated backend OpenAPI types from `studybond-backend/artifacts/openapi/openapi-types.d.ts`.

That means the frontend problem is no longer “what framework should we use?” or “how do we move past a scaffold?”
It is:

- how to keep the implemented control center secure, typed, and maintainable
- how to add automated coverage for privileged flows
- how to continue using backend-generated contracts without recreating hand-maintained API schemas

## 3. Backend Truths This Admin App Must Respect

The admin frontend must be designed around these backend realities:

1. Sensitive admin actions are role-gated.
2. Some actions are superadmin-only.
3. Some superadmin actions require step-up verification.
4. Premium management is stateful and audited.
5. User-360 is a real backend surface.
6. Analytics exist and now support institution-aware segmentation.
7. Reports moderation is a real moderation queue.
8. Question CRUD and bulk upload are admin-only and support Cloudinary-backed assets.
9. Audit logging is business-critical.

Relevant backend surfaces:

- [app.ts](../studybond-backend/src/app.ts)
- [admin.routes.ts](../studybond-backend/src/modules/admin/admin.routes.ts)
- [questions.routes.ts](../studybond-backend/src/modules/questions/questions.routes.ts)
- [reports.routes.ts](../studybond-backend/src/modules/reports/reports.routes.ts)
- [README.md](../studybond-backend/README.md)
- [multi-institution-refactor-blueprint.md](../studybond-backend/docs/multi-institution-refactor-blueprint.md)

## 4. Technology Decisions

Recommended stack:

- Next.js App Router
- React
- TypeScript strict mode
- Tailwind CSS
- TanStack Query
- Zustand only where justified
- React Hook Form + Zod
- Recharts for analytics surfaces
- Sonner for operational feedback
- Lucide React for icons

Use the same core platform family as `studybond-web`, but do not force the same visual shell or component density.

## 5. Security Model

Admin security should be stricter than learner web.

Recommended model:

- Next.js BFF layer
- refresh token in `httpOnly`, `secure`, `sameSite=lax` cookie
- session bootstrap handled server-side where possible
- step-up token stored separately from normal auth state

Important rule:

- step-up is not “just another login flag”
- it is a separate elevated security state with expiry and action-level usage

## 6. Core Architectural Principles

1. Build around operational domains, not giant dashboard pages.
2. Keep permissions explicit in both routes and actions.
3. Treat step-up as a first-class subsystem.
4. Keep server state in TanStack Query.
5. Build dense, operator-friendly views rather than marketing-style UI abstractions.
6. Align directly with backend admin surfaces instead of inventing shadow concepts.

## 7. Recommended Top-Level Structure

```text
studybond-admin/
├── .env.local
├── .env.example
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── package.json
│
├── public/
│   ├── favicon.ico
│   └── images/
│       └── logo.svg
│
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── loading.tsx
│   │   ├── not-found.tsx
│   │   ├── error.tsx
│   │   ├── (auth)/
│   │   ├── (admin)/
│   │   └── api/
│   │
│   ├── features/
│   │   ├── admin-auth/
│   │   ├── step-up/
│   │   ├── analytics/
│   │   ├── users/
│   │   ├── user-360/
│   │   ├── premium/
│   │   ├── reports/
│   │   ├── questions/
│   │   ├── bulk-upload/
│   │   ├── audit-logs/
│   │   └── system-settings/
│   │
│   ├── lib/
│   │   ├── api/
│   │   ├── auth/
│   │   ├── permissions/
│   │   ├── step-up/
│   │   ├── institutions/
│   │   └── utils/
│   │
│   ├── components/
│   │   ├── ui/
│   │   ├── layout/
│   │   ├── tables/
│   │   ├── filters/
│   │   └── shared/
│   │
│   ├── providers/
│   ├── styles/
│   └── proxy.ts
│
└── tests/
```

## 8. Route Structure

```text
src/app/
├── (auth)/
│   ├── login/page.tsx
│   └── step-up/page.tsx
├── (admin)/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── analytics/
│   │   ├── page.tsx
│   │   ├── premium/page.tsx
│   │   └── system-health/page.tsx
│   ├── users/
│   │   ├── page.tsx
│   │   ├── banned/page.tsx
│   │   └── [id]/
│   │       ├── page.tsx
│   │       └── premium/page.tsx
│   ├── premium/page.tsx
│   ├── questions/
│   │   ├── page.tsx
│   │   ├── new/page.tsx
│   │   ├── bulk-upload/page.tsx
│   │   ├── [id]/page.tsx
│   │   └── free-exam/
│   │       ├── page.tsx              # free-exam pool coverage view
│   │       └── leaderboard/page.tsx  # free-exam leaderboard (cycle history, podium)
│   ├── reports/
│   │   ├── page.tsx
│   │   └── [id]/page.tsx
│   ├── audit-logs/page.tsx
│   └── settings/page.tsx
└── api/
    ├── auth/
    │   └── [...slug]/route.ts
    ├── admin/
    │   └── [...slug]/route.ts
    ├── questions/
    │   └── [[...slug]]/route.ts
    └── adminReports/
        ├── route.ts
        └── [...slug]/route.ts
```

Reports note:

- the active reports client calls `/api/admin/reports` through the generic admin proxy
- `/api/adminReports` is retained as a compatibility proxy and forwards to the same backend path

## 9. Feature Modules

Recommended admin domains:

### 9.1 `features/admin-auth`

- login
- session bootstrap
- role-aware redirects

### 9.2 `features/step-up`

- request challenge
- verify OTP
- step-up token lifecycle
- expiry handling
- recovery UI for expired elevated state

### 9.3 `features/analytics`

- overview
- activity trends
- premium analytics
- system health
- institution filters where supported

### 9.4 `features/users`

- user list
- search/filter
- ban/unban
- device actions
- entry points to user-360

### 9.5 `features/user-360`

- engagement summary
- security summary
- recent study history
- premium summary
- institution-aware context

### 9.6 `features/premium`

- premium users list
- history
- grant
- extend
- revoke

### 9.7 `features/reports`

- moderation queue
- report detail
- review / resolve
- hard delete for superadmin only

### 9.8 `features/questions`

- question bank list
- create/edit
- pool selection
- asset upload
- preview
- free-exam pool coverage and leaderboard (`use-free-exam-coverage.ts`, `use-free-exam-leaderboard.ts`)

### 9.9 `features/bulk-upload`

- CSV / Excel upload
- institution context
- validation preview
- result summary

### 9.10 `features/audit-logs`

- searchable audit list
- filters
- actor/action/timestamp views

### 9.11 `features/system`

Note: the originally recommended path was `features/system-settings/`, which still exists on disk but is an empty placeholder (`.gitkeep` only). The actual implementation lives at `features/system/`.

- limited ops controls, email toggles
- institution management (`add-institution-panel.tsx`)
- notification-announcement authoring (`notification-announcements-panel.tsx`)

## 10. API Layer

Do not scatter backend calls across table cells, forms, and page components.

Recommended layering:

```text
src/lib/api/
├── client.ts
├── errors.ts
├── types.ts
├── auth.ts
├── admin-analytics.ts
├── admin-users.ts
├── admin-premium.ts
├── admin-reports.ts
├── questions.ts
├── admin-free-exam.ts
├── admin-audit.ts
└── admin-system.ts
```

Rule:

- UI components talk to hooks
- hooks talk to service functions
- service functions talk to one shared fetch layer

Current contract rule:

- `types.ts` imports the generated backend `paths` type from a vendored local copy at `src/lib/api/generated/openapi-types.d.ts`, kept in sync with `studybond-backend/artifacts/openapi/openapi-types.d.ts` via `npm run openapi:sync`
- request bodies, query params, path params, response envelopes, and common payload aliases should be derived from that generated contract
- narrow local overlays are acceptable only when the backend OpenAPI response is intentionally generic, such as the current `/api/auth/me` user shape
- after backend schema changes, run `npm run openapi:sync` in `studybond-backend` before relying on admin typecheck/build

## 11. State Management

Use:

1. TanStack Query

- analytics
- user lists
- user-360
- premium history
- reports queue
- question bank
- audit logs

2. Zustand only where justified

- current step-up state
- shell preferences
- short-lived command UI state

3. Local component state

- filters
- dialog state
- in-form draft state
- optimistic row UX when safe

Do not default to Redux.

## 12. Step-Up UX Architecture

This is one of the most important admin-specific concerns and should not be hidden as random modal code.

Recommended structure:

```text
src/features/step-up/
├── api/
├── components/
├── hooks/
├── state/
└── utils/
```

Critical behavior:

- detect when an action requires step-up
- request challenge explicitly
- verify OTP
- store step-up token separately
- recover gracefully when elevated access expires mid-flow

## 13. Questions and Bulk Upload UX

Question administration is not simple CRUD.

The UI must support:

- institution context
- question pool
- question type/source
- explanation fields
- Cloudinary-backed image upload
- bulk import

Recommended split:

```text
features/questions/
features/bulk-upload/
```

Do not jam bulk upload into the normal form page. It is a different workflow with different failure modes.

## 14. Reports Moderation UX

Reports should behave like a moderation inbox, not a tiny detail page.

Recommended moderation surface:

- queue page
- report detail page or drawer
- action controls:
  - mark reviewed
  - mark resolved
  - hard delete if superadmin

Recommended filters:

- status
- institution
- issue type
- subject
- date range

## 15. Analytics UX

Analytics should be split into clear operational slices:

- overview
- activity trends
- premium insights
- system health

Important rule:

- use backend-provided institution segmentation where available
- do not invent institution analytics client-side by merging unrelated payloads

## 16. Permissions in Frontend

The frontend should do both:

- route-level guards
- action-level gating

Recommended helpers:

```text
src/lib/permissions/
├── roles.ts
├── guards.ts
└── policies.ts
```

Important:

- backend remains the real authority
- frontend permission checks are for UX clarity and accidental misuse prevention

## 17. Design System

Admin should not share the exact same feel as learner web.

Shared primitives are fine:

- buttons
- inputs
- tables
- badges

But admin needs:

- denser tables
- filter bars
- action menus
- audit chips
- multi-panel layouts
- keyboard-friendly flows

Recommended component groups:

```text
components/ui/
components/layout/
components/tables/
components/filters/
components/shared/
```

## 18. Testing Strategy

Recommended layers:

- unit tests for helpers
- component tests for filters/tables/forms
- integration tests for query + mutation flows
- Playwright for privileged journeys

Highest-risk admin flows:

- login
- step-up
- premium grant / revoke
- report hard delete
- question create/edit
- bulk upload
- analytics filtering

## 19. Delivery Status

The original delivery order was:

1. auth + app shell
2. analytics overview + system health
3. users list + user-360
4. reports moderation
5. premium management
6. questions CRUD + asset upload
7. bulk upload
8. audit logs
9. system settings

Those surfaces now exist in the admin workspace. The next delivery focus is not creating the pages, but hardening them:

- add focused tests for auth proxy behavior, step-up, premium mutations, questions, and reports
- keep OpenAPI-derived API aliases in sync with backend schema changes
- continue improving institution-aware filtering and moderation where backend semantics require it

## 20. Deferred But Intentional

Keep these in mind as future planned work:

- broader generated-contract coverage as new admin API modules are added
- deeper institution-aware admin moderation and analytics surfaces
- AI-assisted admin workflows only after core operations are stable

## 21. Final Recommendation

For `studybond-admin`, continue maintaining:

- a separate Next.js App Router application
- a stricter BFF auth/session model than learner web
- explicit step-up handling
- feature-first operational domains
- TanStack Query for server-heavy surfaces
- generated OpenAPI-derived API types
- clear permission and role boundaries

That gives us:

- safer privileged workflows
- cleaner admin scaling
- lower entropy as the control center grows
- strong alignment with the backend we already have
