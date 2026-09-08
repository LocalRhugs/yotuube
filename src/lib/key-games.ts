/**
 * Pulls the game list from the key system (same source the store's Access Key page uses):
 * the executor's public, CDN+Redis-cached endpoint. Used to point a video's unlock link at the
 * right game without typing slugs.
 */
export interface KeyGame {
  universe_id: string | null;
  game_id: string;
  name: string;
}

const EXECUTOR = "https://v0-remix-of-roblox-executor-system.vercel.app";
const LS_KEY = "cw_key_games_v1";
const TTL = 5 * 60 * 1000;

let mem: KeyGame[] | null = null;
let memAt = 0;
let inflight: Promise<KeyGame[]> | null = null;

export async function getKeyGames(): Promise<KeyGame[]> {
  const now = Date.now();
  if (mem && now - memAt < TTL) return mem;
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      if (Array.isArray(p?.games) && typeof p?.at === "number" && now - p.at < TTL) {
        mem = p.games; memAt = p.at; return mem;
      }
    }
  } catch { /* ignore */ }
  if (inflight) return inflight;
  inflight = fetch(`${EXECUTOR}/api/public/games`)
    .then(r => r.json())
    .then(j => {
      const games: KeyGame[] = Array.isArray(j?.games) ? j.games : [];
      mem = games; memAt = Date.now();
      try { localStorage.setItem(LS_KEY, JSON.stringify({ games, at: memAt })); } catch { /* ignore */ }
      inflight = null;
      return games;
    })
    .catch(() => { inflight = null; return mem || []; });
  return inflight;
}
