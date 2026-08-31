import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const GRAPH_API = 'https://graph.facebook.com/v19.0';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action } = body;
    let result: unknown;

    switch (action) {
      case 'publish_facebook_video': {
        const { pageId, pageAccessToken, videoUrl, title, description } = body;
        if (!pageId || !pageAccessToken || !videoUrl) {
          throw new Error('pageId, pageAccessToken, and videoUrl are required');
        }

        const params = new URLSearchParams({
          file_url: videoUrl,
          access_token: pageAccessToken,
        });
        if (title) params.set('title', title);
        if (description) params.set('description', description);

        const res = await fetch(`${GRAPH_API}/${pageId}/videos`, {
          method: 'POST',
          body: params,
        });
        result = await res.json();
        if (!res.ok) throw new Error(`Facebook video upload error [${res.status}]: ${JSON.stringify(result)}`);
        break;
      }

      case 'publish_instagram_reel': {
        const { igAccountId, pageAccessToken, videoUrl, caption } = body;
        if (!igAccountId || !pageAccessToken || !videoUrl) {
          throw new Error('igAccountId, pageAccessToken, and videoUrl are required');
        }

        // Step 1: Create media container
        const containerParams = new URLSearchParams({
          video_url: videoUrl,
          media_type: 'REELS',
          access_token: pageAccessToken,
        });
        if (caption) containerParams.set('caption', caption);

        console.log('Creating IG container...');
        const containerRes = await fetch(`${GRAPH_API}/${igAccountId}/media`, {
          method: 'POST',
          body: containerParams,
        });
        const container = await containerRes.json();
        if (!containerRes.ok) throw new Error(`IG container error [${containerRes.status}]: ${JSON.stringify(container)}`);

        const containerId = container.id;
        console.log('Container created:', containerId);

        // Step 2: Poll for processing (max ~50 seconds)
        let status = 'IN_PROGRESS';
        for (let i = 0; i < 10; i++) {
          await new Promise(r => setTimeout(r, 5000));
          const statusRes = await fetch(
            `${GRAPH_API}/${containerId}?fields=status_code&access_token=${pageAccessToken}`
          );
          const statusData = await statusRes.json();
          status = statusData.status_code;
          console.log(`Poll ${i + 1}: status=${status}`);
          if (status === 'FINISHED') break;
          if (status === 'ERROR') throw new Error('Instagram video processing failed');
        }

        if (status !== 'FINISHED') {
          throw new Error('Instagram video processing timed out. The video may still be processing — try again later.');
        }

        // Step 3: Publish
        console.log('Publishing IG reel...');
        const publishRes = await fetch(`${GRAPH_API}/${igAccountId}/media_publish`, {
          method: 'POST',
          body: new URLSearchParams({
            creation_id: containerId,
            access_token: pageAccessToken,
          }),
        });
        result = await publishRes.json();
        if (!publishRes.ok) throw new Error(`IG publish error [${publishRes.status}]: ${JSON.stringify(result)}`);
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify({ success: true, data: result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('Upload Video Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
