/**
 * Smart Link API client
 * Generates social-unlock links for YouTube and Facebook/Instagram posts.
 * Base URL: https://v0-sssw.vercel.app
 * Links are constructed locally by encoding the payload into the URL.
 * Format: /u/{videoId}?d={base64url_encoded_payload}
 *
 * URL Shortener: persists links to Supabase short_urls table via url-shortener edge function.
 */

import { supabase } from "@/integrations/supabase/client";

const API_BASE = "https://v0-sssw.vercel.app";
const SELF_HOST_FLAG = "smart_link_self_host";

/** Returns true when the user has opted into self-hosted smart links (testing). */
export function isSelfHostSmartLinks(): boolean {
  try { return localStorage.getItem(SELF_HOST_FLAG) === "true"; } catch { return false; }
}

export function setSelfHostSmartLinks(enabled: boolean) {
  try { localStorage.setItem(SELF_HOST_FLAG, enabled ? "true" : "false"); } catch {}
}

function smartLinkBase(): string {
  if (isSelfHostSmartLinks() && typeof window !== "undefined") {
    return window.location.origin;
  }
  return API_BASE;
}



export interface YouTubeSmartLinkRequest {
  videoId: string;
  channelId: string; // actual YouTube channel ID (UCxxxx...)
  targetUrl: string;
  actions: {
    subscribe: boolean;
    like: boolean;
    comment: boolean;
  };
}

export interface FacebookSmartLinkRequest {
  postId: string;
  pageId: string;
  platform: "facebook" | "instagram";
  targetUrl: string;
  pageName?: string;
  postUrl?: string;
  actions: {
    follow: boolean;
    like: boolean;
    comment: boolean;
  };
}

export interface SmartLinkResponse {
  success: boolean;
  smartLink?: string;
  longUrl?: string;
  shortLink?: string;
  error?: string;
}

/**
 * Encode payload as base64url (URL-safe base64)
 */
function base64url(payload: unknown[]): string {
  return btoa(JSON.stringify(payload))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * Shorten a URL using the persistent url-shortener edge function
 */
async function shortenUrl(longUrl: string): Promise<string> {
  try {
    // When self-hosting, pass origin to use our DB-backed /s/:code shortener (gives analytics).
    const origin = typeof window !== "undefined" && isSelfHostSmartLinks() ? window.location.origin : undefined;
    const { data, error } = await supabase.functions.invoke('url-shortener', {
      body: origin ? { url: longUrl, origin, mode: 'self' } : { url: longUrl },
    });
    if (!error && data?.success && data?.shortUrl) {
      return data.shortUrl;
    }
    return longUrl;
  } catch {
    return longUrl;
  }
}

/**
 * Generate a YouTube smart link.
 * Encodes [mask, compactChannelId, targetUrl] and constructs the URL locally.
 * Optionally shortens via the url-shortener edge function.
 */
export async function generateYouTubeSmartLink(
  req: YouTubeSmartLinkRequest,
  shorten = false
): Promise<SmartLinkResponse> {
  try {
    // Action mask: subscribe=1, like=2, comment=4
    let mask = 0;
    if (req.actions.subscribe) mask |= 1;
    if (req.actions.like) mask |= 2;
    if (req.actions.comment) mask |= 4;

    // Strip "UC" prefix for compact encoding
    const compactChannelId = req.channelId.startsWith("UC")
      ? req.channelId.slice(2)
      : req.channelId;

    const payload = [mask, compactChannelId, req.targetUrl];
    const encoded = base64url(payload);
    // Always host the gate inside a dynamic article on our own domain so
    // the URL that spoo.me / da.gd shortens points at an editorial page
    // (AdSense-safe) instead of a bare bridge page. Falls back to API_BASE
    // only during SSR where window is undefined.
    const articleBase = typeof window !== "undefined" ? window.location.origin : API_BASE;
    const longUrl = `${articleBase}/article/${req.videoId}?d=${encoded}`;

    if (shorten) {
      const shortLink = await shortenUrl(longUrl);
      return { success: true, smartLink: shortLink, longUrl, shortLink };
    }

    return { success: true, smartLink: longUrl, longUrl };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to generate smart link" };
  }
}

/**
 * Generate a Facebook/Instagram smart link.
 * Encodes [mask, platform, pageId, postUrl, targetUrl, pageName] and constructs the URL locally.
 * Optionally shortens via the url-shortener edge function.
 */
export async function generateFacebookSmartLink(
  req: FacebookSmartLinkRequest,
  shorten = false
): Promise<SmartLinkResponse> {
  try {
    // Action mask: follow=1, like=2, comment=4
    let mask = 0;
    if (req.actions.follow) mask |= 1;
    if (req.actions.like) mask |= 2;
    if (req.actions.comment) mask |= 4;

    const p = req.platform === "instagram" ? "i" : "f";
    const payload = [mask, p, req.pageId, req.postUrl || "", req.targetUrl, req.pageName || ""];
    const encoded = base64url(payload);
    const longUrl = `${smartLinkBase()}/u/fb/${req.postId}?d=${encoded}`;

    if (shorten) {
      const shortLink = await shortenUrl(longUrl);
      return { success: true, smartLink: shortLink, longUrl, shortLink };
    }

    return { success: true, smartLink: longUrl, longUrl };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to generate smart link" };
  }
}

/**
 * Translate text using MyMemory API via the translate edge function.
 * Free, no API key required.
 */
export async function translateText(
  text: string,
  targetLanguage: string,
  sourceLanguage = "en"
): Promise<{ success: boolean; translatedText?: string; error?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke('translate', {
      body: { text, targetLanguage, sourceLanguage },
    });
    if (error || !data?.success) {
      const context = (error as any)?.context;
      const body = context ? await context.json?.().catch(() => null) : null;
      return { success: false, error: body?.error || error?.message || "Translation failed" };
    }
    return { success: true, translatedText: data.translatedText };
  } catch (err: any) {
    return { success: false, error: err.message || "Translation failed" };
  }
}
