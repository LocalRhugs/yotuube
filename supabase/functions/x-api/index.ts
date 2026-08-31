import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

function percentEncode(str: string): string {
  return encodeURIComponent(str)
    .replace(/!/g, '%21').replace(/\*/g, '%2A')
    .replace(/'/g, '%27').replace(/\(/g, '%28').replace(/\)/g, '%29');
}

function generateNonce(): string {
  return crypto.randomUUID().replace(/-/g, '');
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

async function createOAuthSignature(
  method: string, url: string, params: Record<string, string>,
  consumerSecret: string, tokenSecret: string
): Promise<string> {
  const sorted = Object.keys(params).sort()
    .map(k => `${percentEncode(k)}=${percentEncode(params[k])}`).join('&');
  const baseString = `${method.toUpperCase()}&${percentEncode(url)}&${percentEncode(sorted)}`;
  const signingKey = `${percentEncode(consumerSecret)}&${percentEncode(tokenSecret)}`;


  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(signingKey),
    { name: "HMAC", hash: "SHA-1" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(baseString));
  return arrayBufferToBase64(sig);
}

async function createOAuthHeader(
  method: string, url: string,
  consumerKey: string, consumerSecret: string,
  accessToken: string, tokenSecret: string,
  extraParams: Record<string, string> = {}
): Promise<string> {
  const oauthParams: Record<string, string> = {
    oauth_consumer_key: consumerKey,
    oauth_nonce: generateNonce(),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: accessToken,
    oauth_version: '1.0',
  };

  const allParams = { ...oauthParams, ...extraParams };
  const signature = await createOAuthSignature(method, url, allParams, consumerSecret, tokenSecret);
  oauthParams['oauth_signature'] = signature;

  const header = Object.keys(oauthParams).sort()
    .map(k => `${percentEncode(k)}="${percentEncode(oauthParams[k])}"`).join(', ');
  return `OAuth ${header}`;
}

function getCredentials(index: number) {
  const keys = (Deno.env.get('X_CONSUMER_KEYS') || '').split('|');
  const secrets = (Deno.env.get('X_CONSUMER_SECRETS') || '').split('|');
  const tokens = (Deno.env.get('X_ACCESS_TOKENS') || '').split('|');
  const tokenSecrets = (Deno.env.get('X_ACCESS_TOKEN_SECRETS') || '').split('|');

  if (index >= keys.length || !keys[index]) {
    throw new Error(`X account ${index + 1} not configured. Available: ${keys.length} accounts.`);
  }

  return {
    consumerKey: keys[index].trim(),
    consumerSecret: secrets[index]?.trim() || '',
    accessToken: tokens[index]?.trim() || '',
    tokenSecret: tokenSecrets[index]?.trim() || '',
  };
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { action, accountIndex = 0 } = body;

    switch (action) {
      case 'get_accounts': {
        const keys = (Deno.env.get('X_CONSUMER_KEYS') || '').split('|').filter(k => k.trim());
        return json({ success: true, count: keys.length });
      }

      case 'verify_account': {
        const c = getCredentials(accountIndex);
        const url = 'https://api.x.com/1.1/account/verify_credentials.json';
        const auth = await createOAuthHeader('GET', url, c.consumerKey, c.consumerSecret, c.accessToken, c.tokenSecret);
        const res = await fetch(url, { headers: { Authorization: auth } });
        const text = await res.text();
        let data;
        try { data = JSON.parse(text); } catch { data = { raw: text }; }
        if (res.ok) {
          return json({ success: true, data: { data: { username: data.screen_name, name: data.name, id: data.id_str } } });
        }
        return json({ success: false, data });
      }

      case 'upload_and_tweet': {
        const { videoPath, tweetText } = body;
        const c = getCredentials(accountIndex);

        // Download video from Supabase storage
        const supabase = createClient(
          Deno.env.get('SUPABASE_URL')!,
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        );
        const { data: videoData, error: dlError } = await supabase.storage.from('videos').download(videoPath);
        if (dlError) throw new Error(`Download failed: ${dlError.message}`);

        const videoBytes = new Uint8Array(await videoData.arrayBuffer());
        const totalBytes = videoBytes.length;
        const uploadUrl = 'https://upload.twitter.com/1.1/media/upload.json';

        // INIT
        const initParams = {
          command: 'INIT',
          total_bytes: totalBytes.toString(),
          media_type: 'video/mp4',
          media_category: 'tweet_video',
        };
        const initAuth = await createOAuthHeader('POST', uploadUrl, c.consumerKey, c.consumerSecret, c.accessToken, c.tokenSecret, initParams);
        const initRes = await fetch(uploadUrl, {
          method: 'POST',
          headers: { Authorization: initAuth, 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams(initParams),
        });
        const initData = await initRes.json();
        if (!initRes.ok) throw new Error(`INIT failed: ${JSON.stringify(initData)}`);
        const mediaId = initData.media_id_string;
        console.log(`Media INIT success: ${mediaId}`);

        // APPEND chunks (5MB each)
        const CHUNK_SIZE = 5 * 1024 * 1024;
        let segmentIndex = 0;
        for (let offset = 0; offset < totalBytes; offset += CHUNK_SIZE) {
          const chunk = videoBytes.slice(offset, Math.min(offset + CHUNK_SIZE, totalBytes));
          const formData = new FormData();
          formData.append('command', 'APPEND');
          formData.append('media_id', mediaId);
          formData.append('segment_index', segmentIndex.toString());
          formData.append('media', new Blob([chunk], { type: 'application/octet-stream' }), 'video.mp4');

          // For multipart, DON'T include body params in OAuth signature
          const appendAuth = await createOAuthHeader('POST', uploadUrl, c.consumerKey, c.consumerSecret, c.accessToken, c.tokenSecret);
          const appendRes = await fetch(uploadUrl, {
            method: 'POST',
            headers: { Authorization: appendAuth },
            body: formData,
          });
          if (!appendRes.ok) {
            const errText = await appendRes.text();
            throw new Error(`APPEND segment ${segmentIndex} failed: ${errText}`);
          }
          await appendRes.text(); // consume body
          console.log(`APPEND segment ${segmentIndex} done`);
          segmentIndex++;
        }

        // FINALIZE
        const finalizeParams = { command: 'FINALIZE', media_id: mediaId };
        const finalizeAuth = await createOAuthHeader('POST', uploadUrl, c.consumerKey, c.consumerSecret, c.accessToken, c.tokenSecret, finalizeParams);
        const finalizeRes = await fetch(uploadUrl, {
          method: 'POST',
          headers: { Authorization: finalizeAuth, 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams(finalizeParams),
        });
        const finalizeData = await finalizeRes.json();
        if (!finalizeRes.ok) throw new Error(`FINALIZE failed: ${JSON.stringify(finalizeData)}`);
        console.log('FINALIZE done:', JSON.stringify(finalizeData));

        // Wait for processing
        if (finalizeData.processing_info) {
          let info = finalizeData.processing_info;
          while (info && info.state !== 'succeeded' && info.state !== 'failed') {
            const wait = (info.check_after_secs || 5) * 1000;
            await new Promise(r => setTimeout(r, wait));

            const statusParams = { command: 'STATUS', media_id: mediaId };
            const statusAuth = await createOAuthHeader('GET', uploadUrl, c.consumerKey, c.consumerSecret, c.accessToken, c.tokenSecret, statusParams);
            const statusRes = await fetch(`${uploadUrl}?command=STATUS&media_id=${mediaId}`, {
              headers: { Authorization: statusAuth },
            });
            const statusData = await statusRes.json();
            info = statusData.processing_info;
            console.log('Processing status:', info?.state, info?.progress_percent);
          }
          if (info?.state === 'failed') {
            throw new Error(`Video processing failed: ${JSON.stringify(info.error)}`);
          }
        }

        // Create tweet
        const tweetUrl = 'https://api.x.com/2/tweets';
        const tweetAuth = await createOAuthHeader('POST', tweetUrl, c.consumerKey, c.consumerSecret, c.accessToken, c.tokenSecret);
        const tweetRes = await fetch(tweetUrl, {
          method: 'POST',
          headers: { Authorization: tweetAuth, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: tweetText || '',
            media: { media_ids: [mediaId] },
          }),
        });
        const tweetData = await tweetRes.json();
        if (!tweetRes.ok) throw new Error(`Tweet failed: ${JSON.stringify(tweetData)}`);

        return json({ success: true, data: tweetData, mediaId });
      }

      case 'tweet_text_only': {
        const c = getCredentials(accountIndex);
        const tweetUrl = 'https://api.x.com/2/tweets';
        const tweetAuth = await createOAuthHeader('POST', tweetUrl, c.consumerKey, c.consumerSecret, c.accessToken, c.tokenSecret);
        const tweetRes = await fetch(tweetUrl, {
          method: 'POST',
          headers: { Authorization: tweetAuth, 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: body.tweetText }),
        });
        const tweetData = await tweetRes.json();
        return json({ success: tweetRes.ok, data: tweetData });
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error: unknown) {
    console.error('X API Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return json({ success: false, error: message }, 500);
  }
});
