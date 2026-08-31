import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Client-side short-URL redirector with click tracking.
 * Looks up code in short_urls, increments click_count + daily series, then redirects.
 * Falls through to a 404 message if the code is unknown.
 */
export default function ShortRedirectPage() {
  const { code = "" } = useParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Mark as noindex — bridge page, excluded from AdSense and search crawl.
    const m = document.createElement("meta");
    m.name = "robots"; m.content = "noindex,nofollow"; document.head.appendChild(m);
    return () => { try { m.remove(); } catch {} };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!code) { setError("Missing code"); return; }
      // 1) Try user-created smart links first
      const { data: userLink } = await supabase
        .from("user_smart_links" as any)
        .select("id, slug, destination_url, clicks, metadata")
        .eq("slug", code)
        .maybeSingle();
      if (cancelled) return;
      if (userLink) {
        const link = userLink as any;
        supabase.from("user_smart_links" as any)
          .update({ clicks: (link.clicks || 0) + 1 })
          .eq("id", link.id)
          .then(() => {});

        const meta = link.metadata || {};
        if (meta.videoId && meta.channelId) {
          // Route through the unlock gate (deterministic host article)
          let h = 0;
          for (let i = 0; i < link.slug.length; i++) h = (h * 31 + link.slug.charCodeAt(i)) >>> 0;
          const hostId = `a${(h % 9999).toString(36)}`;
          const mask =
            (meta.requireSubscribe ? 1 : 0) +
            (meta.requireLike ? 2 : 0) +
            (meta.requireComment ? 4 : 0);
          const compact = String(meta.channelId).startsWith("UC")
            ? String(meta.channelId).slice(2)
            : String(meta.channelId);
          const payload = btoa(JSON.stringify([mask, compact, link.destination_url]))
            .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
          window.location.replace(`/article/${hostId}?d=${payload}&v=${meta.videoId}`);
          return;
        }
        window.location.replace(link.destination_url);
        return;
      }

      // 2) Fall back to admin short_urls
      const { data: row, error: e } = await supabase
        .from("short_urls")
        .select("id, original_url, click_count")
        .eq("code", code)
        .maybeSingle();
      if (cancelled) return;
      if (e || !row) { setError("Short link not found"); return; }

      const today = new Date().toISOString().slice(0, 10);
      supabase.from("short_urls").update({ click_count: (row.click_count || 0) + 1 }).eq("id", row.id).then(() => {});
      supabase.from("short_url_clicks")
        .select("id, count")
        .eq("code", code)
        .eq("day", today)
        .maybeSingle()
        .then(({ data: existing }) => {
          if (existing) {
            supabase.from("short_url_clicks").update({ count: existing.count + 1 }).eq("id", existing.id).then(() => {});
          } else {
            supabase.from("short_url_clicks").insert({ code, day: today, count: 1 }).then(() => {});
          }
        });

      window.location.replace(row.original_url);
    })();
    return () => { cancelled = true; };
  }, [code]);

  if (error) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] text-white flex items-center justify-center p-6">
        <div className="max-w-sm text-center space-y-3">
          <p className="text-2xl font-bold">Link not found</p>
          <p className="text-sm text-gray-400">The short link <code className="text-gray-300">/s/{code}</code> doesn't exist or was removed.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin" />
    </div>
  );
}
