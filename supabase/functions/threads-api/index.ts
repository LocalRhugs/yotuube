import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const THREADS_API = 'https://graph.threads.net/v1.0';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const accessToken = Deno.env.get('THREADS_APP_TOKEN');
    if (!accessToken) {
      throw new Error('THREADS_APP_TOKEN is not configured');
    }

    const body = await req.json();
    const { action } = body;
    let result: unknown;

    switch (action) {
      case 'get_profile': {
        const res = await fetch(
          `${THREADS_API}/me?fields=id,username,name,threads_profile_picture_url,threads_biography&access_token=${accessToken}`
        );
        result = await res.json();
        if (!res.ok) throw new Error(`Threads profile error [${res.status}]: ${JSON.stringify(result)}`);
        break;
      }

      case 'get_threads': {
        const { userId } = body;
        const uid = userId || 'me';
        const res = await fetch(
          `${THREADS_API}/${uid}/threads?fields=id,text,timestamp,media_type,media_url,thumbnail_url,permalink,is_quote_post&limit=25&access_token=${accessToken}`
        );
        result = await res.json();
        if (!res.ok) throw new Error(`Threads fetch error [${res.status}]: ${JSON.stringify(result)}`);
        break;
      }

      case 'post_text': {
        const { text, userId } = body;
        if (!text) throw new Error('text is required');
        const uid = userId || 'me';

        // Step 1: Create container
        const containerRes = await fetch(`${THREADS_API}/${uid}/threads`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            media_type: 'TEXT',
            text,
            access_token: accessToken,
          }),
        });
        const container = await containerRes.json();
        if (!containerRes.ok) throw new Error(`Container error [${containerRes.status}]: ${JSON.stringify(container)}`);

        // Step 2: Publish
        const publishRes = await fetch(`${THREADS_API}/${uid}/threads_publish`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            creation_id: container.id,
            access_token: accessToken,
          }),
        });
        result = await publishRes.json();
        if (!publishRes.ok) throw new Error(`Publish error [${publishRes.status}]: ${JSON.stringify(result)}`);
        break;
      }

      case 'post_image': {
        const { text, imageUrl, userId } = body;
        if (!imageUrl) throw new Error('imageUrl is required');
        const uid = userId || 'me';

        const params: Record<string, string> = {
          media_type: 'IMAGE',
          image_url: imageUrl,
          access_token: accessToken,
        };
        if (text) params.text = text;

        const containerRes = await fetch(`${THREADS_API}/${uid}/threads`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams(params),
        });
        const container = await containerRes.json();
        if (!containerRes.ok) throw new Error(`Container error [${containerRes.status}]: ${JSON.stringify(container)}`);

        const publishRes = await fetch(`${THREADS_API}/${uid}/threads_publish`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            creation_id: container.id,
            access_token: accessToken,
          }),
        });
        result = await publishRes.json();
        if (!publishRes.ok) throw new Error(`Publish error [${publishRes.status}]: ${JSON.stringify(result)}`);
        break;
      }

      case 'post_video': {
        const { text, videoUrl, userId } = body;
        if (!videoUrl) throw new Error('videoUrl is required');
        const uid = userId || 'me';

        const params: Record<string, string> = {
          media_type: 'VIDEO',
          video_url: videoUrl,
          access_token: accessToken,
        };
        if (text) params.text = text;

        const containerRes = await fetch(`${THREADS_API}/${uid}/threads`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams(params),
        });
        const container = await containerRes.json();
        if (!containerRes.ok) throw new Error(`Container error [${containerRes.status}]: ${JSON.stringify(container)}`);

        // Poll for processing
        let status = 'IN_PROGRESS';
        for (let i = 0; i < 12; i++) {
          await new Promise(r => setTimeout(r, 5000));
          const statusRes = await fetch(
            `${THREADS_API}/${container.id}?fields=status&access_token=${accessToken}`
          );
          const statusData = await statusRes.json();
          status = statusData.status;
          console.log(`Poll ${i + 1}: status=${status}`);
          if (status === 'FINISHED') break;
          if (status === 'ERROR') throw new Error('Video processing failed');
        }
        if (status !== 'FINISHED') throw new Error('Video processing timed out');

        const publishRes = await fetch(`${THREADS_API}/${uid}/threads_publish`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            creation_id: container.id,
            access_token: accessToken,
          }),
        });
        result = await publishRes.json();
        if (!publishRes.ok) throw new Error(`Publish error [${publishRes.status}]: ${JSON.stringify(result)}`);
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify({ success: true, data: result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('Threads API Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
