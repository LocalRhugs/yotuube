import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2, Link2, Lock, MousePointerClick, Share2 } from "lucide-react";

const steps = [
  {
    title: "Build the unlock page",
    text: "Paste the resource destination, add a title, and choose the actions visitors should complete before the final link opens.",
    icon: Link2,
  },
  {
    title: "Share one short URL",
    text: "Use the smart link in YouTube descriptions, TikTok bios, Discord communities, Telegram channels, newsletters, or pinned comments.",
    icon: Share2,
  },
  {
    title: "Visitors complete steps",
    text: "The page shows each action and a progress bar so visitors understand what is required before unlocking the file or resource.",
    icon: MousePointerClick,
  },
  {
    title: "Unlock the destination",
    text: "Once the required actions are finished, the unlock button opens the promised script, checklist, download, video, or creator page.",
    icon: Lock,
  },
];

export default function HowItWorksPage() {
  return (
    <>
      <Helmet>
        <title>How Creator Cloud Smart Links Work</title>
        <meta name="description" content="Learn how Creator Cloud smart links let creators share resources after visitors complete audience-growth actions." />
        <link rel="canonical" href="https://cloud-publish-pro.lovable.app/how-it-works" />
        <meta property="og:title" content="How Creator Cloud Smart Links Work" />
        <meta property="og:description" content="A clear breakdown of the Creator Cloud smart-link unlock flow." />
      </Helmet>

      <section className="border-b border-border bg-background">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 md:py-20">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-primary">How it works</p>
          <h1 className="max-w-3xl text-4xl font-bold leading-tight text-foreground md:text-6xl">
            Smart links that explain the task before the unlock.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg">
            Creator Cloud is built for creators who need a simple way to share resources while growing a real audience — without hiding the destination behind confusing redirects.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-4 md:grid-cols-2">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <article key={step.title} className="rounded-xl border border-border bg-card p-6">
                <div className="mb-4 flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">{index + 1}</span>
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <h2 className="mb-2 text-xl font-bold text-foreground">{step.title}</h2>
                <p className="text-sm leading-relaxed text-muted-foreground">{step.text}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="border-y border-border bg-card/40">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <h2 className="mb-6 text-2xl font-bold text-foreground md:text-3xl">Built to avoid low-value signals</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {[
              "Public pages explain the actual tool and use case.",
              "Editorial articles and glossary pages support the product.",
              "Unlock pages include context and progress instead of only a button.",
              "Ads are separated from utility and bridge pages during review.",
            ].map((item) => (
              <div key={item} className="flex gap-3 rounded-xl border border-border bg-background p-4 text-sm text-muted-foreground">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12 text-center sm:px-6">
        <h2 className="text-2xl font-bold text-foreground">Ready to create a smart link?</h2>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
          Use the dashboard to generate a link, then shorten it and share it anywhere your audience already clicks.
        </p>
        <Link to="/signup" className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90">
          Open creator tools <ArrowRight className="h-4 w-4" />
        </Link>
      </section>
    </>
  );
}