
CREATE TABLE public.scheduled_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform text NOT NULL DEFAULT 'twitter',
  account_indices integer[] NOT NULL DEFAULT '{}',
  tweet_text text,
  video_path text,
  scheduled_at timestamp with time zone NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  results jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.scheduled_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can manage scheduled posts"
ON public.scheduled_posts FOR ALL
TO public
USING (true)
WITH CHECK (true);
