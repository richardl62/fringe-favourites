import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/fringe-favourites/",
  build: {
    outDir: "build",
  },
  test: {
    environment: "node",
  },
});
