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
    const FACEBOOK_API_KEY = Deno.env.get('FACEBOOK_API_KEY');
    if (!FACEBOOK_API_KEY) {
      throw new Error('FACEBOOK_API_KEY is not configured');
    }

    const body = await req.json();
    const { action, pageId, igAccountId, pageAccessToken } = body;

    // For page-specific operations, use the page access token if provided, otherwise fall back to user token
    const tokenForPageOps = pageAccessToken || FACEBOOK_API_KEY;

    let data: unknown;

    switch (action) {
      case 'get_pages': {
        // Always use user token to list pages
        const res = await fetch(
          `${GRAPH_API}/me/accounts?fields=id,name,access_token,picture,fan_count,category&access_token=${FACEBOOK_API_KEY}`
        );
        data = await res.json();
        if (!res.ok) throw new Error(`Facebook API error [${res.status}]: ${JSON.stringify(data)}`);
        break;
      }

      case 'get_page_videos': {
        if (!pageId) throw new Error('pageId is required');
        // Use page access token for page-specific content
        const res = await fetch(
          `${GRAPH_API}/${pageId}/videos?fields=id,title,description,length,created_time,views,likes.summary(true),comments.summary(true),thumbnails&limit=25&access_token=${tokenForPageOps}`
        );
        data = await res.json();
        if (!res.ok) throw new Error(`Facebook API error [${res.status}]: ${JSON.stringify(data)}`);
        break;
      }

      case 'get_page_insights': {
        if (!pageId) throw new Error('pageId is required');
        const res = await fetch(
          `${GRAPH_API}/${pageId}?fields=id,name,fan_count,followers_count,engagement,picture&access_token=${tokenForPageOps}`
        );
        data = await res.json();
        if (!res.ok) throw new Error(`Facebook API error [${res.status}]: ${JSON.stringify(data)}`);
        break;
      }

      case 'get_instagram_account': {
        if (!pageId) throw new Error('pageId is required');
        // Query both instagram_business_account AND connected_instagram_account
        // to cover both Business and Professional/Creator IG accounts
        const res = await fetch(
          `${GRAPH_API}/${pageId}?fields=instagram_business_account{id,name,username,profile_picture_url,followers_count,media_count},connected_instagram_account{id,name,username,profile_picture_url,followers_count,media_count}&access_token=${tokenForPageOps}`
        );
        const rawData = await res.json();
        if (!res.ok) throw new Error(`Facebook API error [${res.status}]: ${JSON.stringify(rawData)}`);
        
        // If no instagram_business_account, fall back to connected_instagram_account
        if (!rawData.instagram_business_account && rawData.connected_instagram_account) {
          rawData.instagram_business_account = rawData.connected_instagram_account;
        }
        data = rawData;
        break;
      }

      case 'get_instagram_media': {
        if (!igAccountId) throw new Error('igAccountId is required');
        const res = await fetch(
          `${GRAPH_API}/${igAccountId}/media?fields=id,caption,media_type,media_url,thumbnail_url,timestamp,like_count,comments_count,permalink&limit=25&access_token=${tokenForPageOps}`
        );
        data = await res.json();
        if (!res.ok) throw new Error(`Facebook API error [${res.status}]: ${JSON.stringify(data)}`);
        break;
      }

      case 'post_facebook_comment': {
        if (!body.objectId || !body.message) throw new Error('objectId and message are required');
        const res = await fetch(
          `${GRAPH_API}/${body.objectId}/comments?access_token=${encodeURIComponent(tokenForPageOps)}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: body.message }),
          }
        );
        data = await res.json();
        if (!res.ok) throw new Error(`Facebook comment error [${res.status}]: ${JSON.stringify(data)}`);
        break;
      }

      case 'post_instagram_comment': {
        if (!body.mediaId || !body.message) throw new Error('mediaId and message are required');
        const res = await fetch(
          `${GRAPH_API}/${body.mediaId}/comments?access_token=${encodeURIComponent(tokenForPageOps)}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: body.message }),
          }
        );
        data = await res.json();
        if (!res.ok) throw new Error(`Instagram comment error [${res.status}]: ${JSON.stringify(data)}`);
        break;
      }

      case 'get_user_info': {
        const res = await fetch(
          `${GRAPH_API}/me?fields=id,name,email&access_token=${FACEBOOK_API_KEY}`
        );
        data = await res.json();
        if (!res.ok) throw new Error(`Facebook API error [${res.status}]: ${JSON.stringify(data)}`);
        break;
      }

      case 'delete_instagram_media': {
        if (!body.mediaId) throw new Error('mediaId is required');
        const res = await fetch(
          `${GRAPH_API}/${body.mediaId}?access_token=${encodeURIComponent(tokenForPageOps)}`,
          { method: 'DELETE' }
        );
        if (res.status === 204 || res.ok) {
          data = { success: true };
        } else {
          const errData = await res.json().catch(() => ({}));
          throw new Error(`Delete error [${res.status}]: ${JSON.stringify(errData)}`);
        }
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify({ success: true, data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('Facebook API Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
