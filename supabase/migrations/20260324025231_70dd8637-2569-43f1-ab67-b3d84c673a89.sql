
CREATE TABLE public.threads_auto_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  text text NOT NULL,
  topic text,
  media_url text,
  media_type text NOT NULL DEFAULT 'TEXT',
  interval_hours integer NOT NULL DEFAULT 10,
  posts_per_interval integer NOT NULL DEFAULT 1,
  max_posts integer NOT NULL DEFAULT 5,
  current_count integer NOT NULL DEFAULT 0,
  next_post_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'active',
  last_result jsonb
);

ALTER TABLE public.threads_auto_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can manage threads auto posts" ON public.threads_auto_posts FOR ALL TO public USING (true) WITH CHECK (true);
