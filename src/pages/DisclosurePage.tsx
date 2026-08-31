import { Helmet } from "react-helmet-async";

export default function DisclosurePage() {
  return (
    <>
      <Helmet>
        <title>Advertising & Affiliate Disclosure — Creator Cloud</title>
        <meta name="description" content="How Creator Cloud is funded, our advertising standards, and our affiliate-link disclosure." />
        <link rel="canonical" href="https://cloud-publish-pro.lovable.app/disclosure" />
      </Helmet>
      <article className="max-w-3xl mx-auto px-6 py-16 text-gray-300 leading-relaxed">
        <h1 className="text-4xl font-bold mb-6 text-white">Advertising & Affiliate Disclosure</h1>
        <p>
          Creator Cloud is supported by advertising and by affiliate commissions on a small number of
          products we recommend. This page explains how that works and where the money comes from.
        </p>

        <h2 className="text-2xl font-bold mt-10 mb-3 text-white">Display advertising</h2>
        <p>
          We display ads served by Google AdSense. Ads are clearly labeled as such and are visually
          separated from editorial content. We do not run pop-unders, auto-playing video ads, or interstitial
          ads on editorial pages.
        </p>

        <h2 className="text-2xl font-bold mt-10 mb-3 text-white">Affiliate links</h2>
        <p>
          When we recommend a product in an article, we may use an affiliate link. If you click the link and
          make a purchase, we may receive a small commission at no additional cost to you. We use affiliate
          links only for products we would recommend regardless of the affiliate relationship.
        </p>

        <h2 className="text-2xl font-bold mt-10 mb-3 text-white">Sponsored content</h2>
        <p>
          We do not currently accept sponsored articles, paid guest posts, or paid backlinks. If we ever do,
          such content will be clearly labeled "Sponsored" at the top of the page and excluded from
          editorial coverage.
        </p>

        <h2 className="text-2xl font-bold mt-10 mb-3 text-white">Editorial independence</h2>
        <p>
          Advertising and affiliate relationships have no influence on what we cover or how we cover it.
          Our writers do not see advertiser lists, and advertisers receive no preview or veto of articles.
        </p>
      </article>
    </>
  );
}
