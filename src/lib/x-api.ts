import { supabase } from "@/integrations/supabase/client";

interface XApiResponse {
  success: boolean;
  data?: any;
  error?: string;
  mediaId?: string;
}

async function callXApi(body: Record<string, any>): Promise<XApiResponse> {
  try {
    const { data, error } = await supabase.functions.invoke('x-api', { body });
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
    return data as XApiResponse;
  } catch (err: any) {
    return { success: false, error: err.message || 'Unknown error' };
  }
}

export async function getXAccountCount() {
  return callXApi({ action: 'get_accounts' });
}

export async function verifyXAccount(accountIndex: number) {
  return callXApi({ action: 'verify_account', accountIndex });
}

export async function uploadAndTweet(accountIndex: number, videoPath: string, tweetText: string) {
  return callXApi({ action: 'upload_and_tweet', accountIndex, videoPath, tweetText });
}

export async function tweetTextOnly(accountIndex: number, tweetText: string) {
  return callXApi({ action: 'tweet_text_only', accountIndex, tweetText });
}
