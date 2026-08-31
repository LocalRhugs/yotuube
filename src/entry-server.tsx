import { renderToString } from "react-dom/server";
import { StaticRouter } from "react-router-dom/server";
import { HelmetProvider, type HelmetServerState } from "react-helmet-async";
import { posts } from "./content/posts";

const staticRoutes = [
  "/",
  "/about",
  "/contact",
  "/privacy",
  "/terms",
  "/dmca",
  "/disclosure",
  "/editorial-policy",
  "/smart-links",
  "/social-media-glossary",
  "/how-it-works",
  "/pricing",
];

const categoryRoutes = ["youtube", "tiktok", "monetization", "tools", "analytics", "growth", "newsletter"]
  .map((category) => `/category/${category}`);

export const prerenderRoutes = [
  ...staticRoutes,
  ...categoryRoutes,
  ...posts.map((post) => `/blog/${post.slug}`),
];

export async function render(url: string) {
  if (!("localStorage" in globalThis)) {
    const values = new Map<string, string>();
    Object.defineProperty(globalThis, "localStorage", {
      value: {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => values.set(key, value),
        removeItem: (key: string) => values.delete(key),
        clear: () => values.clear(),
        key: (index: number) => Array.from(values.keys())[index] ?? null,
        get length() { return values.size; },
      },
      configurable: true,
    });
  }
  const { default: App } = await import("./App");
  const helmetContext: { helmet?: HelmetServerState } = {};
  const html = renderToString(
    <HelmetProvider context={helmetContext}>
      <StaticRouter location={url}>
        <App />
      </StaticRouter>
    </HelmetProvider>,
  );

  if (!helmetContext.helmet) throw new Error(`Helmet metadata was not generated for ${url}`);
  return { html, helmet: helmetContext.helmet };
}