
CREATE TABLE public.youtube_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id TEXT,
  channel_title TEXT,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expiry TIMESTAMPTZ NOT NULL,
  client_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.youtube_tokens TO authenticated;
GRANT ALL ON public.youtube_tokens TO service_role;

ALTER TABLE public.youtube_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_youtube_tokens_all" ON public.youtube_tokens FOR ALL USING (true) WITH CHECK (true);
