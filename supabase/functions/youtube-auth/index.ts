import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

async function refreshToken(
  supabase: any,
  row: any,
  fallbackClientId: string,
  fallbackClientSecret: string,
  clientPairsMap?: Map<string, string>
) {
  const expiry = new Date(row.token_expiry);
  if (expiry >= new Date(Date.now() + 60000)) return row.access_token;

  // Refresh tokens are bound to the client_id that minted them.
  // Use the stored client_id if present; fall back to the default for legacy rows.
  const clientId = row.client_id || fallbackClientId;
  const clientSecret = (clientPairsMap && clientPairsMap.get(clientId)) || fallbackClientSecret;

  const refreshRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: row.refresh_token,
      grant_type: 'refresh_token',
    }),
  });
  const refreshData = await refreshRes.json();
  if (!refreshRes.ok) throw new Error(`Token refresh failed: ${refreshData.error_description || refreshData.error}`);

  const newToken = refreshData.access_token;
  await supabase.from('youtube_tokens').update({
    access_token: newToken,
    token_expiry: new Date(Date.now() + refreshData.expires_in * 1000).toISOString(),
  }).eq('id', row.id);

  return newToken;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const ok = (data: unknown) => new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  const err = (msg: string, status = 500) => new Response(JSON.stringify({ success: false, error: msg }), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  try {
    const DEFAULT_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID')!;
    const DEFAULT_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET')!;
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const FACEBOOK_API_KEY = Deno.env.get('FACEBOOK_API_KEY');
    const YOUTUBE_API_KEY = Deno.env.get('YOUTUBE_API_KEY');
    const GRAPH_API = 'https://graph.facebook.com/v19.0';

    // Parse GOOGLE_CLIENT_PAIRS: "clientId1:secret1|clientId2:secret2|..."
    const clientPairsRaw = Deno.env.get('GOOGLE_CLIENT_PAIRS') || '';
    const clientPairsMap = new Map<string, string>();
    if (clientPairsRaw) {
      for (const pair of clientPairsRaw.split('|')) {
        const colonIdx = pair.indexOf(':');
        if (colonIdx > 0) {
          clientPairsMap.set(pair.substring(0, colonIdx).trim(), pair.substring(colonIdx + 1).trim());
        }
      }
    }
    // Always include the default pair
    if (DEFAULT_CLIENT_ID && DEFAULT_CLIENT_SECRET) {
      clientPairsMap.set(DEFAULT_CLIENT_ID, DEFAULT_CLIENT_SECRET);
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const body = await req.json();
    const { action, code, redirectUri, channelTokenId, videoId, title, description, privacyStatus,
      igAccountId, pageAccessToken, commentId, message, query: searchQuery, clientId: customClientId } = body;

    // Resolve client ID and its matching secret
    const GOOGLE_CLIENT_ID = customClientId || DEFAULT_CLIENT_ID;
    const GOOGLE_CLIENT_SECRET = clientPairsMap.get(GOOGLE_CLIENT_ID) || DEFAULT_CLIENT_SECRET;

    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      return err('Google OAuth credentials not configured');
    }

    switch (action) {

      case 'validate': {
        const issues: string[] = [];
        if (!GOOGLE_CLIENT_ID?.endsWith('.apps.googleusercontent.com')) issues.push('GOOGLE_CLIENT_ID format appears invalid');
        if (!GOOGLE_CLIENT_SECRET) issues.push('GOOGLE_CLIENT_SECRET is not set');
        if (redirectUri && !redirectUri.endsWith('/youtube-callback')) issues.push('Redirect URI path should end with "/youtube-callback"');
        return ok({ success: issues.length === 0, data: { valid: issues.length === 0, issues, clientIdConfigured: !!GOOGLE_CLIENT_ID, redirectUri } });
      }

      case 'get_auth_url': {
        if (!redirectUri) return err('redirectUri is required');
        const scopes = [
          'https://www.googleapis.com/auth/youtube.upload',
          'https://www.googleapis.com/auth/youtube.readonly',
          'https://www.googleapis.com/auth/youtube',
          'https://www.googleapis.com/auth/youtube.force-ssl',
        ].join(' ');
        const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(GOOGLE_CLIENT_ID)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scopes)}&access_type=offline&prompt=consent`;
        return ok({ success: true, data: { url } });
      }

      case 'exchange_code': {
        if (!code || !redirectUri) return err('code and redirectUri are required');
        const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ code, client_id: GOOGLE_CLIENT_ID, client_secret: GOOGLE_CLIENT_SECRET, redirect_uri: redirectUri, grant_type: 'authorization_code' }),
        });
        const tokens = await tokenRes.json();
        if (!tokenRes.ok) {
          const e = tokens.error;
          const msg = e === 'invalid_client' ? 'Invalid OAuth credentials.' : e === 'redirect_uri_mismatch' ? `Redirect URI mismatch. Add "${redirectUri}" to Google Cloud Console.` : e === 'invalid_grant' ? 'Authorization code expired. Try again.' : `Google OAuth error: ${e}`;
          return err(msg);
        }

        const channelRes = await fetch('https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true', { headers: { Authorization: `Bearer ${tokens.access_token}` } });
        const channelData = await channelRes.json();
        const channel = channelData.items?.[0];

        if (channel?.id) {
          const { data: existing } = await supabase.from('youtube_tokens').select('id, refresh_token').eq('channel_id', channel.id).maybeSingle();
          if (existing) {
            await supabase.from('youtube_tokens').update({ access_token: tokens.access_token, refresh_token: tokens.refresh_token || existing.refresh_token, token_expiry: new Date(Date.now() + tokens.expires_in * 1000).toISOString(), channel_title: channel.snippet?.title || null, client_id: GOOGLE_CLIENT_ID }).eq('id', existing.id);
            return ok({ success: true, data: { channelId: channel.id, channelTitle: channel.snippet?.title, updated: true } });
          }
        }

        const { error: insertError } = await supabase.from('youtube_tokens').insert({ channel_id: channel?.id || null, channel_title: channel?.snippet?.title || null, access_token: tokens.access_token, refresh_token: tokens.refresh_token, token_expiry: new Date(Date.now() + tokens.expires_in * 1000).toISOString(), client_id: GOOGLE_CLIENT_ID });
        if (insertError) return err(`Failed to store tokens: ${insertError.message}`);
        return ok({ success: true, data: { channelId: channel?.id, channelTitle: channel?.snippet?.title } });
      }

      case 'get_status': {
        const { data: rows } = await supabase.from('youtube_tokens').select('id, channel_id, channel_title').limit(10);
        const channels = rows || [];
        return ok({ success: true, data: { connected: channels.length > 0, channelCount: channels.length, channels: channels.map((r: any) => ({ id: r.id, channelId: r.channel_id, channelTitle: r.channel_title })), channelId: channels[0]?.channel_id, channelTitle: channels[0]?.channel_title } });
      }

      case 'get_channels': {
        const { data: rows } = await supabase.from('youtube_tokens').select('id, channel_id, channel_title, created_at');
        return ok({ success: true, data: { channels: (rows || []).map((r: any) => ({ id: r.id, channelId: r.channel_id, channelTitle: r.channel_title, createdAt: r.created_at })) } });
      }

      case 'get_channel_analytics': {
        // Upgraded from route.ts: channel stats + recent video stats via parallel API calls
        if (!channelTokenId) return err('channelTokenId is required');
        const { data: row } = await supabase.from('youtube_tokens').select('*').eq('id', channelTokenId).maybeSingle();
        if (!row) return err('Channel not found');
        const at = await refreshToken(supabase, row, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, clientPairsMap);

        const [channelRes, searchRes] = await Promise.all([
          fetch(`https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,contentDetails&id=${row.channel_id}`, { headers: { Authorization: `Bearer ${at}` } }),
          fetch(`https://www.googleapis.com/youtube/v3/search?part=id&forMine=true&type=video&order=date&maxResults=10`, { headers: { Authorization: `Bearer ${at}` } }),
        ]);

        const channelData = await channelRes.json();
        const searchData = await searchRes.json();
        const channelItem = channelData.items?.[0];
        const videoIds = (searchData.items || []).map((v: any) => v.id?.videoId).filter(Boolean).join(',');

        let videos: any[] = [];
        if (videoIds) {
          const statsRes = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&id=${videoIds}`, { headers: { Authorization: `Bearer ${at}` } });
          const statsData = await statsRes.json();
          videos = (statsData.items || []).map((v: any) => ({
            id: v.id, title: v.snippet?.title, thumbnail: v.snippet?.thumbnails?.medium?.url || v.snippet?.thumbnails?.default?.url,
            publishedAt: v.snippet?.publishedAt, viewCount: parseInt(v.statistics?.viewCount || '0'),
            likeCount: parseInt(v.statistics?.likeCount || '0'), commentCount: parseInt(v.statistics?.commentCount || '0'),
            duration: v.contentDetails?.duration,
          }));
        }

        return ok({ success: true, data: {
          channel: {
            id: channelItem?.id, title: channelItem?.snippet?.title,
            thumbnail: channelItem?.snippet?.thumbnails?.default?.url,
            subscriberCount: parseInt(channelItem?.statistics?.subscriberCount || '0'),
            videoCount: parseInt(channelItem?.statistics?.videoCount || '0'),
            viewCount: parseInt(channelItem?.statistics?.viewCount || '0'),
          },
          videos,
        }});
      }

      case 'list_videos': {
        // Upgraded from route-3.ts: uses uploads playlist for reliable full video list (50 videos)
        if (!channelTokenId) return err('channelTokenId is required');
        const { data: row } = await supabase.from('youtube_tokens').select('*').eq('id', channelTokenId).maybeSingle();
        if (!row) return err('Channel not found');
        const at = await refreshToken(supabase, row, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, clientPairsMap);

        // Step 1: Get uploads playlist ID
        const channelRes = await fetch(
          `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&mine=true`,
          { headers: { Authorization: `Bearer ${at}` } }
        );

        if (!channelRes.ok) {
          const errorText = await channelRes.text();
          console.error('Channel fetch error:', channelRes.status, errorText);
          return err(`Failed to fetch channel info: ${channelRes.status}`);
        }

        const channelData = await channelRes.json();
        const uploadsPlaylistId = channelData.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;

        if (!uploadsPlaylistId) {
          return ok({ success: true, videos: [] });
        }

        // Step 2: Get videos from uploads playlist (more reliable than search API)
        const playlistRes = await fetch(
          `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${uploadsPlaylistId}&maxResults=50`,
          { headers: { Authorization: `Bearer ${at}` } }
        );

        if (!playlistRes.ok) {
          const errorText = await playlistRes.text();
          console.error('Playlist fetch error:', playlistRes.status, errorText);
          return err(`Failed to fetch videos: ${playlistRes.status}`);
        }

        const playlistData = await playlistRes.json();
        const videoIds = (playlistData.items || [])
          .map((item: any) => item.contentDetails?.videoId)
          .filter(Boolean)
          .join(',');

        if (!videoIds) {
          return ok({ success: true, videos: [] });
        }

        // Step 3: Get full stats + status for each video
        const statsRes = await fetch(
          `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,status&id=${videoIds}`,
          { headers: { Authorization: `Bearer ${at}` } }
        );

        if (!statsRes.ok) {
          const errorText = await statsRes.text();
          console.error('Stats fetch error:', statsRes.status, errorText);
          return err(`Failed to fetch video stats: ${statsRes.status}`);
        }

        const statsData = await statsRes.json();
        const statsMap = new Map((statsData.items || []).map((item: any) => [item.id, item]));

        const videos = (playlistData.items || []).map((item: any) => {
          const vId = item.contentDetails?.videoId;
          const stat = statsMap.get(vId) as any;
          return {
            id: vId,
            title: stat?.snippet?.title || item.snippet?.title || '',
            description: stat?.snippet?.description || '',
            thumbnail: stat?.snippet?.thumbnails?.medium?.url || stat?.snippet?.thumbnails?.default?.url || item.snippet?.thumbnails?.medium?.url || '',
            publishedAt: stat?.snippet?.publishedAt || item.snippet?.publishedAt || '',
            viewCount: stat?.statistics?.viewCount || '0',
            likeCount: stat?.statistics?.likeCount || '0',
            commentCount: stat?.statistics?.commentCount || '0',
            privacyStatus: stat?.status?.privacyStatus || 'public',
          };
        }).filter((v: any) => v.id);

        return ok({ success: true, videos });
      }

      case 'search_videos': {
        // From route-4.ts: search YouTube using API key (no OAuth required for public search)
        if (!searchQuery) return err('query is required');
        const apiKey = YOUTUBE_API_KEY || 'AIzaSyCJ3h3sCWy2Qe3qIWC_hmk6QLPcWHDpe5I';

        const searchRes = await fetch(
          `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(searchQuery)}&type=video&maxResults=20&key=${apiKey}`
        );

        if (!searchRes.ok) {
          const errorText = await searchRes.text();
          return err(`YouTube search failed: ${errorText}`);
        }

        const searchData = await searchRes.json();
        if (searchData.error) return err(searchData.error.message || 'Search failed');

        const videoIds = (searchData.items || []).map((item: any) => item.id?.videoId).filter(Boolean).join(',');

        let statsMap = new Map();
        if (videoIds) {
          const statsRes = await fetch(
            `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${videoIds}&key=${apiKey}`
          );
          if (statsRes.ok) {
            const statsData = await statsRes.json();
            statsMap = new Map((statsData.items || []).map((item: any) => [item.id, item.statistics]));
          }
        }

        const videos = (searchData.items || []).map((item: any) => {
          const stats = statsMap.get(item.id?.videoId);
          return {
            id: item.id?.videoId,
            title: item.snippet?.title,
            thumbnail: item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url,
            channelTitle: item.snippet?.channelTitle,
            channelId: item.snippet?.channelId,
            publishedAt: item.snippet?.publishedAt,
            description: item.snippet?.description,
            viewCount: stats?.viewCount,
            likeCount: stats?.likeCount,
          };
        });

        return ok({ success: true, videos });
      }

      case 'update_video': {
        if (!channelTokenId || !videoId) return err('channelTokenId and videoId are required');
        const { data: row } = await supabase.from('youtube_tokens').select('*').eq('id', channelTokenId).maybeSingle();
        if (!row) return err('Channel not found');
        const at = await refreshToken(supabase, row, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, clientPairsMap);

        const updateRes = await fetch('https://www.googleapis.com/youtube/v3/videos?part=snippet,status', {
          method: 'PUT',
          headers: { Authorization: `Bearer ${at}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: videoId, snippet: { title, description, categoryId: '22' }, status: { privacyStatus } }),
        });
        const updateData = await updateRes.json();
        if (!updateRes.ok) return err(updateData.error?.message || 'Failed to update video');
        return ok({ success: true, video: updateData });
      }

      case 'delete_video': {
        if (!channelTokenId || !videoId) return err('channelTokenId and videoId are required');
        const { data: row } = await supabase.from('youtube_tokens').select('*').eq('id', channelTokenId).maybeSingle();
        if (!row) return err('Channel not found');
        const at = await refreshToken(supabase, row, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, clientPairsMap);

        const delRes = await fetch(`https://www.googleapis.com/youtube/v3/videos?id=${videoId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${at}` } });
        if (!delRes.ok && delRes.status !== 204) {
          const delData = await delRes.json().catch(() => ({}));
          return err(delData.error?.message || 'Failed to delete video');
        }
        return ok({ success: true });
      }

      case 'get_ig_comments': {
        if (!igAccountId) return err('igAccountId is required');
        const token = pageAccessToken || FACEBOOK_API_KEY;
        if (!token) return err('No access token available');

        const mediaRes = await fetch(`${GRAPH_API}/${igAccountId}/media?fields=id,caption,media_type,timestamp&limit=10&access_token=${token}`);
        const mediaData = await mediaRes.json();
        const allComments: any[] = [];

        for (const media of (mediaData.data || []).slice(0, 5)) {
          const commentsRes = await fetch(`${GRAPH_API}/${media.id}/comments?fields=id,text,username,timestamp,from&limit=50&access_token=${token}`);
          const commentsData = await commentsRes.json();
          for (const comment of (commentsData.data || [])) {
            allComments.push({ ...comment, mediaId: media.id, mediaCaption: media.caption });
          }
        }
        return ok({ success: true, comments: allComments });
      }

      case 'post_ig_comment_reply': {
        if (!commentId || !message) return err('commentId and message are required');
        const token = pageAccessToken || FACEBOOK_API_KEY;
        if (!token) return err('No access token available');

        const replyRes = await fetch(`${GRAPH_API}/${commentId}/replies`, {
          method: 'POST',
          body: new URLSearchParams({ message, access_token: token }),
        });
        const replyData = await replyRes.json();
        if (!replyRes.ok) return err(replyData.error?.message || 'Failed to post reply');
        return ok({ success: true, data: replyData });
      }

      case 'get_token': {
        const query = channelTokenId
          ? supabase.from('youtube_tokens').select('*').eq('id', channelTokenId).maybeSingle()
          : supabase.from('youtube_tokens').select('*').limit(1).maybeSingle();
        const { data: row } = await query;
        if (!row) return ok({ success: false, error: 'No YouTube account connected' });
        const at = await refreshToken(supabase, row, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, clientPairsMap);
        return ok({ success: true, data: { accessToken: at, channelId: row.channel_id, channelTitle: row.channel_title } });
      }

      case 'disconnect': {
        if (channelTokenId) {
          await supabase.from('youtube_tokens').delete().eq('id', channelTokenId);
        } else {
          await supabase.from('youtube_tokens').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        }
        return ok({ success: true });
      }

      case 'check_token_health': {
        const { data: rows } = await supabase.from('youtube_tokens').select('*');
        const channels = await Promise.all((rows || []).map(async (row: any) => {
          try {
            await refreshToken(supabase, row, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, clientPairsMap);
            return { id: row.id, channelId: row.channel_id, channelTitle: row.channel_title, healthy: true };
          } catch (e: any) {
            return { id: row.id, channelId: row.channel_id, channelTitle: row.channel_title, healthy: false, error: e?.message || 'refresh failed' };
          }
        }));
        return ok({ success: true, data: { channels, brokenCount: channels.filter(c => !c.healthy).length } });
      }

      default:
        return err(`Unknown action: ${action}`);
    }
  } catch (error: unknown) {
    console.error('YouTube Auth Error:', error);
    return err(error instanceof Error ? error.message : 'Unknown error');
  }
});
