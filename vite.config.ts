import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { nitro } from "nitro/vite";

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

  plugins: isVercelBuild
    ? [
        nitro({
          preset: "vercel",
          entry: "./src/server.ts",
          output: {
            dir: ".vercel/output",
            serverDir: ".vercel/output/functions/__server.func",
            publicDir: ".vercel/output/static",
          },
        }),
      ]
    : [],
});
