import { supabase } from "@/integrations/supabase/client";

interface PublishResult {
  success: boolean;
  data?: any;
  error?: string;
}

async function invokeWithErrorHandling(functionName: string, body: Record<string, any>): Promise<PublishResult> {
  try {
    const { data, error } = await supabase.functions.invoke(functionName, { body });
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
    return data as PublishResult;
  } catch (err: any) {
    return { success: false, error: err.message || 'Unknown error' };
  }
}

export async function publishToFacebook(
  pageId: string,
  pageAccessToken: string,
  videoUrl: string,
  title: string,
  description: string
): Promise<PublishResult> {
  return invokeWithErrorHandling('upload-video', {
    action: 'publish_facebook_video',
    pageId,
    pageAccessToken,
    videoUrl,
    title,
    description,
  });
}

export async function publishToInstagram(
  igAccountId: string,
  pageAccessToken: string,
  videoUrl: string,
  caption: string
): Promise<PublishResult> {
  return invokeWithErrorHandling('upload-video', {
    action: 'publish_instagram_reel',
    igAccountId,
    pageAccessToken,
    videoUrl,
    caption,
  });
}

export async function uploadToYouTube(
  storagePath: string,
  title: string,
  description: string,
  tags: string[],
  privacy: string
): Promise<PublishResult> {
  return invokeWithErrorHandling('youtube-upload', {
    storagePath,
    title,
    description,
    tags,
    privacy,
  });
}
