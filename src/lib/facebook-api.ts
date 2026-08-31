import { supabase } from "@/integrations/supabase/client";

interface FacebookApiResponse {
  success: boolean;
  data?: any;
  error?: string;
}

export async function callFacebookApi(action: string, params: Record<string, string> = {}): Promise<FacebookApiResponse> {
  try {
    const { data, error } = await supabase.functions.invoke('facebook-api', {
      body: { action, ...params },
    });

    if (error) {
      const context = (error as any)?.context;
      if (context && typeof context === 'object') {
        try {
          const body = await context.json?.();
          if (body?.error) {
            return { success: false, error: body.error };
          }
        } catch {}
      }
      console.error('Edge function error:', error);
      return { success: false, error: error.message };
    }

    return data as FacebookApiResponse;
  } catch (err: any) {
    console.error('Facebook API call failed:', err);
    return { success: false, error: err.message || 'Unknown error' };
  }
}

export async function getFacebookPages() {
  return callFacebookApi('get_pages');
}

export async function getPageVideos(pageId: string, pageAccessToken?: string) {
  return callFacebookApi('get_page_videos', { pageId, ...(pageAccessToken ? { pageAccessToken } : {}) });
}

export async function getPageInsights(pageId: string, pageAccessToken?: string) {
  return callFacebookApi('get_page_insights', { pageId, ...(pageAccessToken ? { pageAccessToken } : {}) });
}

export async function getInstagramAccount(pageId: string, pageAccessToken?: string) {
  return callFacebookApi('get_instagram_account', { pageId, ...(pageAccessToken ? { pageAccessToken } : {}) });
}

export async function getInstagramMedia(igAccountId: string, pageAccessToken?: string) {
  return callFacebookApi('get_instagram_media', { igAccountId, ...(pageAccessToken ? { pageAccessToken } : {}) });
}

export async function getUserInfo() {
  return callFacebookApi('get_user_info');
}

export async function postFacebookComment(objectId: string, message: string, pageAccessToken?: string) {
  return callFacebookApi('post_facebook_comment', { objectId, message, ...(pageAccessToken ? { pageAccessToken } : {}) });
}

export async function postInstagramComment(mediaId: string, message: string, pageAccessToken?: string) {
  return callFacebookApi('post_instagram_comment', { mediaId, message, ...(pageAccessToken ? { pageAccessToken } : {}) });
}

export async function deleteInstagramMedia(mediaId: string, pageAccessToken?: string) {
  return callFacebookApi('delete_instagram_media', { mediaId, ...(pageAccessToken ? { pageAccessToken } : {}) });
}
