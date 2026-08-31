import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { posts } from "@/content/posts";

/**
 * Route-aware AdSense loader.
 *
 * We deliberately DO NOT load the AdSense script on bridge, collection,
 * legal, search, or admin routes. Google explicitly calls out ads on
 * navigation/utility screens and low-value inventory as a policy risk.
 *
 * Only full editorial article routes (/blog/*) load the script.
 */
const ADSENSE_SRC =
  "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8877213222492502";

export default function AdSenseScript() {
  const { pathname } = useLocation();
  const allowed = posts.some((post) => pathname === `/blog/${post.slug}`);

  useEffect(() => {
    if (!allowed) return;
    if (document.querySelector(`script[src^="${ADSENSE_SRC.split("?")[0]}"]`)) return;
    const s = document.createElement("script");
    s.async = true;
    s.src = ADSENSE_SRC;
    s.crossOrigin = "anonymous";
    document.head.appendChild(s);
  }, [allowed]);

  return null;
}
