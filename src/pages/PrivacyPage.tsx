import { Helmet } from "react-helmet-async";

export default function PrivacyPage() {
  return (
    <>
      <Helmet>
        <title>Privacy Policy — Creator Cloud</title>
        <meta name="description" content="How Creator Cloud collects, uses, and protects your data. Covers cookies, analytics, and Google AdSense." />
        <link rel="canonical" href="https://cloud-publish-pro.lovable.app/privacy" />
      </Helmet>
      <article className="max-w-3xl mx-auto px-6 py-16 text-gray-300 leading-relaxed">
        <h1 className="text-4xl font-bold mb-3 text-white">Privacy Policy</h1>
        <p className="text-sm text-gray-500 mb-8">Last updated: June 7, 2026</p>

        <h2 className="text-2xl font-bold mt-10 mb-3 text-white">1. What this policy covers</h2>
        <p>
          This Privacy Policy describes how Creator Cloud ("we", "us") collects, uses, and shares information
          when you visit cloud-publish-pro.lovable.app and any subdomain.
        </p>

        <h2 className="text-2xl font-bold mt-10 mb-3 text-white">2. Information we collect</h2>
        <p>
          We collect minimal information automatically when you visit the site: your IP address, browser
          type, pages viewed, and referring URL. We do not require accounts to read articles.
        </p>

        <h2 className="text-2xl font-bold mt-10 mb-3 text-white">3. Cookies and similar technologies</h2>
        <p>
          We use cookies to (a) remember your cookie-consent choices, (b) measure aggregate site traffic, and
          (c) serve advertising through Google AdSense. You can decline non-essential cookies at any time via
          the consent banner.
        </p>

        <h2 className="text-2xl font-bold mt-10 mb-3 text-white">4. Google AdSense</h2>
        <p>
          Third-party vendors, including Google, use cookies to serve ads based on a user's prior visits to
          this website and other websites. Google's use of advertising cookies enables it and its partners to
          serve ads to our users based on their visit to our sites and/or other sites on the Internet.
        </p>
        <p>
          Users may opt out of personalized advertising by visiting{" "}
          <a className="text-red-400 hover:underline" href="https://www.google.com/settings/ads" target="_blank" rel="noreferrer">
            Google Ads Settings
          </a>. Alternatively, users may opt out of a third-party vendor's use of cookies for personalized
          advertising by visiting{" "}
          <a className="text-red-400 hover:underline" href="https://www.aboutads.info/" target="_blank" rel="noreferrer">
            aboutads.info
          </a>.
        </p>

        <h2 className="text-2xl font-bold mt-10 mb-3 text-white">5. Analytics</h2>
        <p>
          We may use server-side analytics to count page views in aggregate. We do not sell, rent, or share
          identifiable visitor data with third parties for marketing purposes.
        </p>

        <h2 className="text-2xl font-bold mt-10 mb-3 text-white">6. GDPR and CCPA rights</h2>
        <p>
          If you are in the European Economic Area, the United Kingdom, or California, you have the right to
          (a) access the personal data we hold about you, (b) request correction or deletion, and (c) object
          to processing for direct marketing. To exercise any of these rights, see our contact page.
        </p>

        <h2 className="text-2xl font-bold mt-10 mb-3 text-white">7. Data retention</h2>
        <p>
          Aggregated traffic data is retained for up to 26 months. Cookie consent state is stored locally on
          your device and is cleared when you clear your browser's site data.
        </p>

        <h2 className="text-2xl font-bold mt-10 mb-3 text-white">8. Children</h2>
        <p>
          Creator Cloud is not directed at children under 13. We do not knowingly collect personal information
          from children under 13.
        </p>

        <h2 className="text-2xl font-bold mt-10 mb-3 text-white">9. Changes</h2>
        <p>
          We may update this Privacy Policy from time to time. The "last updated" date at the top of this
          page indicates when the policy was most recently revised.
        </p>

        <h2 className="text-2xl font-bold mt-10 mb-3 text-white">10. Contact</h2>
        <p>
          Questions about this policy can be sent through our <a className="text-red-400 hover:underline" href="/contact">contact page</a>.
        </p>
      </article>
    </>
  );
}
