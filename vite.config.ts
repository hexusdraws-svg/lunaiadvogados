import { defineConfig } from "@lovable.dev/vite-tanstack-config";

const isVercelBuild =
  Boolean(process.env.VERCEL && process.env.VERCEL !== "0") ||
  Boolean(process.env.VERCEL_URL) ||
  process.env.npm_lifecycle_event === "build:vercel";

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  nitro: false,
  cloudflare: isVercelBuild ? false : undefined,
});
