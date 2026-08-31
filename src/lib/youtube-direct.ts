/**
 * Direct YouTube API helper using stored OAuth tokens.
 * Tokens are stored in the youtube_tokens table (accessed via edge functions).
 * For direct browser uploads we use the access_token stored in Supabase.
 */
import { supabase } from "@/integrations/supabase/client";

export interface StoredYouTubeChannel {
  id: string; // youtube_tokens.id (UUID)
  channelId: string | null;
  channelTitle: string | null;
  accessToken: string;
}

export interface YouTubeChannel {
  id: string; // youtube_tokens.id
  channelId: string | null;
  channelTitle: string | null;
  snippet?: {
    title: string;
    description: string;
    thumbnails?: { default?: { url: string } };
  };
  statistics?: {
    videoCount: string;
    subscriberCount: string;
    viewCount: string;
  };
}

const UPLOAD_DEFAULTS_KEY = "yt_upload_defaults";

export interface SocialUnlockActions {
  subscribe: boolean;
  like: boolean;
  comment: boolean;
}

export interface UploadDefaults {
  privacy: "public" | "private" | "unlisted";
  category: string;
  allowComments: boolean;
  allowRatings: boolean;
  description: string;
  tags: string;
  socialUnlockEnabled?: boolean;
  socialUnlockTargetUrl?: string;
  socialUnlockActions?: SocialUnlockActions;
  socialUnlockHeader?: string; // e.g. "🎁 UNLOCK EXCLUSIVE CONTENT"
  socialUnlockBody?: string;   // e.g. "Unlock exclusive content!\n\nComplete the required actions to access:"
}

export function getUploadDefaults(channelId?: string): UploadDefaults | null {
  try {
    const raw = localStorage.getItem(UPLOAD_DEFAULTS_KEY);
    if (!raw) return null;
    const all = JSON.parse(raw);
    if (channelId && all[channelId]) return all[channelId];
    if (all._global) return all._global;
    return null;
  } catch {
    return null;
  }
}

export function saveUploadDefaults(channelId: string | null, defaults: UploadDefaults) {
  try {
    const raw = localStorage.getItem(UPLOAD_DEFAULTS_KEY);
    const all = raw ? JSON.parse(raw) : {};
    const key = channelId || "_global";
    all[key] = defaults;
    localStorage.setItem(UPLOAD_DEFAULTS_KEY, JSON.stringify(all));
  } catch {}
}

