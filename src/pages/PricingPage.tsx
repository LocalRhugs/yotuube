import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2 } from "lucide-react";

export default function PricingPage() {
  return (
    <>
      <Helmet>
        <title>Pricing — Creator Cloud Smart Links</title>
        <meta name="description" content="Creator Cloud smart-link tools are currently free while the platform grows, with transparent creator-focused features." />
        <link rel="canonical" href="https://cloud-publish-pro.lovable.app/pricing" />
        <meta property="og:title" content="Pricing — Creator Cloud Smart Links" />
        <meta property="og:description" content="Transparent pricing for Creator Cloud smart-link tools." />
      </Helmet>

      <section className="border-b border-border bg-background">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 md:py-20">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-primary">Pricing</p>
          <h1 className="max-w-3xl text-4xl font-bold leading-tight text-foreground md:text-6xl">
            Start creating smart links for free.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg">
            Creator Cloud is currently focused on helping creators test smart-link funnels, resource pages, and audience actions before paid plans are introduced.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        <article className="rounded-2xl border border-border bg-card p-6 shadow-card md:p-8">
          <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Creator Starter</h2>
              <p className="text-sm text-muted-foreground">For creators sharing scripts, checklists, videos, and resources.</p>
            </div>
            <div className="text-left sm:text-right">
              <p className="text-4xl font-bold text-foreground">$0</p>
              <p className="text-sm text-muted-foreground">during launch</p>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {[
              "Create YouTube smart links",
              "Use progress-based unlock pages",
              "Shorten links for sharing",
              "Host links on Creator Cloud pages",
              "Access creator monetization guides",
              "Use legal, privacy, and editorial support pages",
            ].map((feature) => (
              <div key={feature} className="flex gap-3 text-sm text-muted-foreground">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>{feature}</span>
              </div>
            ))}
          </div>
          <Link to="/signup" className="mt-7 inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90">
            Create smart link <ArrowRight className="h-4 w-4" />
          </Link>
        </article>
      </section>
    </>
  );
}