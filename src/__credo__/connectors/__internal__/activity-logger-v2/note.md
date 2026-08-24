# activity-logger v2 — connector status

Client for the Go + Lambda + DynamoDB service in
[`external/activity-logger/`](../../../../../external/activity-logger/).

## Why this is a separate directory rather than a flag

There are **two live activity-log services**, and each one gets a client that
describes what it actually serves.

The rewrite originally edited the _shared_ `ACTIVITY_LOGGER_ROUTES` constant in
place, dropping `GET /:id`, `DELETE /by-client` and the `?action=` filter. That
was correct for DynamoDB — each is either expensive (a second GSI, a
`FilterExpression` returning short pages) or dangerous (a tenant-wide wipe
reachable with a key that shipped in the browser bundle).

It was not correct for the **v1 service**, which reads the same constant, was
still running, and could still answer all three. Three routes disappeared from a
live service because its _replacement_ had a smaller surface, which is not a
reason. Split on 2026-08-18: `__internal__/activity-logger/` describes v1 again,
this directory describes v2, and neither can shrink the other.

## What this ships

- [`routes.ts`](./routes.ts) — `ACTIVITY_LOGGER_V2_ROUTES`, **three routes**.
- [`types.ts`](./types.ts) — the entity and the three Request/Response pairs.
  The `ActivityEntity` shape is deliberately identical to v1's, so a call site
  moves between the two by changing which connector it calls and nothing else.
- [`index.ts`](./index.ts) — `activityLoggerV2Connector`.

## Two base URLs and one key

Because it is two Lambda functions over one table with two IAM roles:

- **read** (`setBaseUrl`) — called from the browser and **open**: no key, no
  token. Deliberate, risk accepted; what still holds is carried by IAM, whose
  reader role grants `Query` and nothing else. See the service's
  `docs/memo/the-reader-is-open.md`.
- **write** (`setWriteBaseUrl` + `setInternalAccessKey`) — called only by the
  c-mngt BFF. `setInternalAccessKey` refuses to store a key in a browser; the
  browser's write path is `credoSmeConnector.logActivities`.

## No entry in `shared/config.ts`, and that is load-bearing

Neither `urls` nor `targetConfigs` carries a v2 entry.

`urls['activityLogger']` is **v1's gateway URL**, and this connector deliberately
does _not_ fall back to it — its read base URL starts empty. A deployment that
forgets to set the reader URL therefore fails loudly instead of quietly reading
the old service and returning a plausible page of stale history.

`targetConfigs` has no entry because `x-target` is an nginx-gateway routing
header and a Function URL has no gateway. v1 still has one, and still needs it.

Re-exported from [`connector.ts`](../../connector.ts) as `activityLoggerV2Connector`.
