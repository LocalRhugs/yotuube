ALTER TABLE public.youtube_tokens ADD COLUMN IF NOT EXISTS client_id text;

CREATE TABLE IF NOT EXISTS public.short_url_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  day date NOT NULL DEFAULT (now() at time zone 'utc')::date,
  count integer NOT NULL DEFAULT 0,
  UNIQUE(code, day)
);

GRANT SELECT, INSERT, UPDATE ON public.short_url_clicks TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.short_url_clicks TO authenticated;
GRANT ALL ON public.short_url_clicks TO service_role;

ALTER TABLE public.short_url_clicks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read short url clicks"
  ON public.short_url_clicks FOR SELECT USING (true);
CREATE POLICY "Anyone can insert short url clicks"
  ON public.short_url_clicks FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update short url clicks"
  ON public.short_url_clicks FOR UPDATE USING (true);

CREATE INDEX IF NOT EXISTS idx_short_url_clicks_code_day ON public.short_url_clicks(code, day);