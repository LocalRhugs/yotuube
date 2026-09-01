import { supabase } from "@/integrations/supabase/client";

const CLIENT_IDS_KEY = "google_client_ids";
const ACTIVE_CLIENT_ID_KEY = "active_google_client_id";

const DEFAULT_CLIENT_IDS = [
  "302161788573-43955upiv3tvqnh3nao5prt9qilvmh1q.apps.googleusercontent.com",
  "103394190846-nsv2in023rc9jcb9r52kjkptq8ffi1kh.apps.googleusercontent.com",
  "526826300160-bsn65bmdhccl19fj0bm8jlq3781eivi8.apps.googleusercontent.com",
  "520138629571-k5s2r89f7h0l9e74lccv5453p36cfaeg.apps.googleusercontent.com",
  "552525279236-qej7j565n51klfbmrte4dpmgl4n3th7o.apps.googleusercontent.com",
  "71745165232-inc54oufsb4t5dodj5oi3kkln6gbcfec.apps.googleusercontent.com",
  "988682455302-i5o409bbjmosho9lmhh9c2oqr5cpc5ds.apps.googleusercontent.com",
  "1091516760006-kmvonq6783gs3v56mrg1pf3rtomgarkl.apps.googleusercontent.com",
  "18418797872-qe3msk1qn55no37sngeaci139vg34mfs.apps.googleusercontent.com",
  "471084517495-rc56nnf3vfpb4io9rerngk1vce4kggud.apps.googleusercontent.com",
];

// Client IDs that were saved with a typo and must be purged from browser storage.
const INVALID_CLIENT_IDS = [
  "302161788573-43955upiv3tvqnh3nao5prt9qjlvmh1q.apps.googleusercontent.com",
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
    // The backend only has secrets for these configured clients. Remove stale
    // browser entries so users cannot select a client that cannot authenticate.
    const configured = [...DEFAULT_CLIENT_IDS];
    if (JSON.stringify(stored) !== JSON.stringify(configured)) {
      localStorage.setItem(CLIENT_IDS_KEY, JSON.stringify(configured));
    }
    // Reset the active ID if it is no longer backed by a configured secret.
    const active = localStorage.getItem(ACTIVE_CLIENT_ID_KEY);
    if (!active || !configured.includes(active) || INVALID_CLIENT_IDS.includes(active)) {
      localStorage.setItem(ACTIVE_CLIENT_ID_KEY, configured[0]);
    }
    return configured;
  } catch { return [...DEFAULT_CLIENT_IDS]; }
}

export function saveClientIds(ids: string[]) {
  localStorage.setItem(CLIENT_IDS_KEY, JSON.stringify(ids));
}

export function getActiveClientId(): string | null {
  const active = localStorage.getItem(ACTIVE_CLIENT_ID_KEY);
  if (!active || INVALID_CLIENT_IDS.includes(active) || !DEFAULT_CLIENT_IDS.includes(active)) {
    localStorage.setItem(ACTIVE_CLIENT_ID_KEY, DEFAULT_CLIENT_IDS[0]);
    return DEFAULT_CLIENT_IDS[0];
  }
  return active;
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


