import { copyFile, cp, mkdir, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const projectRoot = process.cwd();
const clientDir = path.join(projectRoot, "dist", "client");
const serverDir = path.join(projectRoot, "dist", "server");
const outputDir = path.join(projectRoot, ".wrangler", "pages-build");
const workerDir = path.join(outputDir, "_worker.js");

await rm(outputDir, { recursive: true, force: true });
await mkdir(workerDir, { recursive: true });

await cp(clientDir, outputDir, { recursive: true });

for (const file of [
  "index.js",
  "vinext-client-assets.js",
  "__vite_rsc_assets_manifest.js",
]) {
  await copyFile(path.join(serverDir, file), path.join(workerDir, file));
}

for (const directory of ["_next", "ssr"]) {
  await cp(path.join(serverDir, directory), path.join(workerDir, directory), {
    recursive: true,
  });
}

await rename(path.join(workerDir, "index.js"), path.join(workerDir, "app.js"));

await writeFile(
  path.join(workerDir, "index.js"),
  `import app from "./app.js";

export default {
  async fetch(request, env, context) {
    if (request.method === "GET" || request.method === "HEAD") {
      const assetResponse = await env.ASSETS.fetch(request);
      if (assetResponse.status !== 404) {
        return assetResponse;
      }
    }

    return app.fetch(request, env, context);
  },
};
`,
  "utf8",
);

console.log(`Prepared Cloudflare Pages output at ${outputDir}`);
