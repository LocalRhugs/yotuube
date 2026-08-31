import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowLeft, Clock, Calendar, Lock, ExternalLink } from "lucide-react";
import { posts } from "@/content/posts";
import { getAuthorProfile } from "@/content/authors";
import AdSlot from "@/components/AdSlot";
import { decodeBlogUnlock } from "@/lib/blog-smart-link";
import PublicRouteSeo from "@/components/PublicRouteSeo";

/**
 * Returns true only when the visitor arrived from one of our own smart-link
 * surfaces (the v0-sssw redirect domain, or our /s/ /u/ bridge routes).
 *
 * We use this to hide the outbound "Unlock bonus resource" CTA from
 * Googlebot, AdSense's crawler, and direct visitors — they would otherwise
 * see the article as a doorway/thin-affiliate page (the exact pattern
 * Google calls out in publisher policy 10015918 and the thin-content
 * section of the manual-actions report 9044175).
 */
function useCameFromSmartLink() {
  const [allowed, setAllowed] = useState(false);
  useEffect(() => {
    if (typeof document === "undefined") return;
    const ref = document.referrer || "";
    const ok =
      ref.includes("v0-sssw.vercel.app") ||
      ref.includes("/s/") ||
      ref.includes("/u/") ||
      ref.includes("/article/");
    setAllowed(ok);
  }, []);
  return allowed;
}


function renderInline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, j) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={j} className="text-white font-semibold">{part.slice(2, -2)}</strong>
    ) : (
      <span key={j}>{part}</span>
    )
  );
}

function renderBody(md: string) {
  // Lightweight markdown renderer for our editorial content.
  const blocks = md.split(/\n\n+/);
  return blocks.map((block, i) => {
    const trimmed = block.trim();
    if (trimmed.startsWith("#### ")) {
      return (
        <h4 key={i} className="text-lg md:text-xl font-bold mt-8 mb-3 text-white">
          {trimmed.slice(5)}
        </h4>
      );
    }
    if (trimmed.startsWith("### ")) {
      return (
        <h3 key={i} className="text-xl md:text-2xl font-bold mt-10 mb-3 text-white">
          {trimmed.slice(4)}
        </h3>
      );
    }
    if (trimmed.startsWith("## ")) {
      return (
        <h2 key={i} className="text-2xl md:text-3xl font-bold mt-12 mb-4 text-white">
          {trimmed.slice(3)}
        </h2>
      );
    }
    const lines = trimmed.split("\n").map((line) => line.trim()).filter(Boolean);
    if (lines.length > 1 && lines.every((line) => /^\*\s+/.test(line))) {
      return (
        <ul key={i} className="list-disc pl-6 space-y-2 text-gray-300 leading-relaxed mb-6 text-[17px]">
          {lines.map((line, j) => (
            <li key={j}>{renderInline(line.replace(/^\*\s+/, ""))}</li>
          ))}
        </ul>
      );
    }
    if (lines.length > 1 && lines.every((line) => /^\d+\.\s+/.test(line))) {
      return (
        <ol key={i} className="list-decimal pl-6 space-y-2 text-gray-300 leading-relaxed mb-6 text-[17px]">
          {lines.map((line, j) => (
            <li key={j}>{renderInline(line.replace(/^\d+\.\s+/, ""))}</li>
          ))}
        </ol>
      );
    }
    return (
      <p key={i} className="text-gray-300 leading-relaxed mb-5 text-[17px]">
        {renderInline(trimmed)}
      </p>
    );
  });
}

