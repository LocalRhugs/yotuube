import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID');
    const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      throw new Error('Google OAuth credentials not configured');
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    const { storagePath, title, description, tags, privacy } = await req.json();
    if (!storagePath) throw new Error('storagePath is required');

    // 1. Get YouTube token
    const { data: tokenRow } = await supabase
      .from('youtube_tokens')
      .select('*')
      .limit(1)
      .maybeSingle();

    if (!tokenRow) throw new Error('No YouTube account connected. Connect in Settings first.');

    let accessToken = tokenRow.access_token;
    const expiry = new Date(tokenRow.token_expiry);

    // Refresh if needed
    if (expiry < new Date(Date.now() + 60000)) {
      const refreshRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          refresh_token: tokenRow.refresh_token,
          grant_type: 'refresh_token',
        }),
      });
      const refreshData = await refreshRes.json();
      if (!refreshRes.ok) throw new Error(`Token refresh failed: ${JSON.stringify(refreshData)}`);
      accessToken = refreshData.access_token;
      await supabase.from('youtube_tokens').update({
        access_token: accessToken,
        token_expiry: new Date(Date.now() + refreshData.expires_in * 1000).toISOString(),
      }).eq('id', tokenRow.id);
    }

    // 2. Download video from storage
    console.log('Downloading video from storage:', storagePath);
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('videos')
      .download(storagePath);

    if (downloadError || !fileData) {
      throw new Error(`Failed to download video: ${downloadError?.message || 'Unknown error'}`);
    }

    console.log('Video downloaded, size:', fileData.size);

    // 3. Initiate resumable upload to YouTube
    const metadata = {
      snippet: {
        title: title || 'Untitled Video',
        description: description || '',
        tags: tags || [],
        categoryId: '22', // People & Blogs
      },
      status: {
        privacyStatus: privacy || 'private',
      },
    };

    console.log('Initiating YouTube upload...');
    const initRes = await fetch(
      'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-Upload-Content-Type': 'video/mp4',
          'X-Upload-Content-Length': fileData.size.toString(),
        },
        body: JSON.stringify(metadata),
      }
    );

    if (!initRes.ok) {
      const errText = await initRes.text();
      throw new Error(`YouTube upload init failed [${initRes.status}]: ${errText}`);
    }

    const uploadUrl = initRes.headers.get('Location');
    if (!uploadUrl) throw new Error('No upload URL returned from YouTube');

    // 4. Upload the video data
    console.log('Uploading video to YouTube...');
    const arrayBuffer = await fileData.arrayBuffer();
    const uploadRes = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Length': fileData.size.toString(),
      },
      body: arrayBuffer,
    });

    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      throw new Error(`YouTube upload failed [${uploadRes.status}]: ${errText}`);
    }

    const result = await uploadRes.json();
    console.log('YouTube upload complete:', result.id);

    return new Response(JSON.stringify({ success: true, data: result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('YouTube Upload Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
