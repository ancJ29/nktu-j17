export const ACTIVITY_LOGGER_ROUTES = {
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
      GET_BY_ID: {
        PATH: '/:id',
        METHOD: 'GET',
      },
      DELETE_BY_CLIENT: {
        PATH: '/by-client/:clientId',
        METHOD: 'DELETE',
      },
    },
  },
} as const;
