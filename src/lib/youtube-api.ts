import { supabase } from "@/integrations/supabase/client";

const CLIENT_IDS_KEY = "google_client_ids";
const ACTIVE_CLIENT_ID_KEY = "active_google_client_id";

const DEFAULT_CLIENT_IDS = [
  "302161788573-tho9l56pvgtq5nefhf1uvpla9tb3u14t.apps.googleusercontent.com",
  "296836980382-stmgke52oaugg3ichmkk7j7mfomqaf4c.apps.googleusercontent.com",
  "103394190846-nsv2in023rc9jcb9r52kjkptq8ffi1kh.apps.googleusercontent.com",
  "526826300160-bsn65bmdhccl19fj0bm8jlq3781eivi8.apps.googleusercontent.com",
  "520138629571-k5s2r89f7h0l9e74lccv5453p36cfaeg.apps.googleusercontent.com",
  "473409055154-vv1l7fje765eh3niojfuhirj2603atvk.apps.googleusercontent.com",
  "552525279236-qej7j565n51klfbmrte4dpmgl4n3th7o.apps.googleusercontent.com",
  "71745165232-inc54oufsb4t5dodj5oi3kkln6gbcfec.apps.googleusercontent.com",
  "988682455302-i5o409bbjmosho9lmhh9c2oqr5cpc5ds.apps.googleusercontent.com",
  "413250698392-aohnivghhrmch593b3d5igpuuu6hr1hs.apps.googleusercontent.com",
  "1091516760006-kmvonq6783gs3v56mrg1pf3rtomgarkl.apps.googleusercontent.com",
  "780489393816-p38j0fckuk1d056rerdulieqsoa1asjq.apps.googleusercontent.com",
];

export function getStoredClientIds(): string[] {
  try {
    const raw = localStorage.getItem(CLIENT_IDS_KEY);
    if (!raw) {
      localStorage.setItem(CLIENT_IDS_KEY, JSON.stringify(DEFAULT_CLIENT_IDS));
      if (!localStorage.getItem(ACTIVE_CLIENT_ID_KEY)) {
        localStorage.setItem(ACTIVE_CLIENT_ID_KEY, DEFAULT_CLIENT_IDS[0]);
      }
      return [...DEFAULT_CLIENT_IDS];
    }
    const stored: string[] = JSON.parse(raw);
    // Merge any missing defaults
    const merged = [...new Set([...stored, ...DEFAULT_CLIENT_IDS])];
    if (merged.length !== stored.length) {
      localStorage.setItem(CLIENT_IDS_KEY, JSON.stringify(merged));
    }
    return merged;
  } catch { return [...DEFAULT_CLIENT_IDS]; }
}

export function saveClientIds(ids: string[]) {
  localStorage.setItem(CLIENT_IDS_KEY, JSON.stringify(ids));
}

export function getActiveClientId(): string | null {
  return localStorage.getItem(ACTIVE_CLIENT_ID_KEY);
}

export function setActiveClientId(id: string | null) {
  if (id) localStorage.setItem(ACTIVE_CLIENT_ID_KEY, id);
  else localStorage.removeItem(ACTIVE_CLIENT_ID_KEY);
}

interface ApiResult {
  success: boolean;
  data?: any;
  error?: string;
}

async function invokeYouTubeAuth(body: Record<string, any>): Promise<ApiResult> {
  try {
    const activeClientId = getActiveClientId();
    const finalBody = activeClientId ? { ...body, clientId: activeClientId } : body;
    const { data, error } = await supabase.functions.invoke('youtube-auth', { body: finalBody });
    if (error) {
      const context = (error as any)?.context;
      if (context && typeof context === 'object') {
        try {
          const b = await context.json?.();
          if (b?.error) return { success: false, error: b.error };
        } catch {}
      }
      return { success: false, error: error.message };
    }
    return data as ApiResult;
  } catch (err: any) {
    return { success: false, error: err.message || 'Unknown error' };
  }
}

export async function getYouTubeAuthUrl(redirectUri: string) {
  return invokeYouTubeAuth({ action: 'get_auth_url', redirectUri });
}

export async function exchangeYouTubeCode(code: string, redirectUri: string) {
  return invokeYouTubeAuth({ action: 'exchange_code', code, redirectUri });
}

export async function getYouTubeStatus() {
  return invokeYouTubeAuth({ action: 'get_status' });
}

export async function getYouTubeChannels() {
  return invokeYouTubeAuth({ action: 'get_channels' });
}

export async function getYouTubeChannelAnalytics(channelTokenId: string) {
  return invokeYouTubeAuth({ action: 'get_channel_analytics', channelTokenId });
}

export async function validateYouTubeConfig(redirectUri: string) {
  return invokeYouTubeAuth({ action: 'validate', redirectUri });
}

export async function disconnectYouTube(channelTokenId?: string) {
  return invokeYouTubeAuth({ action: 'disconnect', channelTokenId });
}

export async function searchYouTubeVideos(query: string) {
  return invokeYouTubeAuth({ action: 'search_videos', query });
}

export async function checkYouTubeTokenHealth() {
  return invokeYouTubeAuth({ action: 'check_token_health' });
}


