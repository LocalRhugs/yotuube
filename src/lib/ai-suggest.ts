import { supabase } from "@/integrations/supabase/client";

interface AiSuggestResponse {
  success: boolean;
  data?: any;
  error?: string;
}

async function callAiSuggest(body: Record<string, any>): Promise<AiSuggestResponse> {
  try {
    const { data, error } = await supabase.functions.invoke('ai-suggest', { body });
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
    return data as AiSuggestResponse;
  } catch (err: any) {
    return { success: false, error: err.message || 'Unknown error' };
  }
}

// ═══════════════════════════════════════════
// YOUTUBE
// ═══════════════════════════════════════════

export async function improveDescription(content: string, platform?: string) {
  return callAiSuggest({ action: platform === 'youtube' ? 'improve_youtube' : 'improve_description', content, platform: platform || 'youtube' });
}

export async function suggestHashtags(content: string, platform?: string) {
  return callAiSuggest({ action: platform === 'youtube' ? 'suggest_youtube_hashtags' : 'suggest_hashtags', content, platform: platform || 'youtube' });
}

export async function suggestYouTubeTitle(content: string) {
  return callAiSuggest({ action: 'suggest_youtube_title', content, platform: 'youtube' });
}

// ═══════════════════════════════════════════
// TWITTER / X
// ═══════════════════════════════════════════

export async function suggestTweet(content: string) {
  return callAiSuggest({ action: 'improve_tweet', content, platform: 'twitter' });
}

export async function suggestXHashtags(content: string) {
  return callAiSuggest({ action: 'suggest_x_hashtags', content, platform: 'twitter' });
}

// ═══════════════════════════════════════════
// THREADS
// ═══════════════════════════════════════════

export async function improveThread(content: string) {
  return callAiSuggest({ action: 'improve_thread', content, platform: 'threads' });
}

export async function suggestTopic(content: string) {
  return callAiSuggest({ action: 'suggest_topic', content, platform: 'threads' });
}

// ═══════════════════════════════════════════
// FACEBOOK
// ═══════════════════════════════════════════

export async function improveFacebookPost(content: string) {
  return callAiSuggest({ action: 'improve_facebook', content, platform: 'facebook' });
}

export async function suggestFacebookHashtags(content: string) {
  return callAiSuggest({ action: 'suggest_facebook_hashtags', content, platform: 'facebook' });
}

// ═══════════════════════════════════════════
// CROSS-PLATFORM
// ═══════════════════════════════════════════

export async function suggestBestTimes(content: string, platform?: string) {
  return callAiSuggest({ action: 'best_posting_times', content, platform: platform || 'all' });
}

export async function crossPlatformStrategy(content: string) {
  return callAiSuggest({ action: 'cross_platform_strategy', content, platform: 'all' });
}
