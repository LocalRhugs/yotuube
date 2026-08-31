
CREATE TABLE public.user_smart_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  title TEXT,
  destination_url TEXT NOT NULL,
  clicks INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_user_smart_links_user_id ON public.user_smart_links(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_smart_links TO authenticated;
GRANT ALL ON public.user_smart_links TO service_role;
ALTER TABLE public.user_smart_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own smart links"
  ON public.user_smart_links FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;
CREATE TRIGGER trg_user_smart_links_updated
  BEFORE UPDATE ON public.user_smart_links
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
