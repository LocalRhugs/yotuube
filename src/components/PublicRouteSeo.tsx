import { Helmet } from "react-helmet-async";
import { useLocation } from "react-router-dom";

const SITE_URL = "https://cloud-publish-pro.lovable.app";
const SITE_NAME = "Creator Cloud";

const CATEGORY_NAMES: Record<string, string> = {
  youtube: "YouTube",
  tiktok: "TikTok",
  monetization: "Monetization",
  tools: "Tools",
  analytics: "Analytics",
  growth: "Growth",
  newsletter: "Newsletter",
};

const STATIC_META: Record<string, { title: string; description: string }> = {
  "/": {
    title: "Creator Cloud — Smart Links for Creators",
    description: "Create smart links for scripts, files, videos, and creator resources, with clear unlock steps, progress tracking, and practical growth guides.",
  },
  "/about": {
    title: "About Creator Cloud | Creator Cloud",
    description: "Meet the Creator Cloud editorial team and learn how we research, test, review, and update practical guidance for creators and indie founders.",
  },
  "/contact": {
    title: "Contact Creator Cloud | Creator Cloud",
    description: "Contact Creator Cloud with story tips, corrections, source notes, partnership questions, copyright notices, or feedback about our creator guides.",
  },
  "/privacy": {
    title: "Privacy Policy | Creator Cloud",
    description: "Read how Creator Cloud collects, uses, retains, and protects visitor data, including details about cookies, analytics, advertising, and privacy rights.",
  },
  "/terms": {
    title: "Terms of Service | Creator Cloud",
    description: "Review Creator Cloud's terms of service, acceptable-use rules, prohibited content standards, advertising disclosures, and copyright procedures.",
  },
  "/dmca": {
    title: "DMCA and Copyright Policy | Creator Cloud",
    description: "Learn how Creator Cloud handles copyright complaints, valid DMCA takedown notices, counter-notices, acceptable quotation, and prohibited content.",
  },
  "/disclosure": {
    title: "Advertising and Affiliate Disclosure | Creator Cloud",
    description: "See how Creator Cloud is funded, how advertising and affiliate links are disclosed, and how we protect editorial independence from commercial influence.",
  },
  "/editorial-policy": {
    title: "Editorial Policy | Creator Cloud",
    description: "Learn how Creator Cloud researches, tests, sources, reviews, updates, and corrects creator-economy articles while maintaining editorial independence.",
  },
  "/smart-links": {
    title: "Smart Links for Creators | Creator Cloud",
    description: "Create smart links that unlock scripts, files, videos, and creator resources after clear audience actions, with progress tracking and transparent steps.",
  },
  "/social-media-glossary": {
    title: "Social Media Glossary for Creators | Creator Cloud",
    description: "Explore plain-English definitions of smart links, RPM, CTR, social unlocks, bridge pages, creator funnels, viewability, and monetization terms.",
  },
  "/how-it-works": {
    title: "How Creator Cloud Smart Links Work | Creator Cloud",
    description: "Learn how to build, share, and track a Creator Cloud smart link that guides visitors through clear audience actions before opening a resource.",
  },
  "/pricing": {
    title: "Creator Smart Link Pricing | Creator Cloud",
    description: "Review Creator Cloud smart-link pricing and launch features for creators sharing scripts, checklists, videos, downloads, and other useful resources.",
  },
};

function plainText(value: string) {
  return value
    .replace(/^#{2,4}\s+/gm, "")
    .replace(/\*\*/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function articleDescription(excerpt: string, body: string) {
  const combined = plainText(`${excerpt} ${body}`);
  if (combined.length <= 160) return combined;
  const candidate = combined.slice(0, 157);
  const boundary = candidate.lastIndexOf(" ");
  return `${candidate.slice(0, boundary > 140 ? boundary : 157).replace(/[,:;\s]+$/, "")}…`;
}

type PublicRouteSeoProps = {
  article?: { slug: string; title: string; excerpt: string; body: string };
};

export default function PublicRouteSeo({ article }: PublicRouteSeoProps) {
  const { pathname } = useLocation();
  if (pathname.startsWith("/blog/") && !article) return null;
  const categorySlug = pathname.startsWith("/category/") ? pathname.split("/")[2] : undefined;
  const categoryName = categorySlug ? CATEGORY_NAMES[categorySlug] : undefined;

  let title: string;
  let description: string;
  let type: "website" | "article" = "website";

  if (article && pathname === `/blog/${article.slug}`) {
    title = `${article.title} | ${SITE_NAME}`;
    description = articleDescription(article.excerpt, article.body);
    type = "article";
  } else if (categoryName) {
    title = `${categoryName} Creator Guides | ${SITE_NAME}`;
    description = `Explore original ${categoryName} guides from Creator Cloud, with practical tutorials, platform analysis, tool comparisons, growth tactics, and revenue benchmarks.`;
  } else {
    const meta = STATIC_META[pathname] ?? STATIC_META["/"];
    title = meta.title;
    description = meta.description;
  }

  const canonical = `${SITE_URL}${pathname === "/" ? "/" : pathname}`;

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonical} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:type" content={type} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonical} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
    </Helmet>
  );
}