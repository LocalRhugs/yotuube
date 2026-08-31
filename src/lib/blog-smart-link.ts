/**
 * Blog-hosted smart links.
 *
 * Instead of sending traffic to /u/* bridge pages (which Google AdSense
 * explicitly bans as "bridge pages"), smart links here use a real blog
 * post as the host. The reader sees the full article — every ad slot,
 * every paragraph — and at the END finds an embedded YouTube player
 * plus an Unlock button to the target URL.
 *
 * URL shape: /blog/<slug>?u=<base64url(payload)>
 *
 * Payload tuple (kept short so the URL stays clean):
 *   [ytVideoId, targetUrl, label?, description?]
 *
 * ytVideoId — 11-char YouTube ID to embed at the bottom of the article.
 *             Pass "" to skip the embed and just show the unlock card.
 * targetUrl — where the Unlock button goes.
 * label     — optional headline on the unlock card.
 * description — optional supporting copy on the unlock card.
 */

export type BlogUnlockPayload = {
  ytVideoId?: string;
  targetUrl: string;
  label?: string;
  description?: string;
};

function b64urlEncode(s: string): string {
  // Browser-safe base64url encode (handles unicode via encodeURIComponent).
  const b64 = typeof btoa !== "undefined"
    ? btoa(unescape(encodeURIComponent(s)))
    : Buffer.from(s, "utf-8").toString("base64");
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(s: string): string {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + pad;
  if (typeof atob !== "undefined") {
    return decodeURIComponent(escape(atob(b64)));
  }
  return Buffer.from(b64, "base64").toString("utf-8");
}

export function encodeBlogUnlock(p: BlogUnlockPayload): string {
  const tuple = [p.ytVideoId || "", p.targetUrl, p.label || "", p.description || ""];
  return b64urlEncode(JSON.stringify(tuple));
}

export function decodeBlogUnlock(token: string): BlogUnlockPayload | null {
  try {
    const arr = JSON.parse(b64urlDecode(token));
    if (!Array.isArray(arr) || !arr[1]) return null;
    return {
      ytVideoId: arr[0] || undefined,
      targetUrl: arr[1],
      label: arr[2] || undefined,
      description: arr[3] || undefined,
    };
  } catch {
    return null;
  }
}

/**
 * Build a public blog smart-link URL.
 * Example:
 *   buildBlogSmartLink("https://cloud-publish-pro.lovable.app",
 *                      "best-free-video-editors-for-youtubers-2026",
 *                      { ytVideoId: "dQw4w9WgXcQ",
 *                        targetUrl: "https://example.com/download",
 *                        label: "Get the free editor pack" })
 */
export function buildBlogSmartLink(origin: string, slug: string, payload: BlogUnlockPayload): string {
  return `${origin.replace(/\/$/, "")}/blog/${slug}?u=${encodeBlogUnlock(payload)}`;
}
