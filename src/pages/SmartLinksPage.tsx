import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowRight, CheckCircle2, Lock, MousePointerClick, ShieldCheck, Youtube } from "lucide-react";
import { posts } from "@/content/posts";

const examples = [
  {
    title: "Free Script Pack",
    actions: ["Subscribe to channel", "Like the video", "Comment when done"],
    progress: "0/3 done",
  },
  {
    title: "Creator Template Vault",
    actions: ["Watch the intro", "Follow the creator", "Open the resource"],
    progress: "0/3 done",
  },
  {
    title: "YouTube Growth Checklist",
    actions: ["Subscribe", "Like", "Unlock file"],
    progress: "0/2 done",
  },
];

export default function SmartLinksPage() {
  const featuredPosts = posts
    .filter((post) => ["Monetization", "YouTube", "Tools"].includes(post.category))
    .slice(0, 6);

  return (
    <>
      <Helmet>
        <title>Smart Links for Creators — Creator Cloud</title>
        <meta
          name="description"
          content="Create creator smart links that unlock files, scripts, and resources after real social actions, backed by editorial guides and transparent policies."
        />
        <link rel="canonical" href="https://cloud-publish-pro.lovable.app/smart-links" />
        <meta property="og:title" content="Smart Links for Creators — Creator Cloud" />
        <meta property="og:description" content="A creator-focused unlock link hub with action steps, progress tracking, and useful creator education." />
      </Helmet>

      <section className="border-b border-border bg-background">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 sm:px-6 md:grid-cols-2 md:py-20">
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-primary">Creator unlock links</p>
            <h1 className="text-4xl font-bold leading-tight text-foreground md:text-6xl">
              Turn downloads into real audience actions.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg">
              Creator Cloud combines useful creator education with smart-link unlock pages, so visitors can read, learn, complete actions, and reach the promised resource without a thin bridge page.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/signup"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
              >
                Create a smart link <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/blog/google-adsense-approval-checklist-2026"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-5 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-accent"
              >
                Read approval guide
              </Link>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-sm">
            <div className="rotate-2 rounded-2xl border border-border bg-card p-4 shadow-card">
              <div className="mb-4 text-center">
                <h2 className="text-xl font-bold text-foreground">Free Script Pack</h2>
                <p className="text-sm text-muted-foreground">Complete the actions to unlock</p>
              </div>
              <div className="space-y-3">
                {examples[0].actions.map((action, index) => (
                  <div key={action} className={`unlock-action-row ${index === 0 ? "unlock-action-youtube" : "unlock-action-neutral"}`}>
                    {index === 0 ? <Youtube className="h-4 w-4" /> : <MousePointerClick className="h-4 w-4" />}
                    <span>{action}</span>
                  </div>
                ))}
              </div>
              <div className="mt-5">
                <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                  <span>Unlock progress</span>
                  <span className="font-semibold text-primary">0/3 done</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div className="h-full w-0 rounded-full bg-primary" />
                </div>
                <button className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-muted text-sm font-semibold text-muted-foreground" disabled>
                  <Lock className="h-4 w-4" /> Unlock file
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            ["Useful pages first", "Smart links sit beside long creator guides instead of empty redirect screens."],
            ["Clear action progress", "Visitors always know what is required before the unlock button activates."],
            ["Policy-aware layout", "Ads and crawler settings stay separated from low-value utility pages."],
          ].map(([title, text]) => (
            <article key={title} className="rounded-xl border border-border bg-card p-5">
              <CheckCircle2 className="mb-3 h-5 w-5 text-primary" />
              <h2 className="mb-2 text-lg font-bold text-foreground">{title}</h2>
              <p className="text-sm leading-relaxed text-muted-foreground">{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-border bg-card/40">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary">Live-style examples</p>
              <h2 className="text-2xl font-bold text-foreground md:text-3xl">Unlock pages should feel like a tool, not a dead bridge.</h2>
            </div>
            <ShieldCheck className="hidden h-8 w-8 text-primary sm:block" />
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {examples.map((example) => (
              <article key={example.title} className="rounded-xl border border-border bg-background p-4">
                <h3 className="mb-1 text-lg font-bold text-foreground">{example.title}</h3>
                <p className="mb-4 text-sm text-muted-foreground">Complete the actions to unlock</p>
                <div className="space-y-2">
                  {example.actions.map((action) => (
                    <div key={action} className="unlock-action-row unlock-action-neutral text-xs">
                      <MousePointerClick className="h-3.5 w-3.5" />
                      <span>{action}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                  <span>Unlock progress</span>
                  <span className="font-semibold text-primary">{example.progress}</span>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <h2 className="mb-5 text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">Creator monetization guides</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {featuredPosts.map((post) => (
            <Link key={post.slug} to={`/blog/${post.slug}`} className="rounded-xl border border-border bg-card p-5 transition-colors hover:bg-accent">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">{post.category}</p>
              <h3 className="mb-2 text-base font-bold leading-snug text-foreground">{post.title}</h3>
              <p className="line-clamp-2 text-sm text-muted-foreground">{post.excerpt}</p>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}