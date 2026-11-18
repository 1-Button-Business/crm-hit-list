import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./hub.css";
import { Hub } from "./Hub.tsx";

export const convex = new ConvexReactClient(__CONVEX_URL__);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ConvexAuthProvider client={convex}><Hub /></ConvexAuthProvider>
  </StrictMode>,
);
