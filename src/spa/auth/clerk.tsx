/**
 * src/spa/auth/clerk.tsx
 *
 * Clerk authentication integration for the MediServe React SPA.
 *
 * Dual-mode design:
 *  - CLERK_ENABLED=true  → ClerkProvider wraps the app; sessions are Clerk
 *                          JWTs verified by the Express backend.
 *  - CLERK_ENABLED=false → ClerkProvider is omitted; the app uses the built-in
 *                          email+password JWT flow (always works without keys).
 *
 * To enable Clerk mode:
 *  1. Create an app at https://dashboard.clerk.com
 *  2. Enable "Email + Password" sign-in strategy in Clerk Dashboard
 *  3. Set VITE_CLERK_PUBLISHABLE_KEY and CLERK_SECRET_KEY in .env
 *  4. Optionally create matching users in Clerk and set
 *     publicMetadata: { role: "CAREGIVER" | "DOCTOR" | "ADMIN" }
 */

import React from "react";
import { ClerkProvider } from "@clerk/react";

export const CLERK_PUBLISHABLE_KEY =
  (typeof import.meta !== "undefined" && (import.meta as any).env
    ? ((import.meta as any).env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined)
    : undefined) ??
  (typeof process !== "undefined" && process.env
    ? process.env.VITE_CLERK_PUBLISHABLE_KEY ||
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ||
      process.env.CLERK_PUBLISHABLE_KEY
    : "") ??
  "";

/** True when a real (non-placeholder) publishable key is present */
export const CLERK_ENABLED =
  CLERK_PUBLISHABLE_KEY.length > 0 &&
  !CLERK_PUBLISHABLE_KEY.includes("PLACEHOLDER");

// Suppress benign Clerk development instance warning at startup
if (typeof window !== "undefined") {
  const originalWarn = console.warn;
  console.warn = (...args: any[]) => {
    if (
      typeof args[0] === "string" &&
      args[0].includes("Clerk has been loaded with development keys")
    ) {
      return;
    }
    originalWarn.apply(console, args);
  };
}

// ─── Provider wrapper ─────────────────────────────────────────────────────────

interface Props {
  children: React.ReactNode;
}

/**
 * Wraps children in <ClerkProvider> when CLERK_ENABLED.
 * When disabled, renders children directly — zero cost, zero Clerk API calls.
 */
export function ClerkProviderWrapper({ children }: Props) {
  if (!CLERK_ENABLED) {
    return <>{children}</>;
  }
  return (
    <ClerkProvider
      publishableKey={CLERK_PUBLISHABLE_KEY}
      unsafe_disableDevelopmentModeConsoleWarning
    >
      {children}
    </ClerkProvider>
  );
}

// ─── Token helpers ────────────────────────────────────────────────────────────

const DEV_TOKEN_KEY = "mediserve_clerk_token";

/** Stores the dev-mode JWT. No-op in Clerk mode. */
export function setDevToken(token: string | null) {
  if (token) {
    localStorage.setItem(DEV_TOKEN_KEY, token);
  } else {
    localStorage.removeItem(DEV_TOKEN_KEY);
  }
}

/** Clears both the dev token and the cached Clerk session token. */
export async function clearToken() {
  if (typeof localStorage !== "undefined") {
    localStorage.removeItem(DEV_TOKEN_KEY);
  }
  if (typeof window !== "undefined") {
    delete (window as any).__clerk_token;
    if (typeof (window as any).__clerk_sign_out === "function") {
      try {
        await (window as any).__clerk_sign_out();
      } catch {
        // Silently continue if signOut encounters an error
      }
    }
  }
}
