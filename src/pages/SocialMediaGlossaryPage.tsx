import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { ArrowRight, BookOpen, Lock, MousePointerClick, ShieldCheck, TrendingUp } from "lucide-react";
import { posts } from "@/content/posts";

const terms = [
  {
    term: "Smart link",
    definition: "A single URL that routes visitors to a resource after they complete a required action, such as subscribing, following, or opening a creator page.",
    related: "unlock links",
  },
  {
    term: "Social unlock",
    definition: "A gated flow where access is held until the visitor finishes one or more creator-growth actions. The best versions make every step clear and avoid misleading clicks.",
    related: "audience growth",
  },
  {
    term: "RPM",
    definition: "Revenue per thousand pageviews or video views. RPM is useful for comparing monetization, but it changes heavily by country, niche, ad demand, and user intent.",
    related: "creator revenue",
  },
  {
    term: "CTR",
    definition: "Click-through rate. For creators, CTR can describe thumbnail performance, link-card engagement, email clicks, or resource unlock activity.",
    related: "analytics",
  },
  {
    term: "Lead magnet",
    definition: "A useful free asset — template, checklist, script, calculator, preset, or guide — that gives visitors a real reason to join a list or complete an action.",
    related: "email growth",
  },
  {
    term: "Bridge page",
    definition: "A low-value page that exists mainly to send visitors somewhere else. Creator Cloud avoids empty bridge pages by pairing unlock flows with useful editorial content.",
    related: "policy quality",
  },
  {
    term: "Viewability",
    definition: "An ad or content block is viewable when a visitor actually has it on screen long enough to be counted by measurement systems.",
    related: "ads",
  },
  {
    term: "Creator funnel",
    definition: "The path from discovery to action: short-form post, landing page, smart link, email capture, resource delivery, and follow-up offer.",
    related: "growth strategy",
  },
  {
    term: "Owned audience",
    definition: "Subscribers, customers, or community members a creator can reach without depending entirely on a platform algorithm.",
    related: "newsletter",
  },
];

export default function SocialMediaGlossaryPage() {
  const guides = posts
    .filter((post) => ["Growth", "Analytics", "Monetization", "Newsletter"].includes(post.category))
    .slice(0, 6);

  return (
    <>
      <Helmet>
        <title>Social Media Glossary for Creators — Creator Cloud</title>
        <meta
          name="description"
          content="Plain-English definitions of smart links, RPM, CTR, social unlocks, bridge pages, and creator monetization terms."
        />
        <link rel="canonical" href="https://cloud-publish-pro.lovable.app/social-media-glossary" />
        <meta property="og:title" content="Social Media Glossary for Creators" />
        <meta property="og:description" content="Creator monetization and social-growth terms explained in plain English." />
      </Helmet>

      <section className="border-b border-border bg-background">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 md:py-20">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-primary">Creator glossary</p>
          <h1 className="max-w-3xl text-4xl font-bold leading-tight text-foreground md:text-6xl">
            Social media and monetization terms, explained clearly.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg">
            A practical reference for creators building smart links, resource pages, email funnels, YouTube channels, and ad-supported websites.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            [BookOpen, "Plain English", "No jargon walls — each definition explains why the term matters for creators."],
            [MousePointerClick, "Action-focused", "Terms connect back to real workflows like smart links, videos, newsletters, and resource pages."],
            [ShieldCheck, "Quality-aware", "Definitions call out low-value shortcuts that can hurt user trust or ad approval."],
          ].map(([Icon, title, text]) => {
            const TypedIcon = Icon as typeof BookOpen;
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
          <div className="mb-6 flex items-center justify-between gap-4">
            <h2 className="text-2xl font-bold text-foreground md:text-3xl">Glossary</h2>
            <Lock className="h-6 w-6 text-primary" />
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {terms.map((item) => (
              <article key={item.term} className="rounded-xl border border-border bg-background p-5">
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">{item.related}</p>
                <h3 className="mb-2 text-xl font-bold text-foreground">{item.term}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{item.definition}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="mb-5 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">Related creator guides</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {guides.map((post) => (
            <Link key={post.slug} to={`/blog/${post.slug}`} className="group rounded-xl border border-border bg-card p-5 transition-colors hover:bg-accent">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">{post.category}</p>
              <h3 className="mb-2 text-base font-bold leading-snug text-foreground">{post.title}</h3>
              <p className="line-clamp-2 text-sm text-muted-foreground">{post.excerpt}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-primary transition-all group-hover:gap-2">
                Read guide <ArrowRight className="h-3 w-3" />
              </span>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}