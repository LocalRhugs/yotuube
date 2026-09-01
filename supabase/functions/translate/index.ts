import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

/**
 * Translation edge function. Provider-agnostic — no Lovable dependency required.
 * POST body: { text, targetLanguage, sourceLanguage?, provider? }
 *   provider: 'pollinations' (default, free, no key) | 'claude' (needs ANTHROPIC_API_KEY) | 'lovable' (needs LOVABLE_API_KEY)
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const ok = (data: unknown) => new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  const err = (msg: string, status = 400) => new Response(JSON.stringify({ success: false, error: msg }), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  try {
    if (req.method !== 'POST') return err('Method not allowed', 405);

    const { text, targetLanguage, sourceLanguage = 'English', provider = 'pollinations' } = await req.json();

    if (!text || !targetLanguage) return err('Missing required fields: text and targetLanguage');
    if (text.length > 5000) return err('Text too long. Maximum 5000 characters per request.');

    const systemPrompt = `You are a professional translator. Translate the provided text accurately from ${sourceLanguage} to ${targetLanguage}. Return ONLY the translated text — no explanations, no quotes, no extra formatting. Preserve line breaks, emojis, hashtags, @mentions, URLs, and any %s / {} placeholders exactly as they appear.`;

    let translatedText = '';

    if (provider === 'claude') {
      // --- Anthropic Claude (raw HTTP; Deno edge runtime) ---
      const key = Deno.env.get('ANTHROPIC_API_KEY');
      if (!key) return err('Claude not configured: set the ANTHROPIC_API_KEY secret.', 500);
      const model = Deno.env.get('ANTHROPIC_MODEL') || 'claude-opus-5';
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': key,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model,
          max_tokens: 8000,
          output_config: { effort: 'low' },
          system: systemPrompt,
          messages: [{ role: 'user', content: text }],
        }),
      });
      if (!r.ok) {
        const t = await r.text();
        if (r.status === 429) return err('Claude rate limit exceeded, try again shortly.', 429);
        console.error('Anthropic error:', r.status, t);
        return err(`Claude error ${r.status}: ${t.slice(0, 200)}`, 502);
      }
      const d = await r.json();
      translatedText = (d.content || []).filter((b: any) => b.type === 'text').map((b: any) => b.text).join('').trim();

    } else if (provider === 'lovable') {
      // --- Lovable AI Gateway (legacy fallback) ---
      const key = Deno.env.get('LOVABLE_API_KEY');
      if (!key) return err('Lovable not configured (LOVABLE_API_KEY missing).', 500);
      const r = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'google/gemini-3-flash-preview',
          messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: text }],
        }),
      });
      if (!r.ok) {
        if (r.status === 429) return err('Rate limit exceeded, please try again later.', 429);
        if (r.status === 402) return err('AI service credits exhausted.', 402);
        const t = await r.text();
        console.error('Lovable gateway error:', r.status, t);
        return err('Translation service error', 502);
      }
      const d = await r.json();
      translatedText = d.choices?.[0]?.message?.content?.trim() || '';

    } else {
      // --- Pollinations (OpenAI-compatible). Anonymous access is deprecated (402),
      // so a token is required now: set POLLINATIONS_TOKEN (from enter.pollinations.ai). ---
      const pToken = Deno.env.get('POLLINATIONS_TOKEN');
      const pHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
      if (pToken) pHeaders['Authorization'] = `Bearer ${pToken}`;
      const r = await fetch('https://text.pollinations.ai/openai', {
        method: 'POST',
        headers: pHeaders,
        body: JSON.stringify({
          model: Deno.env.get('POLLINATIONS_MODEL') || 'openai',
          messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: text }],
          referrer: 'yotuube',
          ...(pToken ? { token: pToken } : {}),
        }),
      });
      if (!r.ok) {
        if (r.status === 429) return err('Pollinations rate limit, try again shortly.', 429);
        if (r.status === 402) return err('Pollinations requires a token now. Set the POLLINATIONS_TOKEN secret (from enter.pollinations.ai), or use the Claude provider.', 402);
        const t = await r.text();
        console.error('Pollinations error:', r.status, t);
        return err(`Pollinations error ${r.status}`, 502);
      }
      const d = await r.json();
      translatedText = d.choices?.[0]?.message?.content?.trim() || '';
    }

    if (!translatedText) return err('Translation returned empty result', 500);

    return ok({ success: true, translatedText, provider, sourceLanguage, targetLanguage });
  } catch (error: unknown) {
    console.error('Translation error:', error);
    return err(error instanceof Error ? error.message : 'Translation failed', 500);
  }
});