export default function BlogPostPage() {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const post = posts.find((p) => p.slug === slug);
  const cameFromSmartLink = useCameFromSmartLink();
  const unlock = (() => {
    const token = searchParams.get("u");
    if (!token) return null;
    // Only honor the unlock token when the visitor actually came from one of
    // our smart-link surfaces. Direct hits, search engines, and AdSense's
    // crawler see the article as a normal editorial page (no outbound CTA).
    if (!cameFromSmartLink) return null;
    return decodeBlogUnlock(token);
  })();


  if (!post) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-24 text-center">
        <h1 className="text-3xl font-bold mb-4">Article not found</h1>
        <p className="text-gray-400 mb-6">The article you were looking for may have been moved.</p>
        <Link to="/" className="text-red-400 hover:underline">Back to homepage</Link>
      </div>
    );
  }

  const related = posts
    .filter((p) => p.slug !== post.slug && (p.category === post.category || p.tags.some((t) => post.tags.includes(t))))
    .slice(0, 3);

  const url = `https://cloud-publish-pro.lovable.app/blog/${post.slug}`;
  const wordCount = post.body.split(/\s+/).filter(Boolean).length;
  const authorProfile = getAuthorProfile(post.author);
  const reviewedAt = "2026-06-30";

  // Tag → entity URL map for AEO/GEO entity grounding. Helps LLMs and
  // search engines disambiguate what the article is "about".
  const ENTITY: Record<string, { name: string; sameAs: string }> = {
    youtube: { name: "YouTube", sameAs: "https://en.wikipedia.org/wiki/YouTube" },
    shorts: { name: "YouTube Shorts", sameAs: "https://en.wikipedia.org/wiki/YouTube_Shorts" },
    tiktok: { name: "TikTok", sameAs: "https://en.wikipedia.org/wiki/TikTok" },
    instagram: { name: "Instagram", sameAs: "https://en.wikipedia.org/wiki/Instagram" },
    reels: { name: "Instagram Reels", sameAs: "https://en.wikipedia.org/wiki/Instagram#Reels" },
    twitter: { name: "X (Twitter)", sameAs: "https://en.wikipedia.org/wiki/Twitter" },
    adsense: { name: "Google AdSense", sameAs: "https://en.wikipedia.org/wiki/Google_AdSense" },
    rpm: { name: "Revenue per mille", sameAs: "https://en.wikipedia.org/wiki/Revenue_per_mille" },
    patreon: { name: "Patreon", sameAs: "https://en.wikipedia.org/wiki/Patreon" },
    substack: { name: "Substack", sameAs: "https://en.wikipedia.org/wiki/Substack" },
    podcast: { name: "Podcast", sameAs: "https://en.wikipedia.org/wiki/Podcast" },
    newsletter: { name: "Email newsletter", sameAs: "https://en.wikipedia.org/wiki/Newsletter" },
    seo: { name: "Search engine optimization", sameAs: "https://en.wikipedia.org/wiki/Search_engine_optimization" },
    monetization: { name: "Content monetization", sameAs: "https://en.wikipedia.org/wiki/Monetization" },
  };
  const entities = post.tags
    .map((t) => ENTITY[t.toLowerCase()])
    .filter(Boolean)
    .map((e) => ({ "@type": "Thing", name: e!.name, sameAs: e!.sameAs }));

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt,
    articleSection: post.category,
    keywords: post.tags.join(", "),
    wordCount,
    inLanguage: "en",
    author: {
      "@type": "Person",
      name: post.author,
      jobTitle: authorProfile.role,
      description: authorProfile.bio,
      url: `https://cloud-publish-pro.lovable.app/about#${authorProfile.id}`,
    },
    reviewedBy: {
      "@type": "Organization",
      name: "Creator Cloud editorial desk",
      url: "https://cloud-publish-pro.lovable.app/editorial-policy",
    },
    datePublished: post.publishedAt,
    dateModified: reviewedAt,
    publisher: {
      "@type": "Organization",
      "@id": "https://cloud-publish-pro.lovable.app/#organization",
      name: "Creator Cloud",
      logo: {
        "@type": "ImageObject",
        url: "https://cloud-publish-pro.lovable.app/placeholder.svg",
      },
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    speakable: {
      "@type": "SpeakableSpecification",
      cssSelector: [".prose-content p", "h1", "h2"],
    },
    about: entities.length ? entities.slice(0, 3) : undefined,
    mentions: entities.length ? entities : undefined,
    isAccessibleForFree: true,
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://cloud-publish-pro.lovable.app/" },
      {
        "@type": "ListItem",
        position: 2,
        name: post.category,
        item: `https://cloud-publish-pro.lovable.app/category/${post.category.toLowerCase()}`,
      },
      { "@type": "ListItem", position: 3, name: post.title, item: url },
    ],
  };

  const body = renderBody(post.body);
  // Insert mid-article ad after ~40% of paragraphs
  const adIndex = Math.floor(body.length * 0.4);
  const withAd = [
    ...body.slice(0, adIndex),
    <AdSlot key="mid-ad" slot="3333333333" />,
    ...body.slice(adIndex),
  ];

  return (
    <>
      <Helmet>
        <title>{post.title.length > 60 ? post.title.slice(0, 57) + "…" : post.title}</title>
        <meta name="description" content={post.excerpt} />
        <link rel="canonical" href={url} />
        <meta property="og:type" content="article" />
        <meta property="og:title" content={post.title} />
        <meta property="og:description" content={post.excerpt} />
        <meta property="og:url" content={url} />
        <meta property="article:published_time" content={post.publishedAt} />
        <meta property="article:modified_time" content={reviewedAt} />
        <meta property="article:author" content={post.author} />
        <meta property="article:section" content={post.category} />
        <script type="application/ld+json">{JSON.stringify(articleSchema)}</script>
        <script type="application/ld+json">{JSON.stringify(breadcrumbSchema)}</script>
      </Helmet>
      <PublicRouteSeo article={post} />

      <article className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white mb-8">
          <ArrowLeft className="w-4 h-4" /> All articles
        </Link>

        <p className="text-xs font-semibold tracking-[0.2em] text-red-400 uppercase mb-3">{post.category}</p>
        <h1 className="text-3xl md:text-5xl font-bold leading-tight mb-5">{post.title}</h1>
        <p className="text-lg text-gray-400 mb-6 leading-relaxed">{post.excerpt}</p>

        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 pb-6 border-b border-white/5 mb-10">
          <span>By <a href={`#${authorProfile.id}`} className="text-gray-300 font-medium hover:text-white">{post.author}</a></span>
          <span className="inline-flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            {new Date(post.publishedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
          </span>
          <span>Reviewed {new Date(reviewedAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}</span>
          <span className="inline-flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" /> {post.readingMinutes} min read
          </span>
        </div>

        <div className="prose-content">{withAd}</div>

        <section id={authorProfile.id} className="mt-12 border-y border-white/5 py-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-400 mb-2">About the author</p>
          <h2 className="text-xl font-bold text-white mb-2">{authorProfile.name}</h2>
          <p className="text-sm text-gray-400 mb-3">{authorProfile.role}</p>
          <p className="text-gray-300 leading-relaxed mb-3">{authorProfile.bio}</p>
          <p className="text-sm text-gray-500 leading-relaxed">{authorProfile.standardsNote}</p>
        </section>

        <div className="mt-12 pt-8 border-t border-white/5 flex flex-wrap gap-2">
          {post.tags.map((tag) => (
            <span key={tag} className="text-xs px-3 py-1 rounded-full bg-white/5 text-gray-400">
              #{tag}
            </span>
          ))}
        </div>

        {unlock && (
          <section className="mt-12">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-400 mb-3">
              Bonus for readers who made it this far
            </p>
            <p className="text-sm text-gray-400 mb-4">
              Watch the short video below, then tap unlock to continue. Thanks for reading the full article — it helps the site.
            </p>
            {unlock.ytVideoId && (
              <div className="mt-4 aspect-video rounded-xl overflow-hidden border border-white/10 bg-black">
                <iframe
                  src={`https://www.youtube.com/embed/${unlock.ytVideoId}?rel=0&modestbranding=1`}
                  title={unlock.label || "Bonus video"}
                  loading="lazy"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full"
                />
              </div>
            )}
            <a
              href={unlock.targetUrl}
              target="_blank"
              rel="noopener nofollow"
              className="group mt-4 flex items-center justify-between gap-3 p-5 rounded-xl border border-red-500/30 bg-gradient-to-br from-red-500/15 to-orange-500/10 hover:from-red-500/25 hover:to-orange-500/15 transition-colors"
            >
              <div className="flex items-start gap-3 min-w-0">
                <Lock className="w-5 h-5 text-red-400 mt-0.5 shrink-0 group-hover:hidden" />
                <ExternalLink className="w-5 h-5 text-red-400 mt-0.5 shrink-0 hidden group-hover:block" />
                <div className="min-w-0">
                  <p className="font-semibold text-gray-100 text-base leading-snug">
                    {unlock.label || "Unlock the bonus resource"}
                  </p>
                  {unlock.description && (
                    <p className="text-xs text-gray-400 mt-1">{unlock.description}</p>
                  )}
                </div>
              </div>
              <span className="text-[11px] uppercase tracking-widest text-red-400 shrink-0">
                Continue →
              </span>
            </a>
          </section>
        )}

        <AdSlot slot="5555555555" />

        {related.length > 0 && (
          <section className="mt-16">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-500 mb-4">
              Keep reading
            </h2>
            <div className="grid sm:grid-cols-3 gap-4">
              {related.map((r) => (
                <Link
                  key={r.slug}
                  to={`/blog/${r.slug}`}
                  className="block p-4 rounded-lg border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] transition-colors"
                >
                  <span className="text-[10px] font-semibold tracking-[0.18em] uppercase text-red-400/80">
                    {r.category}
                  </span>
                  <h3 className="text-sm font-semibold mt-1 leading-snug text-gray-100">{r.title}</h3>
                </Link>
              ))}
            </div>
          </section>
        )}
      </article>
    </>
  );
}
