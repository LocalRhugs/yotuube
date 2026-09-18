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
  "wickedcode0": "id", // WICKEDCODE0 (rebuilt, connected 2026-09-18) = Indonesian, the proven #1 market (WICKEDCODE1 ID Shorts 1.8K vs COMBO_WICK 103)
  "appinoscripts": "th",
  "bestrobloxxscripts": "vi", // Vietnamese 2026-09-18 — moved off Indonesian (WICKEDCODE0 now owns ID); country VN fits. Avoids two ID channels = dup-content risk
  "ghostkey1.0": "tl",
  "nighthub1": "ru",
  "apexscripts": "pt",
  "최고의 로블록스 스크립트": "ko", // stays Korean — it's growing (owner rule); do NOT convert to Indonesian
  "한국어 로블록스 스크립트": "ko", // was "de" — owner staying Korean on both (Korean script vids gain traction as they age)
};

// One-time forced overrides (bump the version to re-apply to already-seeded channels).
// Unlike the seed, these OVERWRITE an existing per-channel value, matched by title.
const OVERRIDE_VERSION = "2026-09-18-vi";
const OVERRIDE_KEY = "yt_channel_langs_override_v1";
const FORCE_BY_TITLE: Record<string, string> = {
  "wickedcode0": "id",         // WICKEDCODE0 = Indonesian
  "bestrobloxxscripts": "vi",  // moved off ID -> Vietnamese (WICKEDCODE0 owns ID now)
  "최고의 로블록스 스크립트": "ko",
};

/**
 * Seed: for each channel not yet assigned, apply the recommended plan by title. Applies to
 * ANY channel with no value yet — including ones connected AFTER the first run (a newly added
 * channel like WICKEDCODE0 must still get its planned language) — but never overwrites a
 * channel you've already set yourself (a stored "" = English/original counts as set).
 */
export function seedChannelLangPlan(channels: { id: string; title?: string }[]): Record<string, string> {
  const map = getChannelLangMap();
  for (const c of channels) {
    if (map[c.id] !== undefined) continue;               // user already set this one (incl. "")
    const t = (c.title || "").trim().toLowerCase();
    const planned = PLAN_BY_TITLE[t];
    if (planned !== undefined) map[c.id] = planned;
  }
  // Apply forced overrides once per OVERRIDE_VERSION, even for channels already set.
  let appliedVer = "";
  try { appliedVer = localStorage.getItem(OVERRIDE_KEY) || ""; } catch { /* ignore */ }
  if (appliedVer !== OVERRIDE_VERSION) {
    for (const c of channels) {
      const t = (c.title || "").trim().toLowerCase();
      const forced = FORCE_BY_TITLE[t];
      if (forced !== undefined) map[c.id] = forced;
    }
    try { localStorage.setItem(OVERRIDE_KEY, OVERRIDE_VERSION); } catch { /* ignore */ }
  }
  setChannelLangMap(map);
  try { localStorage.setItem(SEEDED_KEY, "1"); } catch { /* ignore */ }
  return map;
}
