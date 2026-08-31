import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get pending posts that are due
    const { data: posts, error } = await supabase
      .from('scheduled_posts')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_at', new Date().toISOString());

    if (error) throw error;
    if (!posts || posts.length === 0) {
      return new Response(JSON.stringify({ success: true, processed: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Processing ${posts.length} scheduled posts`);

    for (const post of posts) {
      // Mark as processing
      await supabase.from('scheduled_posts').update({ status: 'processing' }).eq('id', post.id);

      try {
        const results: any[] = [];
        const accountIndices: number[] = post.account_indices || [];

        for (const idx of accountIndices) {
          try {
            // Call the x-api function to post
            const { data: tweetResult, error: fnError } = await supabase.functions.invoke('x-api', {
              body: post.video_path
                ? { action: 'upload_and_tweet', accountIndex: idx, videoPath: post.video_path, tweetText: post.tweet_text || '' }
                : { action: 'tweet_text_only', accountIndex: idx, tweetText: post.tweet_text },
            });

            if (fnError) {
              results.push({ accountIndex: idx, success: false, error: fnError.message });
            } else {
              results.push({ accountIndex: idx, success: tweetResult?.success, error: tweetResult?.error });
            }
          } catch (err: any) {
            results.push({ accountIndex: idx, success: false, error: err.message });
          }
        }

        await supabase.from('scheduled_posts').update({
          status: 'completed',
          results: results,
        }).eq('id', post.id);

        console.log(`Post ${post.id} completed:`, results);
      } catch (err: any) {
        await supabase.from('scheduled_posts').update({
          status: 'failed',
          results: [{ error: err.message }],
        }).eq('id', post.id);
      }
    }

    return new Response(JSON.stringify({ success: true, processed: posts.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Scheduler error:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
