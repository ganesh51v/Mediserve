/**
 * src/spa/auth/ClerkSessionSync.tsx
 *
 * When Clerk mode is active, keeps window.__clerk_token in sync with the
 * live Clerk session JWT so apiFetch can attach it to every API request
 * without needing hook context.
 *
 * In dev mode this renders nothing and costs zero.
 */

import { useEffect } from "react";
import { useAuth } from "@clerk/react";
import { CLERK_ENABLED } from "./clerk";

function ClerkSessionSyncInner() {
  const { getToken, isSignedIn, signOut } = useAuth();

  useEffect(() => {
    (window as any).__clerk_sign_out = signOut;
    return () => {
      delete (window as any).__clerk_sign_out;
    };
  }, [signOut]);

  useEffect(() => {
    if (!isSignedIn) {
      delete (window as any).__clerk_token;
      return;
    }

    let cancelled = false;

    const refresh = async () => {
      try {
        const token = await getToken();
        if (!cancelled) {
          (window as any).__clerk_token = token;
        }
      } catch {
        // Silently ignore — token will be refreshed on next attempt
      }
    };

    refresh();
    // Refresh every 4 minutes (Clerk tokens expire in ~1 hour, but refresh proactively)
    const interval = setInterval(refresh, 4 * 60 * 1000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [isSignedIn, getToken]);

  return null;
}

/**
 * Drop this anywhere inside ClerkProviderWrapper. In dev mode it is a no-op.
 */
export function ClerkSessionSync() {
  if (!CLERK_ENABLED) return null;
  return <ClerkSessionSyncInner />;
}
