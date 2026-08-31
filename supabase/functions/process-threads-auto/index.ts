import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const THREADS_API = 'https://graph.threads.net/v1.0';

async function generateVariation(originalText: string, topic: string | null, postNumber: number, maxPosts: number, apiKey: string): Promise<string> {
  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are a Threads growth expert. Rewrite the following post to create a UNIQUE variation while keeping the same core message/theme. This is post ${postNumber}/${maxPosts} in an automated series.

Rules:
- Keep the same topic/message but use completely different wording, angle, or hook
- Keep it under 500 chars
- Make it feel natural and human
- Use conversational tone, questions, hot takes, or relatable humor
- DO NOT repeat the exact same text — change the structure, opening, and phrasing
- ${topic ? `Include the topic tag: ${topic}` : 'No topic tag needed'}
- Return ONLY the post text, nothing else. No JSON, no quotes, just the raw text.`
          },
          { role: "user", content: originalText }
        ],
      }),
    });

    if (!response.ok) {
      console.warn(`AI variation failed (${response.status}), using original text`);
      return topic ? `${originalText}\n\n${topic}` : originalText;
    }

    const data = await response.json();
    const variation = data.choices?.[0]?.message?.content?.trim() || originalText;
    return variation;
  } catch (err) {
    console.warn('AI variation error, using original:', err);
    return topic ? `${originalText}\n\n${topic}` : originalText;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const accessToken = Deno.env.get('THREADS_APP_TOKEN');
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    if (!accessToken) throw new Error('THREADS_APP_TOKEN not configured');

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: duePosts, error: fetchError } = await supabase
      .from('threads_auto_posts')
      .select('*')
      .eq('status', 'active')
      .lte('next_post_at', new Date().toISOString());

    if (fetchError) throw fetchError;
    if (!duePosts || duePosts.length === 0) {
      return new Response(JSON.stringify({ success: true, message: 'No posts due' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const results: any[] = [];

    for (const post of duePosts) {
      try {
        const postResults: any[] = [];
        for (let p = 0; p < post.posts_per_interval; p++) {
          // Generate a unique AI variation of the text for each post
          let postText: string;
          if (lovableApiKey) {
            postText = await generateVariation(
              post.text,
              post.topic,
              post.current_count + 1,
              post.max_posts,
              lovableApiKey
            );
          } else {
            postText = post.topic ? `${post.text}\n\n${post.topic}` : post.text;
          }

          let result: any;

          if (post.media_type === 'IMAGE' && post.media_url) {
            const params: Record<string, string> = {
              media_type: 'IMAGE',
              image_url: post.media_url,
              access_token: accessToken,
            };
            if (postText) params.text = postText;

            const containerRes = await fetch(`${THREADS_API}/me/threads`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
              body: new URLSearchParams(params),
            });
            const container = await containerRes.json();
            if (!containerRes.ok) throw new Error(JSON.stringify(container));

            const publishRes = await fetch(`${THREADS_API}/me/threads_publish`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
              body: new URLSearchParams({ creation_id: container.id, access_token: accessToken }),
            });
            result = await publishRes.json();
          } else if (post.media_type === 'VIDEO' && post.media_url) {
            const params: Record<string, string> = {
              media_type: 'VIDEO',
              video_url: post.media_url,
              access_token: accessToken,
            };
            if (postText) params.text = postText;

            const containerRes = await fetch(`${THREADS_API}/me/threads`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
              body: new URLSearchParams(params),
            });
            const container = await containerRes.json();
            if (!containerRes.ok) throw new Error(JSON.stringify(container));

            let status = 'IN_PROGRESS';
            for (let i = 0; i < 12; i++) {
              await new Promise(r => setTimeout(r, 5000));
              const statusRes = await fetch(`${THREADS_API}/${container.id}?fields=status&access_token=${accessToken}`);
              const statusData = await statusRes.json();
              status = statusData.status;
              if (status === 'FINISHED') break;
              if (status === 'ERROR') throw new Error('Video processing failed');
            }
            if (status !== 'FINISHED') throw new Error('Video processing timed out');

            const publishRes = await fetch(`${THREADS_API}/me/threads_publish`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
              body: new URLSearchParams({ creation_id: container.id, access_token: accessToken }),
            });
            result = await publishRes.json();
          } else {
            const containerRes = await fetch(`${THREADS_API}/me/threads`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
              body: new URLSearchParams({
                media_type: 'TEXT',
                text: postText,
                access_token: accessToken,
              }),
            });
            const container = await containerRes.json();
            if (!containerRes.ok) throw new Error(JSON.stringify(container));

            const publishRes = await fetch(`${THREADS_API}/me/threads_publish`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
              body: new URLSearchParams({ creation_id: container.id, access_token: accessToken }),
            });
            result = await publishRes.json();
          }

          postResults.push({ ...result, posted_text: postText });
          console.log(`Posted ${p + 1}/${post.posts_per_interval} for auto-post ${post.id}`);
        }

        const newCount = post.current_count + 1;
        const nextPostAt = new Date(Date.now() + post.interval_hours * 60 * 60 * 1000);

        if (newCount >= post.max_posts) {
          await supabase.from('threads_auto_posts').update({
            current_count: newCount,
            status: 'completed',
            last_result: postResults,
          }).eq('id', post.id);
        } else {
          await supabase.from('threads_auto_posts').update({
            current_count: newCount,
            next_post_at: nextPostAt.toISOString(),
            last_result: postResults,
          }).eq('id', post.id);
        }

        results.push({ id: post.id, success: true, count: `${newCount}/${post.max_posts}` });
      } catch (err: any) {
        console.error(`Auto-post ${post.id} failed:`, err);
        await supabase.from('threads_auto_posts').update({
          last_result: { error: err.message },
        }).eq('id', post.id);
        results.push({ id: post.id, success: false, error: err.message });
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Process threads auto error:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
