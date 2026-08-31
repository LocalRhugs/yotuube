/**
 * Reusable upload presets/templates so you don't re-type metadata.
 * Stored in localStorage. Independent of the per-channel UploadDefaults.
 */
const KEY = "yt_upload_presets_v1";

export interface UploadPreset {
  id: string;
  name: string;
  title?: string;
  description?: string;
  tags?: string;        // comma-separated
  category?: string;
  privacy?: "public" | "private" | "unlisted";
  defaultLanguage?: string;
  hashtags?: string;    // comma-separated, prepended to description if used
  smartLinkHeader?: string;
  smartLinkBody?: string;
}

export function getPresets(): UploadPreset[] {
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
}

export function savePreset(preset: UploadPreset) {
  const all = getPresets();
  const idx = all.findIndex(p => p.id === preset.id);
  if (idx >= 0) all[idx] = preset; else all.push(preset);
  localStorage.setItem(KEY, JSON.stringify(all));
}

export function deletePreset(id: string) {
  const all = getPresets().filter(p => p.id !== id);
  localStorage.setItem(KEY, JSON.stringify(all));
}
