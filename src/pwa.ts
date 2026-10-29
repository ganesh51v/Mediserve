/**
 * Service Worker registration & PWA Installation Manager
 */

let deferredInstallPrompt: any = null;

export function registerServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return;
  }

  // In development, unregister any active service workers so they don't intercept Vite HMR WebSocket or cache outdated dev tokens
  if (import.meta.env.DEV) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        registration.unregister();
      }
    });
    return;
  }

  // Register on window load to avoid delaying initial paint
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((registration) => {
        // Check for updates
        registration.addEventListener("updatefound", () => {
          const installingWorker = registration.installing;
          if (installingWorker) {
            installingWorker.addEventListener("statechange", () => {
              if (
                installingWorker.state === "installed" &&
                navigator.serviceWorker.controller
              ) {
                // New content is available; can trigger skipWaiting if desired
                installingWorker.postMessage({ type: "SKIP_WAITING" });
              }
            });
          }
        });
      })
      .catch((error) => {
        console.warn("[MediServe PWA] Service worker registration failed:", error);
      });

    // Refresh page when new service worker takes control
    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (!refreshing) {
        refreshing = true;
      }
    });
  });

  // Capture beforeinstallprompt for installability
  window.addEventListener("beforeinstallprompt", (e: Event) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    window.dispatchEvent(new CustomEvent("pwa-installable"));
  });

  window.addEventListener("appinstalled", () => {
    deferredInstallPrompt = null;
    console.log("[MediServe PWA] Application installed successfully");
  });
}

export function promptPwaInstall(): Promise<boolean> {
  if (!deferredInstallPrompt) {
    return Promise.resolve(false);
  }
  return deferredInstallPrompt.prompt().then(() => {
    return deferredInstallPrompt.userChoice.then((choiceResult: { outcome: string }) => {
      deferredInstallPrompt = null;
      return choiceResult.outcome === "accepted";
    });
  });
}

export function isPwaInstallable(): boolean {
  return Boolean(deferredInstallPrompt);
}

