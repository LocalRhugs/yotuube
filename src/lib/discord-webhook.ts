// Discord new-video announcer config + sender. Replaces Discord's built-in YouTube
// integration (which pings @everyone for EVERY upload). Here you control: which
// channels announce, and how each TYPE pings — long-form vs Short — separately.
// Config is stored locally (like channel-langs/upload-mode); the actual post goes
// through the `discord-announce` edge function (webhook stays server-side).
import { supabase } from "@/integrations/supabase/client";

export type DiscordPing = "everyone" | "here" | "none";

export interface DiscordConfig {
  url: string;
  /** channelTokenId -> announce? (missing = ON by default once a webhook is set) */
  channels: Record<string, boolean>;
  longPing: DiscordPing;
  shortPing: DiscordPing;
}

const KEY = "yt_discord_webhook_v1";
const DEFAULT: DiscordConfig = { url: "", channels: {}, longPing: "everyone", shortPing: "none" };

export const PING_OPTIONS: { value: DiscordPing; label: string }[] = [
  { value: "everyone", label: "@everyone" },
  { value: "here", label: "@here (online only)" },
  { value: "none", label: "No ping (silent)" },
];

export function getDiscordConfig(): DiscordConfig {
  try { return { ...DEFAULT, ...JSON.parse(localStorage.getItem(KEY) || "{}") }; }
  catch { return { ...DEFAULT }; }
}
export function saveDiscordConfig(c: DiscordConfig) {
  try { localStorage.setItem(KEY, JSON.stringify(c)); } catch { /* ignore */ }
}
/** A channel announces when a webhook is set and it isn't explicitly turned OFF. */
export function isChannelAnnounced(channelTokenId: string): boolean {
  const c = getDiscordConfig();
  return !!c.url && c.channels[channelTokenId] !== false;
}
export function setChannelAnnounced(channelTokenId: string, on: boolean) {
  const c = getDiscordConfig();
  c.channels[channelTokenId] = on;
  saveDiscordConfig(c);
}

interface AnnounceInput {
  videoId?: string;
  title: string;
  channelTitle: string;
  channelTokenId: string;
  isShort: boolean;
  thumbnail?: string;
}

/** Fire the announcement for a freshly-uploaded video (no-op if not configured/enabled). */
export async function announceVideo(v: AnnounceInput): Promise<{ success: boolean; error?: string }> {
  const c = getDiscordConfig();
  if (!c.url) return { success: false, error: "no_webhook" };
  if (c.channels[v.channelTokenId] === false) return { success: false, error: "channel_disabled" };
  const ping = v.isShort ? c.shortPing : c.longPing;
  try {
    const { data, error } = await supabase.functions.invoke("discord-announce", {
      body: {
        webhookUrl: c.url, title: v.title, videoId: v.videoId,
        channelTitle: v.channelTitle, isShort: v.isShort, thumbnail: v.thumbnail, ping,
      },
    });
    if (error) return { success: false, error: error.message };
    return { success: !!(data as { success?: boolean })?.success, error: (data as { error?: string })?.error };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "invoke_failed" };
  }
}

/** Send a test embed to a webhook URL (used by the Settings "Send Test" button). */
export async function sendDiscordTest(url: string, isShort = false): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke("discord-announce", {
      body: {
        webhookUrl: url,
        title: isShort ? "Test — your Short announcer works! 📱" : "Test — your video announcer works! 🎬",
        videoId: "", channelTitle: "Test Channel", isShort, ping: "none",
      },
    });
    if (error) return { success: false, error: error.message };
    return { success: !!(data as { success?: boolean })?.success, error: (data as { error?: string })?.error };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "invoke_failed" };
  }
}
