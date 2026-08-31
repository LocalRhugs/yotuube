import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const distDir = join(root, "dist");
const serverDir = join(root, "dist-ssr");
const template = await readFile(join(distDir, "index.html"), "utf8");
const serverEntry = await import(pathToFileURL(join(serverDir, "entry-server.js")).href);

function routeFile(route) {
  return route === "/" ? join(distDir, "index.html") : join(distDir, route.slice(1), "index.html");
}

function routeHead(helmet) {
  return [
    helmet.title.toString(),
    helmet.priority.toString(),
    helmet.meta.toString(),
    helmet.link.toString(),
    helmet.script.toString(),
  ].filter(Boolean).join("\n    ");
}

for (const route of serverEntry.prerenderRoutes) {
  const { html, helmet } = await serverEntry.render(route);
  const output = template
    .replace("<!-- ROUTE_HEAD_START -->\n    <!-- ROUTE_HEAD_END -->", `<!-- ROUTE_HEAD_START -->\n    ${routeHead(helmet)}\n    <!-- ROUTE_HEAD_END -->`)
    .replace('<div id="root"></div>', `<div id="root">${html}</div>`);
  const file = routeFile(route);
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, output);
}

await rm(serverDir, { recursive: true, force: true });
console.log(`Prerendered ${serverEntry.prerenderRoutes.length} indexable routes.`);