export function getAllUploadDefaults(): Record<string, UploadDefaults> {
  try {
    const raw = localStorage.getItem(UPLOAD_DEFAULTS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/** Fetch all stored YouTube channel tokens from Supabase */
export async function getStoredChannels(): Promise<StoredYouTubeChannel[]> {
  const { data, error } = await supabase.from("youtube_tokens").select("*");
  if (error || !data) return [];
  return data.map((t) => ({
    id: t.id,
    channelId: t.channel_id,
    channelTitle: t.channel_title,
    accessToken: t.access_token,
  }));
}

/**
 * Get a guaranteed-fresh access token for a stored channel.
 * Calls youtube-auth `get_token` which refreshes via OAuth if expired/near-expiry.
 * Solves "Failed to fetch" after the browser session has been idle.
 */
export async function getFreshAccessToken(channelTokenId: string): Promise<string | null> {
  try {
    const { data, error } = await supabase.functions.invoke("youtube-auth", {
      body: { action: "get_token", channelTokenId },
    });
    if (error || !data?.success) return null;
    return data.data?.accessToken || null;
  } catch {
    return null;
  }
}

/** Upload a video directly to YouTube using resumable upload */
export async function uploadVideoToYouTube(
  accessToken: string,
  file: File,
  metadata: {
    title: string;
    description: string;
    tags: string[];
    categoryId: string;
    privacyStatus: string;
    allowComments: boolean;
    allowRatings: boolean;
    scheduled?: string;
    defaultLanguage?: string;
    license?: "youtube" | "creativeCommon";
    publicStatsViewable?: boolean;
    madeForKids?: boolean;
    containsSyntheticMedia?: boolean;
    paidPromotion?: boolean;
    recordingDate?: string;
    notifySubscribers?: boolean;
    localizations?: Record<string, { title: string; description: string }>;
  },
  onProgress?: (pct: number) => void
): Promise<{ success: boolean; videoId?: string; error?: string }> {
  try {
    const parts = ["snippet", "status"];
    if (metadata.recordingDate) parts.push("recordingDetails");
    if (metadata.localizations && Object.keys(metadata.localizations).length > 0) parts.push("localizations");

    const body: Record<string, any> = {
      snippet: {
        title: metadata.title.substring(0, 100),
        description: metadata.description.substring(0, 5000),
        tags: metadata.tags.length > 0 ? metadata.tags.slice(0, 30) : undefined,
        categoryId: metadata.categoryId,
        ...(metadata.defaultLanguage ? { defaultLanguage: metadata.defaultLanguage } : {}),
      },
      status: {
        privacyStatus: metadata.privacyStatus,
        selfDeclaredMadeForKids: metadata.madeForKids ?? false,
        embeddable: true,
        license: metadata.license || "youtube",
        publicStatsViewable: metadata.publicStatsViewable ?? true,
        ...(metadata.containsSyntheticMedia !== undefined ? { containsSyntheticMedia: metadata.containsSyntheticMedia } : {}),
        ...(metadata.scheduled ? { publishAt: metadata.scheduled } : {}),
      },
    };

    if (metadata.recordingDate) {
      body.recordingDetails = { recordingDate: metadata.recordingDate };
    }
    if (metadata.localizations && Object.keys(metadata.localizations).length > 0) {
      body.localizations = metadata.localizations;
    }
    if (metadata.paidPromotion) {
      body.paidProductPlacementDetails = { hasPaidProductPlacement: true };
      if (!parts.includes("paidProductPlacementDetails")) parts.push("paidProductPlacementDetails");
    }

    const notifyParam = metadata.notifySubscribers === false ? "&notifySubscribers=false" : "";
    const initRes = await fetch(
      `https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=${parts.join(",")}${notifyParam}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json; charset=UTF-8",
          "X-Upload-Content-Length": file.size.toString(),
          "X-Upload-Content-Type": file.type || "video/mp4",
        },
        body: JSON.stringify(body),
      }
    );

    if (!initRes.ok) {
      const text = await initRes.text();
      return { success: false, error: `Init failed (${initRes.status}): ${text}` };
    }

    const sessionUri = initRes.headers.get("location");
    if (!sessionUri) return { success: false, error: "No session URI" };

    // Chunked resumable upload with per-chunk retry.
    // YouTube requires chunk sizes to be multiples of 256 KB (except the final chunk).
    const CHUNK_SIZE = 8 * 1024 * 1024; // 8 MB
    const MAX_RETRIES = 5;
    const contentType = file.type || "video/mp4";
    let offset = 0;
    let finalResult: any = null;

    while (offset < file.size) {
      const end = Math.min(offset + CHUNK_SIZE, file.size);
      const chunk = file.slice(offset, end);
      const range = `bytes ${offset}-${end - 1}/${file.size}`;

      let attempt = 0;
      let uploaded = false;
      while (attempt < MAX_RETRIES && !uploaded) {
        try {
          const res = await fetch(sessionUri, {
            method: "PUT",
            headers: {
              "Content-Type": contentType,
              "Content-Length": (end - offset).toString(),
              "Content-Range": range,
            },
            body: chunk,
          });

          if (res.status === 308) {
            // Incomplete — server tells us how much it received
            const rangeHeader = res.headers.get("range");
            if (rangeHeader) {
              const m = rangeHeader.match(/bytes=0-(\d+)/);
              if (m) offset = parseInt(m[1], 10) + 1;
              else offset = end;
            } else {
              offset = end;
            }
            uploaded = true;
          } else if (res.ok) {
            finalResult = await res.json();
            offset = file.size;
            uploaded = true;
          } else if (res.status === 500 || res.status === 502 || res.status === 503 || res.status === 504) {
            // Transient — query upload status, then retry
            attempt++;
            await new Promise((r) => setTimeout(r, Math.min(2 ** attempt * 500, 15000)));
            const statusRes = await fetch(sessionUri, {
              method: "PUT",
              headers: { "Content-Range": `bytes */${file.size}`, "Content-Length": "0" },
            });
            if (statusRes.status === 308) {
              const rangeHeader = statusRes.headers.get("range");
              if (rangeHeader) {
                const m = rangeHeader.match(/bytes=0-(\d+)/);
                if (m) offset = parseInt(m[1], 10) + 1;
              }
            } else if (statusRes.ok) {
              finalResult = await statusRes.json();
              offset = file.size;
              uploaded = true;
            }
          } else {
            const text = await res.text();
            return { success: false, error: `Upload failed (${res.status}): ${text}` };
          }
        } catch (netErr: any) {
          attempt++;
          if (attempt >= MAX_RETRIES) {
            return { success: false, error: `Network error after ${MAX_RETRIES} retries: ${netErr.message}` };
          }
          await new Promise((r) => setTimeout(r, Math.min(2 ** attempt * 500, 15000)));
        }
      }

      if (!uploaded) {
        return { success: false, error: `Chunk upload failed at offset ${offset} after ${MAX_RETRIES} retries` };
      }

      onProgress?.(Math.round((offset / file.size) * 100));
    }

    if (!finalResult) {
      return { success: false, error: "Upload completed but no video ID returned" };
    }
    onProgress?.(100);
    return { success: true, videoId: finalResult.id };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/** Upload a custom thumbnail for a video */
export async function uploadThumbnail(
  accessToken: string,
  videoId: string,
  thumbnail: File
): Promise<boolean> {
  try {
    const res = await fetch(
      `https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId=${videoId}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": thumbnail.type,
        },
        body: thumbnail,
      }
    );
    return res.ok;
  } catch {
    return false;
  }
}
