export const API_ROUTES = {
  AUTH: {
    BASE: "api/v1/auth",
    OAUTH2: "api/v1/oauth2",
    REFRESH_TOKENS: "api/v1/auth/token/refresh",
  },
  USERS: {
    BASE: "api/v1/users",
    GET_CURRENT_USER: "api/v1/users/current-user",
  },
  SHOWS: {
    BASE: "api/v1/shows",
  },
} as const;
