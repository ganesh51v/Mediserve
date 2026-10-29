import React from "react";
import ReactDOM from "react-dom/client";
import App from "./spa/App";
import { ClerkProviderWrapper } from "./spa/auth/clerk";
import { ClerkSessionSync } from "./spa/auth/ClerkSessionSync";
import { registerServiceWorker } from "./pwa";
import "./index.css";

// Initialize PWA Service Worker for offline capability & caching
registerServiceWorker();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {/*
      ClerkProviderWrapper: renders <ClerkProvider> if VITE_CLERK_PUBLISHABLE_KEY
      is a real key, otherwise renders children directly (dev fallback).
    */}
    <ClerkProviderWrapper>
      {/*
        ClerkSessionSync: writes the live Clerk JWT to window.__clerk_token
        so apiFetch can attach it to every request. No-op in dev mode.
      */}
      <ClerkSessionSync />
      <App />
    </ClerkProviderWrapper>
  </React.StrictMode>
);
