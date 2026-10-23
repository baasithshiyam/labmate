/// <reference types="vitest/config" />
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  // Relative asset paths, so the build works at https://<user>.github.io/<repo>/ as well as at a domain root.
  base: "./",
  plugins: [react(), tailwindcss()],
  build: {
    // three.js and drei load lazily with the 3D lab, so one large chunk there is expected.
    chunkSizeWarningLimit: 1200,
  },
  test: {
    environment: "node",
  },
});
