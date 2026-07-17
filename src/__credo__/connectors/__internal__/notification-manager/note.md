# notification-manager — connector status

## What this directory ships today

- [`routes.ts`](./routes.ts) — `NOTIFICATION_MANAGER_ROUTES` constant (PREFIXES + SUB_ROUTES).
- [`types.ts`](./types.ts) — `NotificationEntity`, `NotificationInboxItem`, `CreateNotificationInput`,
  `DeliveryResult`, plus Request/Response pairs for all six endpoints.
- [`index.ts`](./index.ts) — `notificationManagerConnector` client SDK + re-export of routes.

## Connector shape

Modeled on [`__internal__/activity-logger/index.ts`](../activity-logger/index.ts) — both are
**INTERNAL_ONLY** append-only services, so they share the same constraints:

- **Single API group** with `defaults: { internalAccessKeyRequired: true }`, so every method
  inherits the internal-access requirement.
- **No per-caller access-key registry** — the setter surface is just `useLocal`, `setBaseUrl`,
  `setInternalAccessKey`, `setTrustedServiceKey`.
- **Default base URL** from `urls['notificationManager']` in
  [`../shared/config.ts`](../shared/config.ts) (absent for now → falls back to `''`; set via
  `setBaseUrl`/`useLocal` at bootstrap until a per-group URL is published).
- **`getById` allows-not-found by default** — 404 returns `null`, opt out with
  `{ allowNotFound: false }`.

notification-manager-specific vs activity-logger:

- **Recipient axis** — one notification has one `recipientId` (vs activity-logger's actor/target
  split).
- **Read state** — append-only read receipts; `markRead` appends, `getByRecipient` returns
  `unread` per item, `getUnreadCount` for badges.
- **Synchronous dispatch** — `createNotifications` returns per-notification `deliveries` (Slack in
  v1). See the service's `docs/memo/synchronous-dispatch.md`.

Re-exported from [`connector.ts`](../../connector.ts) as `notificationManagerConnector`.
