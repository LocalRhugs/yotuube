// Runs before `vite dev` and `vite build` (predev/prebuild hooks); writes public/sitemap.xml.
// Pulls blog routes from src/content/posts.ts so the sitemap always matches the published set.

import { writeFileSync } from "fs";
import { resolve } from "path";
import { posts } from "../src/content/posts";

const BASE_URL = "https://cloud-publish-pro.lovable.app";

interface SitemapEntry {
  path: string;
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

const staticEntries: SitemapEntry[] = [
  { path: "/", changefreq: "daily", priority: "1.0" },
  { path: "/about", changefreq: "monthly", priority: "0.6" },
  { path: "/contact", changefreq: "monthly", priority: "0.5" },
  { path: "/privacy", changefreq: "yearly", priority: "0.3" },
  { path: "/terms", changefreq: "yearly", priority: "0.3" },
  { path: "/dmca", changefreq: "yearly", priority: "0.3" },
  { path: "/disclosure", changefreq: "yearly", priority: "0.3" },
  { path: "/editorial-policy", changefreq: "monthly", priority: "0.5" },
  { path: "/smart-links", changefreq: "monthly", priority: "0.8" },
  { path: "/how-it-works", changefreq: "monthly", priority: "0.8" },
  { path: "/pricing", changefreq: "monthly", priority: "0.7" },
  { path: "/social-media-glossary", changefreq: "monthly", priority: "0.8" },
  { path: "/category/youtube", changefreq: "weekly", priority: "0.8" },
  { path: "/category/tiktok", changefreq: "weekly", priority: "0.8" },
  { path: "/category/monetization", changefreq: "weekly", priority: "0.8" },
  { path: "/category/tools", changefreq: "weekly", priority: "0.8" },
  { path: "/category/analytics", changefreq: "weekly", priority: "0.7" },
  { path: "/category/growth", changefreq: "weekly", priority: "0.7" },
  { path: "/category/newsletter", changefreq: "weekly", priority: "0.7" },
];

const postEntries: SitemapEntry[] = posts.map((p) => ({
  path: `/blog/${p.slug}`,
  lastmod: p.publishedAt,
  changefreq: "monthly",
  priority: "0.9",
}));

const entries = [...staticEntries, ...postEntries];

function generateSitemap(entries: SitemapEntry[]) {
  const urls = entries.map((e) =>
    [
      `  <url>`,
      `    <loc>${BASE_URL}${e.path}</loc>`,
      e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
      e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
      e.priority ? `    <priority>${e.priority}</priority>` : null,
      `  </url>`,
    ]
      .filter(Boolean)
      .join("\n"),
  );

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    ...urls,
    `</urlset>`,
  ].join("\n");
}

writeFileSync(resolve("public/sitemap.xml"), generateSitemap(entries));
console.log(`sitemap.xml written (${entries.length} entries)`);
