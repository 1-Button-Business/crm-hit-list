import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ mode }) => {
  // Convex writes its address to .env.local. Only the public address is passed to the page.
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [react(), tailwindcss()],
    define: { __CONVEX_URL__: JSON.stringify(env.VITE_CONVEX_URL || env.CONVEX_URL || "") },
    // The CRM screens live in ../core. One copy of React for both folders.
    resolve: { dedupe: ["react", "react-dom"] },
    server: { port: 5199, strictPort: true, fs: { allow: [".."] } },
  };
});
