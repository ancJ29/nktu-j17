# activity-logger — connector status

## What this directory ships today

- [`routes.ts`](./routes.ts) — `ACTIVITY_LOGGER_ROUTES` constant (PREFIXES + SUB_ROUTES).
- [`types.ts`](./types.ts) — `ActivityEntity`, `ActivityInput`, plus Request/Response pairs for all five endpoints.
- [`index.ts`](./index.ts) — `activityLoggerConnector` client SDK + re-export of routes.

## Connector shape (2026-05-27)

Built speculatively ahead of the first consumer, per the user's call —
no in-tree caller exists yet. When the first consumer (likely a BFF
flushing batched activity entries) lands, swap its ad-hoc `fetch` for
this connector and validate the surface.

Modeled on [`__internal__/c-storage/index.ts`](../c-storage/index.ts)
with these activity-logger-specific constraints from the trust-model
memo ([`internal-only-trust-model.md`](../../../../credo-services/activity-logger/docs/memo/internal-only-trust-model.md)):

- **Internal-only** — `setInternalAccessKey` is no-op + warns in browser
  context (uses the `isBrowser()` guard from the c-storage precedent).
- **Single API group** with `defaults: { internalAccessKeyRequired: true }`,
  so every method inherits the internal-access requirement.
- **No per-caller access-key registry** — the setter surface is just
  `useLocal`, `setBaseUrl`, `setInternalAccessKey`, `setTrustedServiceKey`.
- **Default base URL** from `urls['activityLogger']` in
  [`../shared/config.ts`](../shared/config.ts) (`https://d687fa1b765-7ae87.api-bridge.work`).
- **`getById` allows-not-found by default** — matches the
  c-storage `getRecordByKey` precedent: 404 returns `null`, opt out with
  `{ allowNotFound: false }`.

Re-exported from [`connector.ts`](../../connector.ts) as
`activityLoggerConnector`.

## Out of scope

- Kits-style re-export — base-service doesn't import this one (no
  analog to the `slackConnector` boot chain).
- Browser/admin variant — explicitly disallowed by the trust-model
  memo.
