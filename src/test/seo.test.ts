// Automated SEO / AEO / GEO / AIO validation.
// Runs in CI via `bun run test`. Checks sitemap.xml, robots.txt,
// per-post canonicals, and JSON-LD entity data for every blog post.

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import { posts } from "@/content/posts";

const BASE = "https://cloud-publish-pro.lovable.app";

const sitemap = readFileSync(resolve("public/sitemap.xml"), "utf8");
const robots = readFileSync(resolve("public/robots.txt"), "utf8");
const indexHtml = readFileSync(resolve("index.html"), "utf8");

describe("robots.txt", () => {
  it("allows root crawl", () => {
    expect(robots).toMatch(/^User-agent:\s*\*/m);
    expect(robots).toMatch(/^Allow:\s*\/$/m);
  });
  it("blocks admin and bridge routes from indexing", () => {
    expect(robots).toMatch(/Disallow:\s*\/admin/);
    expect(robots).toMatch(/Disallow:\s*\/u\//);
    expect(robots).toMatch(/Disallow:\s*\/s\//);
  });
  it("references the sitemap", () => {
    expect(robots).toMatch(/Sitemap:\s*https?:\/\/\S+sitemap\.xml/);
  });
});

describe("sitemap.xml", () => {
  it("is valid XML with a urlset root", () => {
    expect(sitemap).toMatch(/<\?xml version="1\.0"/);
    expect(sitemap).toMatch(/<urlset\s+xmlns="http:\/\/www\.sitemaps\.org/);
    expect(sitemap).toMatch(/<\/urlset>/);
  });
  it("uses absolute, canonical https URLs", () => {
    const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    expect(locs.length).toBeGreaterThan(10);
    for (const loc of locs) {
      expect(loc.startsWith(BASE)).toBe(true);
    }
  });
  it("contains an entry for every published blog post", () => {
    for (const p of posts) {
      expect(sitemap).toContain(`${BASE}/blog/${p.slug}`);
    }
  });
  it("does not list noindex bridge or admin routes", () => {
    expect(sitemap).not.toMatch(/\/admin/);
    expect(sitemap).not.toMatch(/\/u\//);
    expect(sitemap).not.toMatch(/\/s\//);
  });
});

describe("Sitewide entity data (index.html)", () => {
  it("declares the AdSense publisher account", () => {
    expect(indexHtml).toMatch(/google-adsense-account/);
    expect(indexHtml).toMatch(/ca-pub-8877213222492502/);
  });
  it("ships Organization or WebSite JSON-LD", () => {
    expect(indexHtml).toMatch(/application\/ld\+json/);
    expect(indexHtml).toMatch(/"@type":\s*"(Organization|WebSite)"/);
  });
  it("has a non-default <title> and meta description", () => {
    const title = indexHtml.match(/<title>([^<]+)<\/title>/)?.[1] ?? "";
    expect(title.length).toBeGreaterThan(10);
    expect(title.toLowerCase()).not.toContain("lovable app");
    const desc = indexHtml.match(/name="description"\s+content="([^"]+)"/)?.[1] ?? "";
    expect(desc.length).toBeGreaterThan(30);
  });
});

describe("Blog post structure (entity & AEO data)", () => {
  it("has unique slugs", () => {
    const slugs = posts.map((p) => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
  for (const p of posts) {
    it(`"${p.slug}" — valid metadata`, () => {
      expect(p.title.length).toBeGreaterThan(10);
      expect(p.title.length).toBeLessThan(120);
      expect(p.excerpt.length).toBeGreaterThan(60);
      expect(p.excerpt.length).toBeLessThan(280);
      expect(p.author.length).toBeGreaterThan(2);
      expect(p.publishedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(p.tags.length).toBeGreaterThan(0);
      // body must have at least one heading and be substantive (AEO / GEO needs structure)
      expect(p.body.length).toBeGreaterThan(800);
      // article must have structure for AEO / GEO: markdown heading OR bolded sub-sections
      expect(p.body).toMatch(/(^###?\s+|\*\*\d+\.|\*\*[A-Z])/m);
    });
  }
});
