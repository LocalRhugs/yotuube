-- Persistent URL shortener table (replacing in-memory storage from route-8.ts)
CREATE TABLE public.short_urls (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  original_url TEXT NOT NULL,
  click_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.short_urls ENABLE ROW LEVEL SECURITY;

-- Anyone can read (needed for redirect lookups)
CREATE POLICY "Anyone can read short URLs"
  ON public.short_urls FOR SELECT USING (true);

-- Anyone can create short URLs (no auth required for smart link generation)
CREATE POLICY "Anyone can create short URLs"
  ON public.short_urls FOR INSERT WITH CHECK (true);

-- Anyone can update click count
CREATE POLICY "Anyone can update click count"
  ON public.short_urls FOR UPDATE USING (true);

CREATE INDEX idx_short_urls_code ON public.short_urls(code);