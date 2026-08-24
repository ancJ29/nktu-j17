# notification-manager — connector status

## What this directory ships today

- [`routes.ts`](./routes.ts) — `NOTIFICATION_MANAGER_ROUTES` (PREFIXES + SUB_ROUTES), **three routes**.
- [`types.ts`](./types.ts) — `NotificationEntity`, `NotificationInboxItem`,
  `CreateNotificationInput`, plus Request/Response pairs for those three.
- [`index.ts`](./index.ts) — `notificationManagerConnector` client SDK + re-export of routes.

The service is [`external/notification-manager/`](../../../../../external/notification-manager/) —
Go on Lambda over DynamoDB, **not** `workspace/services/notification-manager`, which was
deleted 2026-08-18 having never been deployed and never had a caller.

## "There is no FE path to this service" — and here that is actually true

This file used to carry that sentence, copied from activity-logger's `note.md`, where
it had been **false for months**: the FE was that service's only caller, for reads _and_
writes, across four call sites, with an `isBrowser()` guard commented out to allow it.
That stale note then propagated into a _plan_, where it nearly became a scoping decision
— see [the recap](../../../../../docs/recaps/2026-08-17-a-branch-is-a-promise-a-permission-is-a-fact.md).

So it is worth saying what makes the claim durable here rather than just repeating it:

- **Nothing imports this connector.** The service has no consumer yet, by design —
  it exists so one can be built against it (plan §0.1).
- **The Function URL takes a key on every route, reads included.** There is no open
  half to call from a browser even if someone tried.
- **The URL is not in `shared/config.ts`.** Neither `urls` nor `targetConfigs` carries
  an entry, so there is no browser-reachable base URL to inherit by accident. It is
  wired from the calling service's environment via `setBaseUrl`.

## Connector shape

Modelled on [`__internal__/activity-logger/index.ts`](../activity-logger/index.ts), with
the differences that matter:

- **One API group**, `defaults: { internalAccessKeyRequired: true }` — activity-logger
  needs two, because its read half takes no credential at all.
- **No `setTarget`.** `x-target` is an nginx-gateway routing header and a Function URL
  has no gateway; sending one would mean nothing to the service while still needing a
  name in a CORS allowlist that does not exist either.
- **No `getById`, no `getUnreadCount`, no `deleteByClient`, no `type` filter.** All four
  were cut with the rewrite for having zero callers. `knip` would never have found them
  — an exported connector method is public API by construction, so liveness for a wire
  surface is measured in callers, not imports.
- **No `deliveries` in the create response.** Slack dispatch was cut entirely.

## Wiring it up

```ts
notificationManagerConnector
  .setBaseUrl(process.env.NOTIFICATION_MANAGER_URL)
  .setInternalAccessKey(process.env.NOTIFICATION_MANAGER_KEY);
```

Both server-side. `03-deploy.sh` prints them.

> **The first consumer owns a property this connector cannot enforce.** `clientId` and
> `recipientId` must come from the credo-sso session, never from a query parameter the
> browser controls. A BFF controller that forwards `req.query.clientId` silently
> reproduces the cross-tenant read activity-logger is still carrying — see
> [`no-browser-path.md`](../../../../../external/notification-manager/docs/memo/no-browser-path.md).

Re-exported from [`connector.ts`](../../connector.ts) as `notificationManagerConnector`.
