/**
 * Local upload history for duplicate-upload guard.
 * Stores file SHA-256 hashes of successful YouTube uploads.
 */
const KEY = "yt_upload_history_v1";

interface HistoryEntry {
  hash: string;
  title: string;
  channelTitle: string;
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

export function clearUploadHistory() {
  localStorage.removeItem(KEY);
}
