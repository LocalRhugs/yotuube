import { supabase } from "@/integrations/supabase/client";

interface ThreadsApiResponse {
  success: boolean;
  data?: any;
  error?: string;
}

async function callThreadsApi(action: string, params: Record<string, string> = {}): Promise<ThreadsApiResponse> {
  try {
    const { data, error } = await supabase.functions.invoke('threads-api', {
      body: { action, ...params },
    });

    if (error) {
      const context = (error as any)?.context;
      if (context && typeof context === 'object') {
        try {
          const body = await context.json?.();
          if (body?.error) return { success: false, error: body.error };
        } catch {}
      }
      return { success: false, error: error.message };
    }

    return data as ThreadsApiResponse;
  } catch (err: any) {
    return { success: false, error: err.message || 'Unknown error' };
  }
}

export async function getThreadsProfile() {
  return callThreadsApi('get_profile');
}

export async function getThreads(userId?: string) {
  return callThreadsApi('get_threads', userId ? { userId } : {});
}

export async function postThreadText(text: string, userId?: string) {
  return callThreadsApi('post_text', { text, ...(userId ? { userId } : {}) });
}

export async function postThreadImage(text: string, imageUrl: string, userId?: string) {
  return callThreadsApi('post_image', { text, imageUrl, ...(userId ? { userId } : {}) });
}

export async function postThreadVideo(text: string, videoUrl: string, userId?: string) {
  return callThreadsApi('post_video', { text, videoUrl, ...(userId ? { userId } : {}) });
}
