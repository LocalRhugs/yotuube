
CREATE TABLE public.facebook_auto_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  page_id text NOT NULL,
  page_name text,
  page_access_token text NOT NULL,
  post_type text NOT NULL DEFAULT 'video',
  video_url text,
  title text,
  description text NOT NULL,
  hashtags text,
  interval_hours integer NOT NULL DEFAULT 10,
  posts_per_interval integer NOT NULL DEFAULT 1,
  max_posts integer NOT NULL DEFAULT 5,
  current_count integer NOT NULL DEFAULT 0,
  next_post_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'active',
  last_result jsonb
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.facebook_auto_posts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.facebook_auto_posts TO authenticated;
GRANT ALL ON public.facebook_auto_posts TO service_role;

ALTER TABLE public.facebook_auto_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can manage facebook auto posts"
  ON public.facebook_auto_posts
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

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

GRANT SELECT, INSERT, UPDATE, DELETE ON public.threads_auto_posts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.threads_auto_posts TO authenticated;
GRANT ALL ON public.threads_auto_posts TO service_role;

ALTER TABLE public.threads_auto_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can manage threads auto posts" ON public.threads_auto_posts FOR ALL TO public USING (true) WITH CHECK (true);
