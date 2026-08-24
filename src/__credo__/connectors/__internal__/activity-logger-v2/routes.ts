export const ACTIVITY_LOGGER_V2_ROUTES = {
  PREFIXES: {
    ACTIVITY: '/api/activities',
  },
  SUB_ROUTES: {
    ACTIVITY: {
      LOG_ACTIVITIES: {
        PATH: '',
        METHOD: 'POST',
      },

      GET_BY_ACTOR: {
        PATH: '/by-actor/:actorId',
        METHOD: 'GET',
      },
      GET_BY_TARGET: {
        PATH: '/by-target/:targetId',
        METHOD: 'GET',
      },
      // Three routes, and three fewer than the v1 service. GET_BY_ID,
      // DELETE_BY_CLIENT and the `?action=` filter are NOT missing here — they
      // are in `ACTIVITY_LOGGER_ROUTES`, which still describes the SQLite
      // service, because that service still serves them.
      //
      // This is why the two connectors are separate rather than one constant
      // with a `v2` flag. Editing the shared constant during the rewrite
      // amputated three routes from a service that was still running and could
      // still answer them — the surface shrank because its *replacement* had a
      // smaller one, which is not a reason.
      //
      // On DynamoDB the three are genuinely wrong rather than merely unused:
      // `by id` needs a second GSI (a third write per activity, forever),
      // `action` is a FilterExpression that returns short pages the caller has
      // to loop over, and the delete was a tenant-wide wipe reachable with a
      // key that shipped in the browser bundle — now a job whose credential no
      // Lambda role holds. See external/activity-logger/docs/memo/.
    },
  },
} as const;
