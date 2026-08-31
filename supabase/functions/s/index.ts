// Self-hosted short URL redirector with click analytics.
// GET /s/:code  -> 302 redirects to short_urls.original_url and increments counters.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    // Strip the function name prefix from the pathname.
    // Path looks like "/s/<code>" or "/functions/v1/s/<code>"
    const segments = url.pathname.split('/').filter(Boolean);
    const sIdx = segments.indexOf('s');
    const code = sIdx >= 0 ? segments[sIdx + 1] : segments[segments.length - 1];

    if (!code || code === 's') {
      return new Response('Missing code', { status: 400, headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: row, error } = await supabase
      .from('short_urls')
      .select('id, original_url, click_count')
      .eq('code', code)
      .maybeSingle();

    if (error || !row) {
      return new Response('Short link not found', { status: 404, headers: corsHeaders });
    }

    // Fire-and-forget click logging (do not block redirect).
    queueMicrotask(async () => {
      try {
        await supabase.from('short_urls').update({ click_count: (row.click_count || 0) + 1 }).eq('id', row.id);
        const today = new Date().toISOString().slice(0, 10);
        const { data: existing } = await supabase
          .from('short_url_clicks')
          .select('id, count')
          .eq('code', code)
          .eq('day', today)
          .maybeSingle();
        if (existing) {
          await supabase.from('short_url_clicks').update({ count: existing.count + 1 }).eq('id', existing.id);
        } else {
          await supabase.from('short_url_clicks').insert({ code, day: today, count: 1 });
        }
      } catch (e) {
        console.error('click log failed', e);
      }
    });

    return new Response(null, {
      status: 302,
      headers: { ...corsHeaders, Location: row.original_url, 'Cache-Control': 'no-store' },
    });
  } catch (e) {
    console.error('s redirect error', e);
    return new Response('Server error', { status: 500, headers: corsHeaders });
  }
});
