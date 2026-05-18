import React from "react";
import { createRoot } from "react-dom/client";
import { DesktopRouterProvider } from "./adapters/router";
import { DesktopApp } from "./app";

const container = document.getElementById("root");
if (!container) throw new Error("root element not found");
createRoot(container).render(
  <React.StrictMode>
    <DesktopRouterProvider>
      <DesktopApp />
    </DesktopRouterProvider>
  </React.StrictMode>
);
