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

// Which UNLOCK PAGE the smart link points at:
//   "gate"    = a bare direct-steps page  (yourdomain/u/<videoId>?d=…) — the clean old-style gate
//   "article" = an editorial AdSense page (yourdomain/article/<videoId>?d=…)
export type SmartLinkPage = "gate" | "article";
const PAGE_KEY = "smart_link_page";
export function getSmartLinkPage(): SmartLinkPage {
  try { const v = localStorage.getItem(PAGE_KEY); if (v === "gate" || v === "article") return v; } catch {}
  return "gate";
}
export function setSmartLinkPage(p: SmartLinkPage) { try { localStorage.setItem(PAGE_KEY, p); } catch {} }

// How the link is FORMATTED when posted:
//   "full"     = the full unlock-page URL as-is
//   "external" = shortened via spoo.me / da.gd (hides your domain; tracked in your spoo.me dashboard)
//   "self"     = shortened on your own domain  (yourdomain/s/…, self-hosted analytics)
export type SmartLinkFormat = "full" | "external" | "self";
const FORMAT_KEY = "smart_link_format";
export function getSmartLinkFormat(): SmartLinkFormat {
  try { const v = localStorage.getItem(FORMAT_KEY); if (v === "full" || v === "external" || v === "self") return v; } catch {}
  return "full";
}
export function setSmartLinkFormat(f: SmartLinkFormat) { try { localStorage.setItem(FORMAT_KEY, f); } catch {} }

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
  discordUrl?: string; // invite link, required only when actions.discord is on
  actions: {
    subscribe: boolean;
    like: boolean;
    comment: boolean;
    discord?: boolean;
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
async function shortenUrl(longUrl: string, selfHost = false): Promise<string> {
  try {
    // selfHost -> our DB-backed /s/:code shortener (gives analytics); else external (spoo.me/da.gd).
    const origin = selfHost && typeof window !== "undefined" ? window.location.origin : undefined;
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
    // Action mask: subscribe=1, like=2, comment=4, discord=8
    let mask = 0;
    if (req.actions.subscribe) mask |= 1;
    if (req.actions.like) mask |= 2;
    if (req.actions.comment) mask |= 4;
    if (req.actions.discord) mask |= 8;

    // Strip "UC" prefix for compact encoding
    const compactChannelId = req.channelId.startsWith("UC")
      ? req.channelId.slice(2)
      : req.channelId;

    // A 4th element (Discord invite) is appended only when Join-Discord is required,
    // so existing 3-element links keep decoding unchanged.
    const payload: (string | number)[] = [mask, compactChannelId, req.targetUrl];
    if (req.actions.discord && req.discordUrl) payload.push(req.discordUrl);
    const encoded = base64url(payload);
    // Host on our own domain (falls back to API_BASE only during SSR). The chosen
    // PAGE decides the path: "u" = bare direct-steps gate, "article" = AdSense editorial.
    const siteBase = typeof window !== "undefined" ? window.location.origin : API_BASE;
    const path = getSmartLinkPage() === "gate" ? "u" : "article";
    const longUrl = `${siteBase}/${path}/${req.videoId}?d=${encoded}`;

    // The chosen FORMAT decides what actually gets posted.
    const fmt = getSmartLinkFormat();
    if (fmt === "full") {
      return { success: true, smartLink: longUrl, longUrl };
    }
    const shortLink = await shortenUrl(longUrl, fmt === "self");
    return { success: true, smartLink: shortLink, longUrl, shortLink };
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

    const fmt = getSmartLinkFormat();
    if (fmt === "full") {
      return { success: true, smartLink: longUrl, longUrl };
    }
    const shortLink = await shortenUrl(longUrl, fmt === "self");
    return { success: true, smartLink: shortLink, longUrl, shortLink };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to generate smart link" };
  }
}

// Translation models. Every model runs server-side through the `translate` edge function
// (OpenAI-compatible /chat/completions). Keys stay in Supabase secrets, never the browser.
// Stored value format: "<provider>:<realModelId>".
export interface TranslateModel { value: string; label: string; group: string; }
export const TRANSLATE_MODELS: TranslateModel[] = [
  // Pollinations — free-ish (POLLINATIONS_API_KEY)
  { value: "pollinations:claude-fast",   label: "Pollinations Claude Fast ⭐", group: "Pollinations (free)" },
  { value: "pollinations:openai-large",  label: "Pollinations OpenAI Large",   group: "Pollinations (free)" },
  { value: "pollinations:openai",        label: "Pollinations OpenAI",         group: "Pollinations (free)" },
  { value: "pollinations:mistral-large", label: "Pollinations Mistral Large",  group: "Pollinations (free)" },
  { value: "pollinations:nova",          label: "Pollinations Nova",           group: "Pollinations (free)" },
  // Groq — free & fast (GROQ_API_KEY)
  { value: "groq:llama-3.3-70b-versatile", label: "Groq Llama 3.3", group: "Groq (free)" },
  // Claude via OpenRouter (OPENROUTER_API_KEY + _2 failover)
  { value: "openrouter:anthropic/claude-opus-4.6",   label: "Claude Opus 4.6 · $5/$25",   group: "Claude (OpenRouter)" },
  { value: "openrouter:anthropic/claude-opus-4.5",   label: "Claude Opus 4.5 · $5/$25",   group: "Claude (OpenRouter)" },
  { value: "openrouter:anthropic/claude-sonnet-4.6", label: "Claude Sonnet 4.6 · $3/$15", group: "Claude (OpenRouter)" },
  { value: "openrouter:anthropic/claude-sonnet-4.5", label: "Claude Sonnet 4.5 · $3/$15", group: "Claude (OpenRouter)" },
  { value: "openrouter:anthropic/claude-haiku-4.5",  label: "Claude Haiku 4.5 · $1/$5",   group: "Claude (OpenRouter)" },
  { value: "openrouter:anthropic/claude-3-5-haiku",  label: "Claude Haiku 3.5 · $0.8/$4", group: "Claude (OpenRouter)" },
];

// Default to a cheap, working OpenRouter model (Pollinations needs a funded "pollen" balance;
// Groq needs GROQ_API_KEY). Switch in the Model dropdown once those are set up.
const DEFAULT_MODEL = "openrouter:anthropic/claude-haiku-4.5";
const TRANSLATE_PROVIDER_KEY = "translate_provider";

/** Returns the saved model value ("<provider>:<realModelId>"). */
export function getTranslateProvider(): string {
  try {
    const v = localStorage.getItem(TRANSLATE_PROVIDER_KEY);
    if (v && TRANSLATE_MODELS.some((m) => m.value === v)) return v;
  } catch { /* ignore */ }
  return DEFAULT_MODEL;
}

export function setTranslateProvider(value: string) {
  try { localStorage.setItem(TRANSLATE_PROVIDER_KEY, value); } catch { /* ignore */ }
}

/**
 * Translate text via the `translate` edge function using the chosen model.
 * `override` (or the saved choice) is "<provider>:<realModelId>".
 */
export async function translateText(
  text: string,
  targetLanguage: string,
  sourceLanguage = "en",
  override?: string
): Promise<{ success: boolean; translatedText?: string; error?: string }> {
  const chosen = override || getTranslateProvider();
  const idx = chosen.indexOf(":");
  const provider = idx > 0 ? chosen.slice(0, idx) : "pollinations";
  const model = idx > 0 ? chosen.slice(idx + 1) : chosen;
  try {
    const { data, error } = await supabase.functions.invoke('translate', {
      body: { text, targetLanguage, sourceLanguage, provider, model },
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
