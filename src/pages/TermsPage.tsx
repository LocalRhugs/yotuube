import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowLeft, ShieldCheck } from "lucide-react";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#0f0f0f] text-gray-200 p-6 md:p-12">
      <Helmet>
        <title>Terms of Service — Creator Cloud</title>
        <meta name="description" content="Terms of service, acceptable use, and DMCA procedures for Creator Cloud." />
        <link rel="canonical" href="https://cloud-publish-pro.lovable.app/terms" />
      </Helmet>
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white">
            <ArrowLeft className="w-4 h-4" /> Back
          </Link>
          <div className="flex items-center gap-2 text-emerald-400">
            <ShieldCheck className="w-5 h-5" />
            <span className="text-sm font-semibold uppercase tracking-wider">Safe content</span>
          </div>
        </div>

        <header className="space-y-2">
          <h1 className="text-3xl md:text-4xl font-bold text-white">Terms, Acceptable Use & DMCA</h1>
          <p className="text-sm text-gray-500">Last updated: June 2026</p>
        </header>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-white">1. What this service is</h2>
          <p className="text-sm leading-relaxed">
            This site is a creator publishing / scheduling dashboard and a content-unlock proxy that helps
            creators ask viewers to subscribe, follow, like, or comment on their public YouTube,
            Facebook, or Instagram posts before revealing a creator-supplied destination link.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-white">2. Prohibited content</h2>
          <p className="text-sm leading-relaxed">
            We do <strong className="text-white">not</strong> host, distribute, monetize, or knowingly link
            to:
          </p>
          <ul className="list-disc list-inside text-sm space-y-1 text-gray-400">
            <li>Adult, pornographic, sexually-explicit or nudity-based material</li>
            <li>CSAM or any content endangering minors</li>
            <li>Malware, phishing, scams, or fraud destinations</li>
            <li>Hate speech, harassment, or incitement to violence</li>
            <li>Illegal drugs, weapons sales, or other unlawful content</li>
            <li>Content that violates the YouTube, Meta, or TikTok community guidelines</li>
          </ul>
          <p className="text-sm leading-relaxed">
            Any destination URL the user supplies must comply with these rules. Reports lead to
            immediate removal and account termination.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-white">3. Advertising disclosure</h2>
          <p className="text-sm leading-relaxed">
            Unlock pages may display ads served by third-party networks (e.g. Monetag). Those networks
            run their own creative moderation. We do not control individual ad creatives but we
            actively block categories that violate Section 2 where the network permits.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-white">4. DMCA / copyright</h2>
          <p className="text-sm leading-relaxed">
            To request takedown of content that infringes your copyright, email{" "}
            <a className="underline text-white" href="mailto:dmca@cloud-publish-pro.app">
              dmca@cloud-publish-pro.app
            </a>{" "}
            with: (a) the URL of the unlock page, (b) the original work, (c) your contact info, and
            (d) a good-faith statement under penalty of perjury that you are authorized to act for the
            copyright owner. Valid notices are processed within 48 hours.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-white">5. Abuse reports</h2>
          <p className="text-sm leading-relaxed">
            Spot a link that violates Section 2? Email{" "}
            <a className="underline text-white" href="mailto:abuse@cloud-publish-pro.app">
              abuse@cloud-publish-pro.app
            </a>{" "}
            with the full unlock URL. We action verified reports within 24 hours.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-white">6. Age requirement</h2>
          <p className="text-sm leading-relaxed">
            You must be at least 18 years old, or the age of majority in your jurisdiction, to use
            this service.
          </p>
        </section>

        <p className="text-xs text-gray-600 pt-8">
          This page exists so platforms (YouTube, Meta) and ad networks have a permanent on-site
          policy reference. If you've been directed here by a strike or abuse report, please email us.
        </p>
      </div>
    </div>
  );
}
