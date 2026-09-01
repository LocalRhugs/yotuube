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

// Translation provider selection (persisted per-browser).
// `puter:<model>` runs CLIENT-SIDE via Puter.js — free GPT, or premium Claude/Gemini billed to the
// user's own Puter account — NO API key. Edge providers (pollinations/claude/lovable) run in the
// translate edge function and need a server secret.
export type TranslateProvider = "pollinations" | "claude" | "lovable" | `puter:${string}`;
const TRANSLATE_PROVIDER_KEY = "translate_provider";

export function getTranslateProvider(): TranslateProvider {
  try {
    const v = localStorage.getItem(TRANSLATE_PROVIDER_KEY);
    if (v === "claude" || v === "lovable" || v === "pollinations" || (v && v.startsWith("puter:"))) {
      return v as TranslateProvider;
    }
  } catch { /* ignore */ }
  return "puter:gpt-5.4-mini"; // free, no key, no Lovable
}

export function setTranslateProvider(provider: TranslateProvider) {
  try { localStorage.setItem(TRANSLATE_PROVIDER_KEY, provider); } catch { /* ignore */ }
}

// Lazy-load Puter.js the first time a Puter model is used (keeps it off public pages).
let puterLoad: Promise<void> | null = null;
function ensurePuter(): Promise<void> {
  const w = window as unknown as { puter?: unknown };
  if (w.puter) return Promise.resolve();
  if (puterLoad) return puterLoad;
  puterLoad = new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://js.puter.com/v2/";
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load Puter.js"));
    document.head.appendChild(s);
  });
  return puterLoad;
}

async function translateViaPuter(
  text: string, targetLanguage: string, sourceLanguage: string, model: string
): Promise<{ success: boolean; translatedText?: string; error?: string }> {
  try {
    await ensurePuter();
    const puter = (window as any).puter;
    if (!puter?.ai?.chat) return { success: false, error: "Puter.js not available — refresh the page." };
    const system = `You are a professional translator. Translate from ${sourceLanguage} to ${targetLanguage}. Return ONLY the translated text — no quotes, no notes. Preserve line breaks, emojis, hashtags, @mentions, URLs, and any %s / {} placeholders exactly.`;
    const resp = await puter.ai.chat(
      [{ role: "system", content: system }, { role: "user", content: text }],
      { model, stream: false }
    );
    let out = "";
    if (typeof resp === "string") out = resp;
    else if (resp?.message?.content) {
      const c = resp.message.content;
      out = typeof c === "string" ? c : Array.isArray(c) ? c.map((b: any) => b?.text ?? "").join("") : "";
    } else if (resp?.text) out = resp.text;
    else if (resp?.toString) out = resp.toString();
    out = (out || "").trim();
    if (!out) return { success: false, error: "Puter returned an empty result" };
    return { success: true, translatedText: out };
  } catch (err: any) {
    return { success: false, error: err?.message || "Puter error (a premium model needs you signed into Puter)" };
  }
}

/**
 * Translate text. `puter:*` models run client-side (no key); other providers use the edge function.
 * Provider defaults to the user's saved choice (free Puter GPT).
 */
export async function translateText(
  text: string,
  targetLanguage: string,
  sourceLanguage = "en",
  provider?: TranslateProvider
): Promise<{ success: boolean; translatedText?: string; error?: string }> {
  const chosen = provider || getTranslateProvider();
  if (typeof chosen === "string" && chosen.startsWith("puter:")) {
    return translateViaPuter(text, targetLanguage, sourceLanguage, chosen.slice("puter:".length) || "gpt-5.4-mini");
  }
  try {
    const { data, error } = await supabase.functions.invoke('translate', {
      body: { text, targetLanguage, sourceLanguage, provider: chosen },
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
