"use client";

import dynamic from "next/dynamic";

const App = dynamic(() => import("@/spa/App"), { ssr: false });

export function ClientSPA() {
  return <App />;
}

export default ClientSPA;
