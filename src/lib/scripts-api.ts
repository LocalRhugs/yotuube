const SCRIPTS_API = 'https://cooombo-wick.vercel.app/api/public/scripts';

export interface Script {
  id: string;
  title: string;
  description: string;
  game_name: string;
  game_id: number;
  creator: string;
  tags: string[];
  likes_count: number;
  downloads_count: number;
  views_count: number;
  is_featured: boolean;
  has_key_system: boolean;
  youtube_url?: string;
  github_video_url?: string;
  created_at: string;
  updated_at: string;
  uploaded_by_username: string;
  custom_image_url?: string | null;
}

export interface ScriptsResponse {
  success: boolean;
  data: Script[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
  timestamp: string;
}

export async function fetchScripts(params?: {
  limit?: number;
  offset?: number;
  game?: string;
  featured?: boolean;
}): Promise<ScriptsResponse> {
  const searchParams = new URLSearchParams();
  if (params?.limit) searchParams.set('limit', String(params.limit));
  if (params?.offset) searchParams.set('offset', String(params.offset));
  if (params?.game) searchParams.set('game', params.game);
  if (params?.featured) searchParams.set('featured', 'true');

  const url = `${SCRIPTS_API}${searchParams.toString() ? '?' + searchParams.toString() : ''}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Scripts API error: ${res.status}`);
  return res.json();
}

export async function fetchFeaturedScripts(limit = 10): Promise<Script[]> {
  const res = await fetchScripts({ limit, featured: true });
  return res.data;
}

export async function fetchScriptsByGame(game: string, limit = 20): Promise<Script[]> {
  const res = await fetchScripts({ limit, game });
  return res.data;
}
