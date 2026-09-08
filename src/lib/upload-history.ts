/**
 * Local upload history for duplicate-upload guard.
 * Stores file SHA-256 hashes of successful YouTube uploads.
 */
const KEY = "yt_upload_history_v1";

interface HistoryEntry {
  hash: string;
  title: string;
  channelTitle: string;
  channelKey?: string; // stable per-channel id (destination token id) — enables per-channel dedupe
  videoId?: string;
  uploadedAt: string;
}

export function getUploadHistory(): HistoryEntry[] {
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
}

export function recordUpload(entry: HistoryEntry) {
  const all = getUploadHistory();
  all.unshift(entry);
  // Keep last 200
  localStorage.setItem(KEY, JSON.stringify(all.slice(0, 200)));
}

export function findDuplicate(hash: string): HistoryEntry | null {
  return getUploadHistory().find(e => e.hash === hash) || null;
}

/**
 * Per-channel duplicate check: returns prior uploads of THIS exact file to any of the
 * given channels. Re-posting the same video to a NEW channel is intentional and won't match.
 * Old history rows without a channelKey are ignored (can't attribute them to a channel).
 */
export function findDuplicatesForChannels(hash: string, channelKeys: string[]): HistoryEntry[] {
  const keys = new Set(channelKeys);
  return getUploadHistory().filter(e => e.hash === hash && e.channelKey && keys.has(e.channelKey));
}

export function clearUploadHistory() {
  localStorage.removeItem(KEY);
}
