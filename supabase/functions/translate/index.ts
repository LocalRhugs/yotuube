import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

/**
 * Translation edge function — provider-agnostic, keys stay server-side.
 * All three providers are plain OpenAI-compatible /chat/completions calls.
 * POST body: { text, targetLanguage, sourceLanguage?, provider, model }
 *   provider: 'openrouter' (Claude etc.) | 'pollinations' | 'groq'
 *   model:    the real upstream model id (e.g. 'anthropic/claude-sonnet-4.6', 'claude-fast', 'llama-3.3-70b-versatile')
 */
const ENDPOINTS: Record<string, string> = {
  openrouter: 'https://openrouter.ai/api/v1/chat/completions',
  pollinations: 'https://gen.pollinations.ai/v1/chat/completions',
  groq: 'https://api.groq.com/openai/v1/chat/completions',
  // Gemini via Google's OpenAI-compatible endpoint (Bearer <key> + /chat/completions).
  gemini: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
};

function keysFor(provider: string): string[] {
  if (provider === 'openrouter') {
    return [Deno.env.get('OPENROUTER_API_KEY'), Deno.env.get('OPENROUTER_API_KEY_2')].filter(Boolean) as string[];
  }
  if (provider === 'pollinations') return [Deno.env.get('POLLINATIONS_API_KEY')].filter(Boolean) as string[];
  if (provider === 'groq') return [Deno.env.get('GROQ_API_KEY')].filter(Boolean) as string[];
  if (provider === 'gemini') {
    // All Gemini keys live in one secret GEMINI_API_KEYS (comma/newline separated);
    // the individual GEMINI_API_KEY[_n] are also honored for backward-compat.
    const bulk = (Deno.env.get('GEMINI_API_KEYS') || '').split(/[,\n]+/).map((s) => s.trim()).filter(Boolean);
    const singles = [
      Deno.env.get('GEMINI_API_KEY'), Deno.env.get('GEMINI_API_KEY_2'),
      Deno.env.get('GEMINI_API_KEY_3'), Deno.env.get('GEMINI_API_KEY_4'),
    ].filter(Boolean) as string[];
    const all = [...new Set([...bulk, ...singles])];
    // Shuffle so heavy usage spreads across all keys instead of always starting at #1.
    for (let i = all.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [all[i], all[j]] = [all[j], all[i]]; }
    return all;
  }
  return [];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const ok = (data: unknown) => new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  const err = (msg: string, status = 400) => new Response(JSON.stringify({ success: false, error: msg }), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  try {
    if (req.method !== 'POST') return err('Method not allowed', 405);

    const { text, targetLanguage, sourceLanguage = 'English', provider = 'pollinations', model, mode = 'translate' } = await req.json();
    if (!text || !targetLanguage) return err('Missing required fields: text and targetLanguage');
    if (text.length > 5000) return err('Text too long. Maximum 5000 characters per request.');
    if (!model) return err('model is required');

    const endpoint = ENDPOINTS[provider];
    if (!endpoint) return err(`Unknown provider: ${provider}`);
    const keys = keysFor(provider);
    if (!keys.length) return err(`No API key configured for ${provider}. Add its secret in Supabase.`, 500);

    // mode 'translate' (default): faithful translation. mode 'rewrite': generate a FRESH, unique
    // variant per channel (reworded, same meaning/keywords) THEN in the target language — used to
    // de-template a multi-channel network so no two channels share identical metadata.
    const translatePrompt = `You are a professional translator. Translate the provided text accurately from ${sourceLanguage} to ${targetLanguage}. Return ONLY the translated text — no explanations, no quotes, no extra formatting. Preserve line breaks, emojis, hashtags, @mentions, URLs, and any %s / {} placeholders exactly as they appear.`;
    const rewritePrompt = `You are a YouTube growth copywriter for Roblox script videos. Rewrite the given ${sourceLanguage} text into ${targetLanguage} as a FRESH, UNIQUE variant: reword it (different structure, synonyms, reordered) so it does NOT read as a copy of the original, while keeping the SAME meaning, the SAME game and the SAME features/keywords. Keep it punchy and SEO-strong for the Roblox scripting audience.
Keep every emoji, #hashtag, @mention, URL and %s / {} placeholder intact. Keep selling terms like "No Key", "2026", "Mobile", "Auto Farm", the feature names, and the game name. Output ONLY the final ${targetLanguage} text — no quotes, no notes, no "here is".
Examples of the KIND of rewording (English shown; you must OUTPUT in ${targetLanguage}):
- "BEST Steal An Egg Script — Instant Steal, Egg ESP, Auto Farm (No Key) | Mobile" -> "Steal An Egg Script (No Key) — Auto Farm + Egg ESP + Instant Steal, works on Mobile 2026"
- "Kaiju Alpha Script | Auto Farm, Auto Beam, Inf Energy - No Key" -> "NEW Kaiju Alpha Script: Inf Energy, Auto Beam & Auto Farm | No Key Needed"`;
    const systemPrompt = mode === 'rewrite' ? rewritePrompt : translatePrompt;

    // Claude on OpenRouter must not stream in this setup and works best capped ~2k tokens.
    const isClaude = /claude/i.test(String(model));

    let lastError = '';
    for (let i = 0; i < keys.length; i++) {           // auto-failover across keys
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${keys[i]}`,
            'Content-Type': 'application/json',
            ...(provider === 'openrouter' && {
              'HTTP-Referer': 'https://yotuube-sand.vercel.app',
              'X-Title': 'yotuube',
            }),
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: text },
            ],
            temperature: mode === 'rewrite' ? 0.9 : 0,
            max_tokens: isClaude ? 2000 : 4096,
            stream: false,
            ...(provider === 'pollinations' && { private: true }),
          }),
        });

        if (!res.ok) { lastError = `${res.status}: ${(await res.text()).slice(0, 160)}`; continue; }
        const data = await res.json();
        const reply = data.choices?.[0]?.message?.content?.trim();
        if (!reply) { lastError = 'Empty response'; continue; }
        return ok({ success: true, translatedText: reply, provider, model, keyUsed: i + 1 });
      } catch (e) {
        lastError = e instanceof Error ? e.message : String(e);
      }
    }
    return err(lastError || 'All keys failed', 502);
  } catch (error: unknown) {
    console.error('Translation error:', error);
    return err(error instanceof Error ? error.message : 'Translation failed', 500);
  }
});
