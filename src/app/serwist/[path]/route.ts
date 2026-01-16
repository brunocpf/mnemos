import { createSerwistRoute } from "@serwist/turbopack";
import { spawnSync } from "node:child_process";

// Using `git rev-parse HEAD` might not the most efficient
// way of determining a revision. You may prefer to use
// the hashes of every extra file you precache.
const gitRevision = spawnSync("git", ["rev-parse", "HEAD"], {
  encoding: "utf-8",
}).stdout?.trim();

const revision = gitRevision?.length ? gitRevision : crypto.randomUUID();

export const { dynamic, dynamicParams, revalidate, generateStaticParams, GET } =
  createSerwistRoute({
    additionalPrecacheEntries: [
      { url: "/", revision },
      { url: "/pt-BR", revision },
      { url: "/~offline", revision },
    ],
    swSrc: "src/app/sw.ts",

    // Copy relevant Next.js configuration (assetPrefix,
    // basePath, distDir) over if you've changed them.
    nextConfig: {},
  });
