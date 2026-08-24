# activity-logger v1 — connector status

Client for the **Express + SQLite** service in
[`workspace/services/activity-logger/`](../../../../services/activity-logger/),
which is **still running** and being wound down over one retention window.

Its replacement is [`../activity-logger-v2/`](../activity-logger-v2/), the client
for the Go + Lambda + DynamoDB service in `external/activity-logger/`.

## Rolled back on 2026-08-18, and why

This connector was edited in place on 2026-08-17 to match the Lambda service:
`GET /:id`, `DELETE /by-client` and the `?action=` filter were deleted, and the
whole thing was split into open-read / keyed-write halves against two Function
URLs.

Every one of those changes was right about **v2** and wrong about **this file**,
which describes a _different service that is still running and still answers all
five routes_. A live surface shrank because its replacement had a smaller one,
which is not a reason. `GET /:id` also vanished from the v1 service itself, since
that service reads the same `ACTIVITY_LOGGER_ROUTES` constant.

So this directory is restored to the pre-rewrite shape and v2 has its own. Two
live services, two clients, two route tables; neither is allowed to shrink the
other.

## What this ships

- [`routes.ts`](./routes.ts) — `ACTIVITY_LOGGER_ROUTES`, **five routes**:
  `POST /`, `GET /by-actor/:actorId`, `GET /by-target/:targetId`, `GET /:id`,
  `DELETE /by-client/:clientId`.
- [`types.ts`](./types.ts) — `ActivityEntity`, `ActivityInput`, and the
  Request/Response pairs for all five.
- [`index.ts`](./index.ts) — `activityLoggerConnector`.

`DELETE /by-client` is a tenant-wide wipe. It exists here because the v1 service
routes it, not because it should be called: it is for test fixtures and tenant
offboarding, and v2 removed it from the API entirely in favour of a job whose
AWS credential no Lambda role holds.

## The browser guard: armed 2026-08-18, disarmed 2026-08-22, and why both

`setInternalAccessKey`'s `isBrowser()` guard shipped commented out, beneath a
comment asserting _"activity-logger is INTERNAL_ONLY — there is no FE path to
this service."_

That was false when written and stayed false for months — the c-mngt bundle held
this key and wrote with it. The stale claim then propagated into a plan, where it
nearly became a scoping decision. (Recap:
[a branch is a promise, a permission is a fact](../../../../../docs/recaps/2026-08-17-a-branch-is-a-promise-a-permission-is-a-fact.md).)

The guard was armed on 2026-08-18 when every FE caller moved to
`activityLoggerV2Connector` — and **disarmed again on 2026-08-22, deliberately,
for the retention window**: the pre-cutover history lives only in this service,
its reads are keyed like everything else, and the c-mngt activity panels merge
that history under their v2 reads by calling `getByActor` / `getByTarget`
directly with the key back in the bundle
(`VITE_APP_ACTIVITY_LOGGER_INTERNAL_ACCESS_KEY`). Accepted with eyes open, and
priced honestly:

- **The key is already public.** It shipped in the c-mngt bundle for months and
  was never rotated, so re-bundling it discloses nothing new. It was never
  rotated _because_ v1 is dying; rotating a corpse's key buys nothing.
- **The exposure is read-plus-write in principle, read-only in practice.** The
  key gates all five v1 routes, so a bundle reader can also write to or wipe a
  v1 tenant — exactly what they could already do with the never-rotated key.
  The browser's own write path stays `credoSmeConnector.logActivities` (v2);
  nothing in the UI writes v1.
- **It expires with the service.** v1 dies once every pre-cutover entry has
  aged past v2's 180-day horizon — target 2027-02-14. The env var, the panels'
  v1 fetchers and this whole connector go with it. Do NOT re-arm the guard
  before then; do not keep the key after.

## Configuration

Unlike v2, this connector **does** read `shared/config.ts`:

- `urls['activityLogger']` — the nginx gateway in front of the v1 service.
- `targets['activityLogger']` — its `x-target` routing value
  (`activity-logger` / `-stg` / `-ridge`). Restored on 2026-08-18 with this
  rollback: without it the gateway falls through to its default upstream and
  answers something that is not this service.

`config.test.ts`'s `ROUTED_KEYS` covers `activityLogger` again for the same
reason. v2 is absent from both maps and must stay that way — a Function URL has
no gateway to route.

## Callers

**Two read call sites, since 2026-08-22**: the c-mngt UI's
`EmployeeActivityPanel` (`getByActor`) and `ActivityByTargetPanel`
(`getByTarget`), each as the second source behind v2 in
`useActivityHistory` — pre-cutover history for the retention window, deduped
by id with v2 winning. They are tagged `@transitional v1-history-read` and go
when this service goes (target 2027-02-14).

The write methods have no callers — all four former write sites moved to v2 on
2026-08-18 and the browser's write path is `credoSmeConnector.logActivities`.

Re-exported from [`connector.ts`](../../connector.ts) as `activityLoggerConnector`.
