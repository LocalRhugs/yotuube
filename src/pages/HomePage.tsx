import { Link, useParams, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { posts } from "@/content/posts";
import { ArrowRight, BarChart3, CheckCircle2, Clock, FileText, Link2, Lock, MousePointerClick, ShieldCheck, Youtube } from "lucide-react";

const CATEGORY_LABELS: Record<string, string> = {
  youtube: "YouTube",
  tiktok: "TikTok",
  monetization: "Monetization",
  tools: "Tools",
  analytics: "Analytics",
  growth: "Growth",
  newsletter: "Newsletter",
};

export default function HomePage() {
  const { category } = useParams();
  const [params] = useSearchParams();
  const q = (params.get("q") || "").toLowerCase().trim();

  let visible = posts.slice().sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  if (category && CATEGORY_LABELS[category]) {
    visible = visible.filter((p) => p.category === CATEGORY_LABELS[category]);
  }
  if (q) {
    visible = visible.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.excerpt.toLowerCase().includes(q) ||
        p.tags.some((t) => t.includes(q))
    );
  }

  // Only "feature" a post when we have enough to fill the grid below it
  const showFeatured = visible.length >= 4;
  const featured = showFeatured ? visible[0] : null;
  const rest = showFeatured ? visible.slice(1) : visible;

  // For thin category pages, show extra posts from the rest of the site
  const moreFromSite = category
    ? posts
        .filter((p) => p.category !== CATEGORY_LABELS[category!])
        .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
        .slice(0, 6)
    : [];

  const pageTitle = category
    ? `${CATEGORY_LABELS[category]} — Creator Cloud`
    : "Creator Cloud — Tools, Tips & Revenue for Modern Creators";
  const pageDesc = category
    ? `In-depth ${CATEGORY_LABELS[category]} articles, reviews, and growth playbooks for video and audio creators.`
    : "In-depth guides, software reviews, and revenue tactics for video creators, social-media managers, and indie tech founders.";

  if (!category && !q) {
    const highValuePosts = [
      "google-adsense-approval-checklist-2026",
      "youtube-partner-program-requirements-2026",
      "youtube-shorts-monetization-2026-realistic-rpm-breakdown",
      "brand-deal-negotiation-creator-rate-cards-2026",
      "creator-business-banking-mercury-relay-2026",
      "best-keyword-research-tools-for-youtube-2026",
    ]
      .map((slug) => posts.find((post) => post.slug === slug))
      .filter((post): post is NonNullable<typeof post> => Boolean(post));

    return (
      <>
        <Helmet>
          <title>Creator Cloud — Smart Links for Creators</title>
          <meta
            name="description"
            content="Create smart links that unlock files, scripts, videos, and creator resources after real audience actions like subscribing, liking, or following."
          />
          <link rel="canonical" href="https://cloud-publish-pro.lovable.app/" />
          <meta property="og:title" content="Creator Cloud — Smart Links for Creators" />
          <meta property="og:description" content="A creator smart-link platform with unlock pages, progress tracking, and creator monetization guides." />
          <script type="application/ld+json">{JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            name: "Creator Cloud",
            applicationCategory: "CreatorApplication",
            operatingSystem: "Web",
            url: "https://cloud-publish-pro.lovable.app/",
            description: "Smart-link unlock pages for creators who share files, scripts, videos, and resources after audience actions.",
            offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
            publisher: { "@id": "https://cloud-publish-pro.lovable.app/#organization" },
          })}</script>
        </Helmet>

        <section className="border-b border-border bg-background">
          <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 sm:px-6 md:grid-cols-2 md:py-20">
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-primary">Smart links for creators</p>
              <h1 className="text-4xl font-bold leading-tight text-foreground md:text-6xl">
                Unlock files after real audience actions.
              </h1>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg">
                Creator Cloud helps creators share scripts, templates, bonus videos, and resources through clean unlock pages with progress tracking — backed by a real education hub, policy pages, and transparent creator guides.
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Link to="/signup" className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90">
                  Create smart link <ArrowRight className="h-4 w-4" />
                </Link>
                <Link to="/how-it-works" className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-5 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-accent">
                  See how it works
                </Link>
              </div>
              <div className="mt-7 grid grid-cols-3 gap-4 max-w-lg text-sm">
                <div>
                  <p className="text-2xl font-bold text-foreground">34+</p>
                  <p className="text-muted-foreground">Creator guides</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">3-step</p>
                  <p className="text-muted-foreground">Unlock flow</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">No ads</p>
                  <p className="text-muted-foreground">on bridge pages</p>
                </div>
              </div>
            </div>

            <div className="mx-auto w-full max-w-sm">
              <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
                <div className="mb-4 text-center">
                  <h2 className="text-xl font-bold text-foreground">Free Script Pack</h2>
                  <p className="text-sm text-muted-foreground">Complete the actions to unlock</p>
                </div>
                <div className="space-y-3">
                  <div className="unlock-action-row unlock-action-youtube"><Youtube className="h-4 w-4" />Subscribe to channel</div>
                  <div className="unlock-action-row unlock-action-neutral"><MousePointerClick className="h-4 w-4" />Like the video</div>
                  <div className="unlock-action-row unlock-action-neutral"><FileText className="h-4 w-4" />Comment when done</div>
                </div>
                <div className="mt-5">
                  <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                    <span>Unlock progress</span>
                    <span className="font-semibold text-primary">0/3 done</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted" />
                  <button className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-muted text-sm font-semibold text-muted-foreground" disabled>
                    <Lock className="h-4 w-4" /> Unlock file
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <div className="grid gap-4 md:grid-cols-4">
            {[
              [Link2, "Short links", "Turn long resource URLs into clean creator unlock pages."],
              [MousePointerClick, "Action steps", "Ask visitors to subscribe, like, comment, follow, or open a creator page."],
              [BarChart3, "Progress tracking", "Show exactly how many steps are done before the unlock activates."],
              [ShieldCheck, "Quality controls", "Keep ads and crawler signals away from low-value utility routes."],
            ].map(([Icon, title, text]) => {
              const TypedIcon = Icon as typeof Link2;
              return (
                <article key={title as string} className="rounded-xl border border-border bg-card p-5">
                  <TypedIcon className="mb-3 h-5 w-5 text-primary" />
                  <h2 className="mb-2 text-lg font-bold text-foreground">{title as string}</h2>
                  <p className="text-sm leading-relaxed text-muted-foreground">{text as string}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section className="border-y border-border bg-card/40">
          <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
            <div className="mb-8 max-w-2xl">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary">How it works</p>
              <h2 className="text-3xl font-bold text-foreground">A real tool flow, not an empty redirect page.</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {[
                ["1", "Create", "Paste the destination URL and choose the required actions for the visitor."],
                ["2", "Share", "Shorten the smart link and post it on YouTube, TikTok, Discord, Telegram, or your bio."],
                ["3", "Unlock", "Visitors read helpful context, complete the actions, then continue to the promised file or page."],
              ].map(([step, title, text]) => (
                <article key={step} className="rounded-xl border border-border bg-background p-5">
                  <span className="mb-4 flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">{step}</span>
                  <h3 className="mb-2 text-xl font-bold text-foreground">{title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <div className="grid gap-8 lg:grid-cols-[1fr_0.8fr]">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary">Why this is safer for review</p>
              <h2 className="mb-4 text-3xl font-bold text-foreground">The public site now proves Creator Cloud is a product.</h2>
              <p className="text-muted-foreground leading-relaxed">
                The root page now explains the smart-link platform first, while the blog, glossary, legal pages, author information, and editorial policy support the product instead of pretending the site is only an article farm.
              </p>
            </div>
            <div className="space-y-3">
              {["Homepage explains the actual smart-link tool", "Glossary and guides provide original supporting content", "Unlock pages are excluded from the indexable sitemap", "Ads remain restricted to full editorial articles"].map((item) => (
                <div key={item} className="flex gap-3 rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-border bg-card/40">
          <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
            <div className="mb-6 flex items-end justify-between gap-4">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary">Creator education hub</p>
                <h2 className="text-2xl font-bold text-foreground md:text-3xl">Guides that support the tool.</h2>
              </div>
              <Link to="/category/monetization" className="hidden text-sm font-semibold text-primary hover:underline sm:inline-flex">View guides</Link>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {highValuePosts.map((post) => (
                <Link key={post.slug} to={`/blog/${post.slug}`} className="rounded-xl border border-border bg-background p-5 transition-colors hover:bg-accent">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">{post.category}</p>
                  <h3 className="mb-2 text-base font-bold leading-snug text-foreground">{post.title}</h3>
                  <p className="line-clamp-2 text-sm text-muted-foreground">{post.excerpt}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDesc} />
        <link rel="canonical" href={`https://cloud-publish-pro.lovable.app${category ? `/category/${category}` : "/"}`} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDesc} />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: pageTitle,
          description: pageDesc,
          url: `https://cloud-publish-pro.lovable.app${category ? `/category/${category}` : "/"}`,
          inLanguage: "en",
          isPartOf: { "@id": "https://cloud-publish-pro.lovable.app/#website" },
          publisher: { "@id": "https://cloud-publish-pro.lovable.app/#organization" },
          mainEntity: {
            "@type": "ItemList",
            numberOfItems: visible.length,
            itemListElement: visible.slice(0, 20).map((p, i) => ({
              "@type": "ListItem",
              position: i + 1,
              url: `https://cloud-publish-pro.lovable.app/blog/${p.slug}`,
              name: p.title,
            })),
          },
        })}</script>
        {q && <meta name="robots" content="noindex,follow" />}
      </Helmet>

      <section className="border-b border-white/5 bg-gradient-to-br from-red-500/[0.06] via-transparent to-orange-500/[0.04]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 md:py-20 grid md:grid-cols-5 gap-8 items-center">
          <div className="md:col-span-3">
            <p className="text-xs font-semibold tracking-[0.2em] text-red-400 uppercase mb-3">
              {category ? CATEGORY_LABELS[category] : "Editorial"}
            </p>
            <h1 className="text-3xl md:text-5xl font-bold leading-tight">
              {category ? CATEGORY_LABELS[category] : "Honest writing about the business of being a creator."}
            </h1>
            <p className="mt-4 text-gray-400 max-w-2xl">
              {category
                ? `Recent ${CATEGORY_LABELS[category]} coverage from the Creator Cloud editorial team.`
                : "We test the tools, run the math, and publish what actually works — no sponsored fluff, no recycled press releases."}
            </p>
          </div>
          <div className="md:col-span-2 hidden md:block">
            <div className="rounded-2xl border border-white/10 bg-black/30 backdrop-blur p-5">
              <p className="text-[10px] font-semibold tracking-[0.2em] text-red-400 uppercase mb-3">
                This week on Creator Cloud
              </p>
              <ul className="space-y-3 text-sm">
                {posts
                  .slice()
                  .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
                  .slice(0, 4)
                  .map((p) => (
                    <li key={p.slug}>
                      <Link
                        to={`/blog/${p.slug}`}
                        className="text-gray-300 hover:text-white leading-snug block"
                      >
                        <span className="text-[10px] tracking-widest text-red-400/70 uppercase mr-2">
                          {p.category}
                        </span>
                        {p.title}
                      </Link>
                    </li>
                  ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        {featured && (
          <Link
            to={`/blog/${featured.slug}`}
            className="block group mb-12 rounded-2xl border border-white/10 overflow-hidden hover:border-white/20 transition-colors"
          >
            <div className="p-6 md:p-10 bg-gradient-to-br from-red-500/10 via-transparent to-orange-500/10">
              <p className="text-xs font-semibold text-red-400 uppercase tracking-widest mb-3">
                Featured · {featured.category}
              </p>
              <h2 className="text-2xl md:text-4xl font-bold leading-tight group-hover:text-white text-gray-100 mb-3">
                {featured.title}
              </h2>
              <p className="text-gray-400 max-w-2xl mb-4">{featured.excerpt}</p>
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span>By {featured.author}</span>
                <span className="inline-flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {featured.readingMinutes} min read
                </span>
                <span className="inline-flex items-center gap-1 text-red-400 group-hover:gap-2 transition-all">
                  Read article <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </div>
          </Link>
        )}

        {!category && !q && (() => {
          const editorPickSlugs = [
            "google-adsense-approval-checklist-2026",
            "brand-deal-negotiation-creator-rate-cards-2026",
            "llc-vs-sole-proprietor-for-creators-2026",
            "youtube-shorts-monetization-2026-realistic-rpm-breakdown",
            "best-keyword-research-tools-for-youtube-2026",
            "ai-thumbnail-generators-tested-2026",
          ];
          const picks = editorPickSlugs
            .map((s) => posts.find((p) => p.slug === s))
            .filter((p): p is NonNullable<typeof p> => Boolean(p));
          return (
            <section className="mt-12">
              <h3 className="text-sm font-semibold uppercase tracking-widest text-gray-500 mb-4">
                Editor's picks · highest-value reading
              </h3>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {picks.map((p) => (
                  <Link
                    key={p.slug}
                    to={`/blog/${p.slug}`}
                    className="group rounded-xl border border-red-500/20 bg-gradient-to-br from-red-500/5 to-orange-500/5 p-5 hover:border-red-500/40 transition-colors"
                  >
                    <span className="text-[10px] font-semibold tracking-[0.18em] uppercase text-red-400 mb-2 block">
                      {p.category}
                    </span>
                    <h4 className="font-semibold text-base leading-snug text-gray-100 group-hover:text-white mb-2">
                      {p.title}
                    </h4>
                    <span className="text-xs text-red-400 inline-flex items-center gap-1 group-hover:gap-2 transition-all">
                      Read <ArrowRight className="w-3 h-3" />
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          );
        })()}

        <h3 className="text-sm font-semibold uppercase tracking-widest text-gray-500 mb-4 mt-12">
          {category ? `${CATEGORY_LABELS[category!]} articles` : "Latest articles"}
        </h3>
        {rest.length === 0 ? (
          <p className="text-gray-500 text-sm mb-8">
            That's everything in this category for now — more coming soon.
          </p>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rest.map((p, i) => (
              <div key={p.slug} className="contents">
                <article className="rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-colors p-5 flex flex-col">
                  <span className="text-[10px] font-semibold tracking-[0.18em] uppercase text-red-400/80 mb-2">
                    {p.category}
                  </span>
                  <h4 className="font-semibold text-lg leading-snug mb-2">
                    <Link to={`/blog/${p.slug}`} className="hover:text-white text-gray-100">
                      {p.title}
                    </Link>
                  </h4>
                  <p className="text-sm text-gray-400 line-clamp-3 mb-4 flex-1">{p.excerpt}</p>
                  <div className="text-xs text-gray-500 flex items-center justify-between">
                    <span>{p.author}</span>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {p.readingMinutes} min
                    </span>
                  </div>
                </article>
              </div>
            ))}
          </div>
        )}

        {category && moreFromSite.length > 0 && (
          <section className="mt-16">
            <h3 className="text-sm font-semibold uppercase tracking-widest text-gray-500 mb-4">
              More from Creator Cloud
            </h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {moreFromSite.map((p) => (
                <Link
                  key={p.slug}
                  to={`/blog/${p.slug}`}
                  className="group rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-colors p-4"
                >
                  <span className="text-[10px] font-semibold tracking-[0.18em] uppercase text-red-400/80 mb-2 block">
                    {p.category}
                  </span>
                  <h4 className="font-semibold text-sm leading-snug text-gray-100 group-hover:text-white">
                    {p.title}
                  </h4>
                </Link>
              ))}
            </div>
          </section>
        )}

        {visible.length === 0 && (
          <p className="text-center text-gray-500 py-16">
            No articles match that filter yet. Try the homepage.
          </p>
        )}
      </div>
    </>
  );
}
