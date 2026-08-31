import { Helmet } from "react-helmet-async";
import { AUTHORS } from "@/content/authors";

export default function AboutPage() {
  return (
    <>
      <Helmet>
        <title>About — Creator Cloud</title>
        <meta name="description" content="Creator Cloud is independent editorial coverage of the creator economy. Meet the team and editorial standards." />
        <link rel="canonical" href="https://cloud-publish-pro.lovable.app/about" />
      </Helmet>
      <article className="max-w-3xl mx-auto px-6 py-16 prose-content text-gray-300 leading-relaxed">
        <h1 className="text-4xl font-bold mb-6 text-white">About Creator Cloud</h1>
        <p>
          Creator Cloud is an independent publication covering the business and craft of being a modern
          creator. We write for YouTubers, TikTokers, podcasters, newsletter operators, and the indie tech
          founders who build the tools they use.
        </p>
        <p>
          We started this site because most "creator news" coverage is either reposted press releases or
          uncritical hype cycles. Neither helps a working creator make better decisions about which platform
          to invest in, which software to pay for, or how to structure their next monetization push.
        </p>
        <h2 className="text-2xl font-bold mt-10 mb-3 text-white">Editorial standards</h2>
        <p>
          Every tool review on Creator Cloud is based on hands-on testing. When we benchmark video editors,
          we install them on real machines and run real timelines through them. When we publish revenue
          benchmarks, the underlying numbers come from creator surveys we conduct ourselves or from primary
          sources we cite explicitly.
        </p>
        <p>
          We use affiliate links in some articles where a product we genuinely recommend has an affiliate
          program. When we do, we disclose it. Affiliate relationships never determine which products we
          cover or how we cover them.
        </p>
        <p>
          Our full research, update, advertising, and corrections process is published in our <a className="text-red-400 hover:underline" href="/editorial-policy">editorial policy</a>.
        </p>
        <h2 className="text-2xl font-bold mt-10 mb-3 text-white">The team</h2>
        <p>
          Creator Cloud is published by a small distributed team across the U.S., the U.K., and Portugal.
          Our writers come from working backgrounds in video production, software engineering, and
          newsroom journalism. Bylines link to author pages on most articles.
        </p>
        <div className="mt-6 space-y-5">
          {AUTHORS.map((author) => (
            <section key={author.id} id={author.id} className="rounded-lg border border-white/5 bg-white/[0.02] p-5">
              <h3 className="text-xl font-bold text-white mb-1">{author.name}</h3>
              <p className="text-sm text-red-400 mb-3">{author.role}</p>
              <p className="mb-3">{author.bio}</p>
              <p className="text-sm text-gray-500">
                Beats: {author.beats.join(", ")}. {author.standardsNote}
              </p>
            </section>
          ))}
        </div>
        <h2 className="text-2xl font-bold mt-10 mb-3 text-white">Get in touch</h2>
        <p>
          For story tips, corrections, or partnership inquiries, see our <a className="text-red-400 hover:underline" href="/contact">contact page</a>.
        </p>
      </article>
    </>
  );
}
