import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const GRAPH_API = 'https://graph.facebook.com/v19.0';

async function generateVariation(originalText: string, hashtags: string | null, platform: string, postNumber: number, maxPosts: number, apiKey: string): Promise<{ text: string; hashtags: string }> {
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
            content: `You are a Facebook post writer for Roblox script pages. Goal: CLICKS and TRAFFIC. This is variation ${postNumber}/${maxPosts}.

STRICT FORMAT (4 lines, each on its own line with a line break between them):
Line 1: Benefit hook that MUST include the word "script" (e.g. "Farm amber fast with this Jurassic Blocky script")
Line 2: What the script includes (features)
Line 3: Concrete details (no key, mobile + PC, Working 2026)
Line 4: CTA → "Get it now 👇" or "Link in bio 👇"

FORMAT RULE: Each line MUST be separated by a newline character (\\n). Do NOT write it as one paragraph.

CRITICAL RULES:
- MAX 4 lines. Each sentence on its OWN line. NO paragraphs. NO blog writing.
- Line 1 MUST contain the word "script" — e.g. "this auto farm script", "this ESP script"
- NEVER use spam phrases: "100% working", "works flawlessly", "insane", "crazy", "dominate", "game-changer"
- Use "Working 2026" instead of "100% working" or "works flawlessly"
- NEVER use filler openings: "Alright real talk", "Let's settle this", "I'm curious"
- NEVER ask questions or write discussion bait
- Use correct grammar — plural nouns (Goats not Goat, Players not Player)
- Use SPECIFIC details: "auto farm", "no key", "mobile + PC", "Working 2026"
- Vary the hook every post — never start two posts the same way

HASHTAG RULES:
- Use 3-5 intent-based hashtags (what people SEARCH for)
- All lowercase, no spaces
- GOOD: #jurassicblockyscript #robloxscripts #autofarm #robloxesp #scriptgui
- BAD: #Roblox (too broad), #gaming (useless)

PERFECT EXAMPLE:
"Farm amber fast with this Jurassic Blocky script\\nAuto collect amber, kill goats, and track players with ESP\\nNo key required, works on mobile + PC (Working 2026)\\nGet it now 👇"
hashtags: "#jurassicblockyscript #robloxscripts #autofarm #robloxesp #scriptgui"

Return ONLY a JSON object: {"text": "line1\\nline2\\nline3\\nline4", "hashtags": "#tag1 #tag2 #tag3"}
Do NOT include hashtags in the text field.`
          },
          { role: "user", content: `Original post: ${originalText}\nOriginal hashtags: ${hashtags || 'none'}` }
        ],
      }),
    });

    if (!response.ok) {
      console.warn(`AI variation failed (${response.status}), using original text`);
      return { text: originalText, hashtags: hashtags || '' };
    }

    const data = await response.json();
    const rawContent = data.choices?.[0]?.message?.content?.trim() || '';
    
    try {
      const cleaned = rawContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(cleaned);
      return { text: parsed.text || originalText, hashtags: parsed.hashtags || hashtags || '' };
    } catch {
      return { text: rawContent || originalText, hashtags: hashtags || '' };
    }
  } catch (err) {
    console.warn('AI variation error, using original:', err);
    return { text: originalText, hashtags: hashtags || '' };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: duePosts, error: fetchError } = await supabase
      .from('facebook_auto_posts')
      .select('*')
      .eq('status', 'active')
      .lte('next_post_at', new Date().toISOString());

    if (fetchError) throw fetchError;
    if (!duePosts || duePosts.length === 0) {
      return new Response(JSON.stringify({ success: true, message: 'No Facebook posts due' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const results: any[] = [];

    for (const post of duePosts) {
      try {
        const postResults: any[] = [];

        for (let p = 0; p < post.posts_per_interval; p++) {
          // Generate unique AI variation
          let finalText: string;
          let finalHashtags: string;

          if (lovableApiKey) {
            const variation = await generateVariation(
              post.description,
              post.hashtags,
              'facebook',
              post.current_count + 1,
              post.max_posts,
              lovableApiKey
            );
            finalText = variation.text;
            finalHashtags = variation.hashtags;
          } else {
            finalText = post.description;
            finalHashtags = post.hashtags || '';
          }

          const fullMessage = finalHashtags ? `${finalText}\n\n${finalHashtags}` : finalText;

          let result: any;

          if (post.post_type === 'video' && post.video_url) {
            const params = new URLSearchParams({
              file_url: post.video_url,
              access_token: post.page_access_token,
            });
            if (post.title) params.set('title', post.title);
            if (fullMessage) params.set('description', fullMessage);

            const res = await fetch(`${GRAPH_API}/${post.page_id}/videos`, {
              method: 'POST',
              body: params,
            });
            result = await res.json();
            if (!res.ok) throw new Error(`Facebook video error [${res.status}]: ${JSON.stringify(result)}`);
          } else {
            const params = new URLSearchParams({
              message: fullMessage,
              access_token: post.page_access_token,
            });

            const res = await fetch(`${GRAPH_API}/${post.page_id}/feed`, {
              method: 'POST',
              body: params,
            });
            result = await res.json();
            if (!res.ok) throw new Error(`Facebook post error [${res.status}]: ${JSON.stringify(result)}`);
          }

          postResults.push({ ...result, posted_text: fullMessage });
          console.log(`Posted ${p + 1}/${post.posts_per_interval} for fb auto-post ${post.id}`);
        }

        const newCount = post.current_count + 1;
        const nextPostAt = new Date(Date.now() + post.interval_hours * 60 * 60 * 1000);

        if (newCount >= post.max_posts) {
          await supabase.from('facebook_auto_posts').update({
            current_count: newCount,
            status: 'completed',
            last_result: postResults,
          }).eq('id', post.id);
        } else {
          await supabase.from('facebook_auto_posts').update({
            current_count: newCount,
            next_post_at: nextPostAt.toISOString(),
            last_result: postResults,
          }).eq('id', post.id);
        }

        results.push({ id: post.id, success: true, count: `${newCount}/${post.max_posts}` });
      } catch (err: any) {
        console.error(`FB auto-post ${post.id} failed:`, err);
        await supabase.from('facebook_auto_posts').update({
          last_result: { error: err.message },
        }).eq('id', post.id);
        results.push({ id: post.id, success: false, error: err.message });
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Process facebook auto error:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
