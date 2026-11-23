import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Relative base so the build works at any path (GitHub Pages project site, local preview, any static host).
export default defineConfig({
  base: "./",
  plugins: [react()],
  build: {
    target: "es2022",
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks: (id: string) => (id.includes("node_modules/three") ? "three" : undefined),
      },
    },
  },
});
