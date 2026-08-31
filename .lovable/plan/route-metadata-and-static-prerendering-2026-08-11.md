# Route Metadata and Static Prerendering

## Goal
Make every public, indexable URL ship complete page content and unique SEO metadata in its initial HTML response, while leaving article content, sitemap entries, and excluded unlock/auth/admin routes unchanged.

## Implementation
1. **Centralize page metadata**
   - Add a reusable SEO component that emits title, description, self-referencing canonical, Open Graph, and Twitter tags.
   - Keep descriptions unique and within roughly 140–160 characters, deriving blog metadata from each post's own excerpt/content.
   - Apply it to the homepage, each category, every blog article, and all public static/legal/product pages.
   - Keep non-indexable utility, unlock, auth, dashboard, callback, and admin pages excluded.

2. **Generate static HTML for every indexable route**
   - Add a Vite-compatible post-build prerender step that visits the production build and writes the rendered HTML back to each route's `index.html`.
   - Generate the route list from article data plus the known category/static routes, avoiding duplicate route definitions and avoiding changes to `sitemap.xml`.
   - Ensure the output captures Helmet-managed route metadata and the full rendered article text before JavaScript runs.

3. **Make rendering prerender-safe**
   - Address browser-only behavior that blocks or destabilizes static generation without changing user-facing business logic.
   - Preserve the current client-side hydration/navigation behavior after the generated HTML loads.

4. **Verify raw build artifacts**
   - Build the production app and inspect generated HTML files directly, not the rendered DOM.
   - Confirm the requested article source contains article paragraphs, its own title, unique description, canonical, OG, and Twitter tags.
   - Repeat source checks for one category URL and `/about`, and verify their title/description differ from the homepage.
   - Run the relevant existing tests and report each requested check as pass/fail.

## Technical details
- The project already has `react-helmet-async`; retain its provider and use it consistently.
- Static output will use route directories such as `dist/blog/<slug>/index.html`, allowing the host to serve route-specific initial HTML while React continues as the interactive SPA.
- The prerender verification will fail the build if required route HTML, metadata, or meaningful body text is missing.
