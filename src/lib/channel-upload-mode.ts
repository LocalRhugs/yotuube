/**
 * Per-channel upload mode — what gets posted to each channel when you upload.
 *  - "both"  : long-form video + an auto-generated Short
 *  - "video" : long-form only
 *  - "short" : Short only (skips the long-form upload — saves quota on channels where
 *              long-form gets ~0 views)
 * Persisted locally, keyed by the channel/token id (same id UploadPage uses).
 */
export type UploadMode = "both" | "video" | "short";

const KEY = "yt_channel_upload_mode_v1";
const SEEDED_KEY = "yt_channel_upload_mode_seeded_v1";

export const MODE_OPTIONS: { value: UploadMode; label: string }[] = [
  { value: "both", label: "Video + Short" },
  { value: "video", label: "Video only" },
  { value: "short", label: "Short only" },
];

export function getUploadModeMap(): Record<string, UploadMode> {
  try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch { return {}; }
}
export function getUploadMode(id: string, fallback: UploadMode = "both"): UploadMode {
  return getUploadModeMap()[id] || fallback;
}
export function setUploadMode(id: string, mode: UploadMode) {
  const map = getUploadModeMap();
  map[id] = mode;
  try { localStorage.setItem(KEY, JSON.stringify(map)); } catch { /* ignore */ }
}
export function setUploadModeMap(map: Record<string, UploadMode>) {
  try { localStorage.setItem(KEY, JSON.stringify(map)); } catch { /* ignore */ }
}

// Recommended defaults from the performance data: the big channel keeps long-form (that's
// where its audience is), every other channel goes Shorts-only (long-form pulls ~0 views
// there and just burns quota). Matched by channel title. Fully editable per channel.
const PLAN_BY_TITLE: Record<string, UploadMode> = {
  "combo_wick": "video",
};

export function seedUploadModePlan(channels: { id: string; title?: string }[]): Record<string, UploadMode> {
  const map = getUploadModeMap();
  let seeded = false;
  try { seeded = localStorage.getItem(SEEDED_KEY) === "1"; } catch { /* ignore */ }
  for (const c of channels) {
    if (map[c.id] !== undefined) continue;                 // user already set this one
    if (seeded && Object.keys(map).length > 0) continue;
    const t = (c.title || "").trim().toLowerCase();
    map[c.id] = PLAN_BY_TITLE[t] || "short";               // big channel = video, rest = short
  }
  setUploadModeMap(map);
  try { localStorage.setItem(SEEDED_KEY, "1"); } catch { /* ignore */ }
  return map;
}
