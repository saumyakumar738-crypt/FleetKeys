# Fleet Key Control

Fleet Key Control is a mobile-first fleet garage app for fast, accountable vehicle-key custody and transfer workflows.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/fleet-key-control/app/index.tsx` — the interactive prototype, navigation, local state, and mobile UI
- `artifacts/fleet-key-control/constants/colors.ts` — semantic palette used by the app
- `artifacts/fleet-key-control/app.json` — Expo app identity and launch configuration
- `attached_assets/Pasted--Fleet-Garage-Key-Tracking-System-Employee-Mobile-App-P_1787736648672.txt` — source product specification

## Architecture decisions

- The first build is frontend-only and uses AsyncStorage so the complete workflow can be demonstrated without a server or database.
- Sender and receiver behavior are represented in one mobile experience, with prototype controls for demonstrating both sides of a transfer.
- Vehicle-key custody stays with the current employee until an incoming transfer is explicitly accepted.
- Every single-key and bulk transfer requires an explicit purpose: Recovery, Repair, or Parking; the purpose remains visible through pending, receiver, and result states.
- The missing-key form destination is intentionally configurable and remains unset until the garage supplies its Google Form URL.

## Product

- Dashboard with key, transfer, and quick-action summaries
- Searchable My Keys list with vehicle detail, job-card controls, transfer, and audit history
- QR scanner presentation with manual vehicle/key-ID fallback
- Single and bulk transfer flows with receiver verification, acceptance, rejection, cancellation, expiry, and countdown states
- Notifications, missing-key reporting entry point, profile, and manager KPI/financial-impact reporting
- Penalties tab for duplicate-key allotment to drivers, driver detail visibility, lost-key/recovery-missing penalties, and recovery-based penalty reversal
- Compliance leaderboard ranking garage workers by fewest missing keys, with tied ranks and live counts from key records and active driver penalties

## User preferences

No additional preferences recorded.

## Gotchas

- Set `MISSING_KEY_GOOGLE_FORM_URL` in the app before using the external missing-key report action.
- The current dataset is intentionally local prototype data; replacing it with a backend should preserve the custody and explicit-acceptance rules.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
