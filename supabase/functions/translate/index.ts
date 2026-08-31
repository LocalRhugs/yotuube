import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

/**
 * Translation edge function using Lovable AI (Gemini).
 * POST body: { text: string, targetLanguage: string, sourceLanguage?: string }
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const ok = (data: unknown) => new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  const err = (msg: string, status = 400) => new Response(JSON.stringify({ success: false, error: msg }), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  try {
    if (req.method !== 'POST') return err('Method not allowed', 405);

    const { text, targetLanguage, sourceLanguage = 'English' } = await req.json();

    if (!text || !targetLanguage) {
      return err('Missing required fields: text and targetLanguage');
    }

    if (text.length > 5000) {
      return err('Text too long. Maximum 5000 characters per request.');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) return err('AI service not configured', 500);

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          {
            role: 'system',
            content: `You are a professional translator. Translate the provided text accurately from ${sourceLanguage} to ${targetLanguage}. Return ONLY the translated text, no explanations, no quotes, no extra formatting.`,
          },
          {
            role: 'user',
            content: text,
          },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) return err('Rate limit exceeded, please try again later.', 429);
      if (response.status === 402) return err('AI service credits exhausted.', 402);
      const t = await response.text();
      console.error('AI gateway error:', response.status, t);
      return err('Translation service error', 502);
    }

    const data = await response.json();
    const translatedText = data.choices?.[0]?.message?.content?.trim();

    if (!translatedText) return err('Translation returned empty result', 500);

    return ok({
      success: true,
      translatedText,
      sourceLanguage,
      targetLanguage,
    });
  } catch (error: unknown) {
    console.error('Translation error:', error);
    return err(error instanceof Error ? error.message : 'Translation failed', 500);
  }
});
