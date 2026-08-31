import { Helmet } from "react-helmet-async";

export default function EditorialPolicyPage() {
  return (
    <>
      <Helmet>
        <title>Editorial Policy — Creator Cloud</title>
        <meta
          name="description"
          content="How Creator Cloud researches, tests, reviews, updates, and corrects creator economy articles."
        />
        <link rel="canonical" href="https://cloud-publish-pro.lovable.app/editorial-policy" />
      </Helmet>
      <article className="max-w-3xl mx-auto px-6 py-16 text-gray-300 leading-relaxed">
        <h1 className="text-4xl font-bold mb-6 text-white">Editorial Policy</h1>
        <p>
          Creator Cloud publishes original reporting, hands-on reviews, and practical explainers for people
          building creator businesses. Each article should answer the reader's main question on the page,
          without requiring an ad click, purchase, or off-site visit.
        </p>

        <h2 className="text-2xl font-bold mt-10 mb-3 text-white">How we create articles</h2>
        <p>
          Every article starts with a specific creator problem: revenue forecasting, platform eligibility,
          tool choice, workflow bottlenecks, pricing, or audience growth. We do not publish empty trend
          summaries, rewritten press releases, scraped lists, or pages whose main purpose is sending people to
          another destination.
        </p>

        <h2 className="text-2xl font-bold mt-10 mb-3 text-white">Testing and sourcing standards</h2>
        <p>
          Tool reviews are based on direct use where possible: installing the product, checking pricing and
          limitations, and comparing workflow trade-offs. Revenue and monetization articles state assumptions,
          show calculations, and separate observed creator ranges from guaranteed outcomes.
        </p>
        <p>
          When a platform rule, eligibility threshold, or monetization policy matters, we check current public
          platform documentation and update the article when the rule changes.
        </p>

        <h2 className="text-2xl font-bold mt-10 mb-3 text-white">Advertising and affiliate independence</h2>
        <p>
          Ads and affiliate relationships do not decide what we cover or what we recommend. We do not sell
          paid backlinks, publish unlabeled sponsored posts, or let advertisers preview editorial coverage.
          Commercial relationships are disclosed on the page or in our disclosure policy.
        </p>

        <h2 className="text-2xl font-bold mt-10 mb-3 text-white">Updates and corrections</h2>
        <p>
          Articles show a published date and a review date. If we materially change pricing, platform rules,
          or recommendations, we update the article rather than leaving stale information in place. Correction
          requests can be sent through the contact page and are reviewed by the editorial desk.
        </p>

        <h2 className="text-2xl font-bold mt-10 mb-3 text-white">What we do not publish</h2>
        <p>
          We do not publish copied articles, AI-spun pages, doorway pages, misleading download claims,
          auto-generated galleries, or thin pages built mainly to carry ads. Bridge and utility routes are
          blocked from indexing and do not load Google ad code.
        </p>
      </article>
    </>
  );
}