/**
 * Per-channel default upload language.
 * Persisted locally, keyed by the destination/token id (same id UploadPage uses for channels).
 * On upload, each YouTube channel's title/description auto-translates to its saved language,
 * so you never have to set it by hand per upload.
 */
const KEY = "yt_channel_langs_v1";
const SEEDED_KEY = "yt_channel_langs_seeded_v1";

export const LANG_OPTIONS: { code: string; name: string }[] = [
  { code: "", name: "English (original)" },
  { code: "es", name: "Spanish" },
  { code: "pt", name: "Portuguese" },
  { code: "fr", name: "French" },
  { code: "de", name: "German" },
  { code: "it", name: "Italian" },
  { code: "ru", name: "Russian" },
  { code: "tr", name: "Turkish" },
  { code: "ar", name: "Arabic" },
  { code: "hi", name: "Hindi" },
  { code: "id", name: "Indonesian" },
  { code: "vi", name: "Vietnamese" },
  { code: "th", name: "Thai" },
  { code: "tl", name: "Filipino" },
  { code: "ko", name: "Korean" },
  { code: "ja", name: "Japanese" },
  { code: "zh", name: "Chinese" },
];

export function langName(code: string): string {
  return LANG_OPTIONS.find(l => l.code === code)?.name || "English (original)";
}

export function getChannelLangMap(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch { return {}; }
}

export function getChannelLang(id: string): string {
  return getChannelLangMap()[id] || "";
}

export function setChannelLang(id: string, code: string) {
  const map = getChannelLangMap();
  map[id] = code;
  try { localStorage.setItem(KEY, JSON.stringify(map)); } catch { /* ignore */ }
}

export function setChannelLangMap(map: Record<string, string>) {
  try { localStorage.setItem(KEY, JSON.stringify(map)); } catch { /* ignore */ }
}

// Recommended starting plan, matched by channel title (case-insensitive, trimmed).
// COMBO_WICK stays English. One clean language per channel across the top Roblox markets.
const PLAN_BY_TITLE: Record<string, string> = {
  "combo_wick": "",
  "wick_scripts": "es",
  "wickedcode1": "id",
  "appinoscripts": "th",
  "bestrobloxxscripts": "vi",
  "ghostkey1.0": "tl",
  "nighthub1": "ru",
  "apexscripts": "pt",
  "최고의 로블록스 스크립트": "id", // repurposed Korean→Indonesian 2026-09-10 (redundant dead-weight KR channel → reclaim Indonesia, the #1 lost market after WICKEDCODE1 termination)
  "한국어 로블록스 스크립트": "ko", // was "de" — owner staying Korean on both (Korean script vids gain traction as they age)
};

/**
 * One-time seed: for each channel not yet assigned, apply the recommended plan by title.
 * Runs once (guarded), and never overwrites a channel you've already set yourself.
 */
export function seedChannelLangPlan(channels: { id: string; title?: string }[]): Record<string, string> {
  const map = getChannelLangMap();
  let alreadySeeded = false;
  try { alreadySeeded = localStorage.getItem(SEEDED_KEY) === "1"; } catch { /* ignore */ }
  for (const c of channels) {
    if (map[c.id] !== undefined) continue;               // user already set this one
    if (alreadySeeded && Object.keys(map).length > 0) continue;
    const t = (c.title || "").trim().toLowerCase();
    const planned = PLAN_BY_TITLE[t];
    if (planned !== undefined) map[c.id] = planned;
  }
  setChannelLangMap(map);
  try { localStorage.setItem(SEEDED_KEY, "1"); } catch { /* ignore */ }
  return map;
}
