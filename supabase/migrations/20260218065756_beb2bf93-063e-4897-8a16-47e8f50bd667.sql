
-- Storage bucket for video uploads
INSERT INTO storage.buckets (id, name, public) VALUES ('videos', 'videos', true);

CREATE POLICY "public_video_upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'videos');
CREATE POLICY "public_video_read" ON storage.objects FOR SELECT USING (bucket_id = 'videos');
CREATE POLICY "public_video_update" ON storage.objects FOR UPDATE USING (bucket_id = 'videos');
CREATE POLICY "public_video_delete" ON storage.objects FOR DELETE USING (bucket_id = 'videos');

-- YouTube OAuth tokens
CREATE TABLE public.youtube_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id TEXT,
  channel_title TEXT,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expiry TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.youtube_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_youtube_tokens_all" ON public.youtube_tokens FOR ALL USING (true) WITH CHECK (true);
