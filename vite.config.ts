import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { nitro } from "nitro/vite";

const isVercelBuild =
  Boolean(process.env.VERCEL && process.env.VERCEL !== "0") ||
  Boolean(process.env.VERCEL_URL) ||
  process.env.npm_lifecycle_event === "build:vercel";

export default defineConfig({
  tanstackStart: {
    // Tell TanStack Start to use the real SSR entry in src/server.ts.
    // This keeps the local Vite preview compatible with the generated server bundle.
    server: { entry: "server" },
  },

  // The Lovable wrapper can otherwise select its Cloudflare Nitro target.
  // Disable that wrapper Nitro/Cloudflare path and explicitly add Nitro for Vercel.
  nitro: false,
  cloudflare: isVercelBuild ? false : undefined,

  plugins: isVercelBuild
    ? [
        nitro({
          preset: "vercel",
          output: {
            dir: ".vercel/output",
            serverDir: ".vercel/output/functions/__server.func",
            publicDir: ".vercel/output/static",
          },
        }),
      ]
    : [],
});
