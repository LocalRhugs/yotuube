import { Helmet } from "react-helmet-async";

export default function DMCAPage() {
  return (
    <>
      <Helmet>
        <title>DMCA / Copyright Policy — Creator Cloud</title>
        <meta name="description" content="Copyright takedown notices and DMCA procedures for Creator Cloud." />
        <link rel="canonical" href="https://cloud-publish-pro.lovable.app/dmca" />
      </Helmet>
      <article className="max-w-3xl mx-auto px-6 py-16 text-gray-300 leading-relaxed">
        <h1 className="text-4xl font-bold mb-6 text-white">DMCA & Copyright Policy</h1>
        <p>
          Creator Cloud respects the intellectual property rights of others. We respond promptly to clear
          and complete notices of alleged copyright infringement that comply with the Digital Millennium
          Copyright Act (DMCA).
        </p>

        <h2 className="text-2xl font-bold mt-10 mb-3 text-white">Acceptable use of our content</h2>
        <p>
          Editorial content on Creator Cloud is published with all rights reserved. You may quote up to 150
          words with attribution and a link back to the original article. Wholesale republication, AI
          training without permission, and uncredited rewriting are not permitted.
        </p>

        <h2 className="text-2xl font-bold mt-10 mb-3 text-white">Prohibited content on this site</h2>
        <p>
          Creator Cloud does not host, link to, or promote sexually explicit material, pirated software,
          stolen accounts, scraped content, or any material that would violate the policies of our advertising
          partners. We do not run pop-unders or interstitials on editorial pages.
        </p>
        <p>
          If you believe content on this site violates these standards, please contact us so we can review
          and act on it within 72 hours.
        </p>

        <h2 className="text-2xl font-bold mt-10 mb-3 text-white">Filing a takedown notice</h2>
        <p>To file a DMCA takedown notice, send a written notice through our contact page including:</p>
        <ol className="list-decimal pl-6 space-y-1 my-4">
          <li>Your physical or electronic signature.</li>
          <li>Identification of the copyrighted work claimed to be infringed.</li>
          <li>The URL of the allegedly infringing material on our site.</li>
          <li>Your full name, address, and contact information.</li>
          <li>A statement that you have a good-faith belief that the use is not authorized.</li>
          <li>A statement, under penalty of perjury, that the information in the notice is accurate.</li>
        </ol>

        <h2 className="text-2xl font-bold mt-10 mb-3 text-white">Counter-notices</h2>
        <p>
          If you believe content was removed in error, you may file a counter-notice including identification
          of the material, your contact information, and a statement under penalty of perjury that the
          removal was a mistake.
        </p>
      </article>
    </>
  );
}
