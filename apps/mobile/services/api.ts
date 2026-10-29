/**
 * apps/mobile/services/api.ts
 * Mobile API client instance configured for local dev or production host.
 */

import { MediServeApiClient } from "../../packages/api-client/src/index";

let userToken: string | null = null;

export const setMobileAuthToken = (token: string | null) => {
  userToken = token;
};

export const api = new MediServeApiClient({
  baseUrl: process.env.EXPO_PUBLIC_API_URL || "http://localhost:3001",
  getToken: () => userToken,
  onUnauthorized: () => {
    userToken = null;
  },
});

