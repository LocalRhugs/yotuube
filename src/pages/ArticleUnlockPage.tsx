/**
 * /article/:id?d=<base64url>
 *
 * Dynamic host page for self-hosted smart links (shortened via spoo.me etc.).
 * Picks an existing blog post deterministically from `:id`, renders the full
 * article (so it looks like a normal editorial page to AdSense / users), then
 * embeds the YouTube unlock gate at the bottom which routes to the target URL.
 *
 * Not linked from anywhere on the site — discoverable only via the smart link.
 * Always emits `noindex` so it cannot end up in search results or feed lists.
 *
 * `d` payload format (same as /u/:videoId): [mask, compactChannelId, targetUrl]
 *   mask: subscribe=1, like=2, comment=4
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Calendar, Clock, CheckCircle2, Lock, ThumbsUp, MessageSquare, Youtube, ArrowRight, Loader2, Download } from "lucide-react";
import { posts } from "@/content/posts";

declare global { interface Window { YT?: any; onYouTubeIframeAPIReady?: () => void; } }

function hashStr(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function renderBody(md: string) {
  const blocks = md.split(/\n\n+/);
  return blocks.map((block, i) => {
    const trimmed = block.trim();
    if (trimmed.startsWith("### ")) {
      return <h3 key={i} className="text-xl md:text-2xl font-bold mt-10 mb-3 text-white">{trimmed.slice(4)}</h3>;
    }
    if (trimmed.startsWith("## ")) {
      return <h2 key={i} className="text-2xl md:text-3xl font-bold mt-12 mb-4 text-white">{trimmed.slice(3)}</h2>;
    }
    const parts = trimmed.split(/(\*\*[^*]+\*\*)/g);
    return (
      <p key={i} className="text-gray-300 leading-relaxed mb-5 text-[17px]">
        {parts.map((part, j) =>
          part.startsWith("**") && part.endsWith("**") ? (
            <strong key={j} className="text-white font-semibold">{part.slice(2, -2)}</strong>
          ) : (<span key={j}>{part}</span>)
        )}
      </p>
    );
  });
}

export default function ArticleUnlockPage() {
  const { id = "" } = useParams();
  const [searchParams] = useSearchParams();

  // Decode payload (same shape as /u/:videoId)
  const { videoId, channelId, targetUrl, actions, discordUrl, watchVideoId, watchTarget } = useMemo(() => {
    let videoId = searchParams.get("v") || id;
    let channelId = "";
    let targetUrl = "";
    let discordUrl = "";
    let watchVideoId = "";
    let watchTarget = 6; // legacy default; overridden when the "watch" action is required
    let actions = { subscribe: true, like: true, comment: false, discord: false, watch: false };
    try {
      const d = searchParams.get("d");
      if (d) {
        const base64 = d.replace(/-/g, "+").replace(/_/g, "/");
        const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
        const decoded = JSON.parse(atob(padded));
        if (Array.isArray(decoded) && decoded.length >= 3) {
          const [mask, cId, tUrl] = decoded;
          channelId = typeof cId === "string" && cId.length === 22 ? `UC${cId}` : cId;
          targetUrl = tUrl;
          actions = {
            subscribe: (mask & 1) === 1,
            like: (mask & 2) === 2,
            comment: (mask & 4) === 4,
            discord: (mask & 8) === 8,
            watch: (mask & 16) === 16,
          };
          // Optional trailing fields appended sequentially (discord, then watch) — walk a cursor.
          let idx = 3;
          if (actions.discord) { const dUrl = decoded[idx++]; if (typeof dUrl === "string") discordUrl = dUrl; }
          if (actions.watch) {
            const wId = decoded[idx++];
            const wSec = decoded[idx++];
            if (typeof wId === "string") watchVideoId = wId;
            watchTarget = Math.max(1, Number(wSec) || 30);
          }
        }
      }
    } catch (e) {
      console.error("Failed to parse article unlock params", e);
    }
    return { videoId, channelId, targetUrl, actions, discordUrl, watchVideoId, watchTarget };
  }, [id, searchParams]);

  // Deterministically pick an existing post as the host article
  const post = useMemo(() => posts[hashStr(id || "x") % posts.length], [id]);

  // Gate state (mirrors UnlockYouTubePage)
  const [completed, setCompleted] = useState<Record<string, boolean>>({});
  const [verifying, setVerifying] = useState<Record<string, boolean>>({});
  const [actionsDone, setActionsDone] = useState(false);
  const [watchedSeconds, setWatchedSeconds] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const strictWatch = actions.watch;
  const heroVideoId = strictWatch && watchVideoId ? watchVideoId : videoId;
  const watchSatisfied = watchedSeconds >= watchTarget;
  const unlocked = actionsDone && watchSatisfied;

  // Legacy links tick freely; a required "watch" only advances while the video is PLAYING.
  useEffect(() => {
    if (watchSatisfied) return;
    if (strictWatch && !isPlaying) return;
    const t = setInterval(() => setWatchedSeconds(s => Math.min(watchTarget, s + 1)), 1000);
    return () => clearInterval(t);
  }, [watchSatisfied, strictWatch, isPlaying, watchTarget]);

  const verify = (action: string, url: string) => {
    window.open(url, "_blank");
    setVerifying(v => ({ ...v, [action]: true }));
    setTimeout(() => {
      setCompleted(prev => {
        const next = { ...prev, [action]: true };
        const req: string[] = [];
        if (actions.subscribe) req.push("subscribe");
        if (actions.like) req.push("like");
        if (actions.comment) req.push("comment");
        if (actions.discord) req.push("discord");
        if (req.every(r => next[r])) setActionsDone(true);
        return next;
      });
      setVerifying(v => ({ ...v, [action]: false }));
    }, 5000);
  };

  const handleUnlock = () => {
    if (unlocked && targetUrl) window.location.href = targetUrl;
  };

  const body = renderBody(post.body);
  const requiredActions = [
    actions.subscribe ? "subscribe" : null,
    actions.like ? "like" : null,
    actions.comment ? "comment" : null,
    actions.discord ? "discord" : null,
  ].filter((action): action is string => Boolean(action));
  const completedSocial = requiredActions.filter((action) => completed[action]).length;
  const totalSteps = requiredActions.length + 1;
  const completedSteps = completedSocial + (watchSatisfied ? 1 : 0);
  const progressPercent = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

  return (
    <>
      <Helmet>
        <title>{post.title}</title>
        <meta name="robots" content="noindex, nofollow" />
        <meta name="googlebot" content="noindex, nofollow" />
        <meta name="rating" content="general" />
      </Helmet>

      <article className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <p className="text-xs font-semibold tracking-[0.2em] text-red-400 uppercase mb-3">{post.category}</p>
        <h1 className="text-3xl md:text-5xl font-bold leading-tight mb-5">{post.title}</h1>
        <p className="text-lg text-gray-400 mb-6 leading-relaxed">{post.excerpt}</p>

        <div className="flex items-center gap-4 text-sm text-gray-500 pb-6 border-b border-white/5 mb-10">
          <span>By <strong className="text-gray-300 font-medium">{post.author}</strong></span>
          <span className="inline-flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            {new Date(post.publishedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" /> {post.readingMinutes} min read
          </span>
        </div>

        <div className="prose-content">{body}</div>

        <div className="mt-12 pt-8 border-t border-white/5 flex flex-wrap gap-2">
          {post.tags.map((tag) => (
            <span key={tag} className="text-xs px-3 py-1 rounded-full bg-white/5 text-gray-400">#{tag}</span>
          ))}
        </div>

        {/* Unlock gate */}
        <section className="mt-12">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary mb-3">
            Creator unlock
          </p>
          <p className="text-sm text-gray-400 mb-4">
            Complete the actions to unlock the resource.
          </p>

          <div className="mx-auto max-w-[375px] overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-card">
            <div className="mb-4 text-center">
              <h2 className="text-[22px] font-semibold leading-tight text-foreground">{post.title.split(":")[0]}</h2>
              <p className="text-sm leading-snug text-muted-foreground">Complete the actions to unlock</p>
            </div>

            <div className="relative mb-4 aspect-video overflow-hidden rounded-xl bg-background">
              {heroVideoId ? <YouTubeGatePlayer videoId={heroVideoId} strict={strictWatch} onPlayingChange={setIsPlaying} /> : null}
              {!watchSatisfied && strictWatch && !isPlaying && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-[2px] pointer-events-none">
                  <span className="px-3 py-1.5 rounded-full bg-black/80 border border-white/15 text-xs font-semibold text-white">
                    ▶ Resume the video · {watchTarget - watchedSeconds}s left
                  </span>
                </div>
              )}
              <div className="absolute bottom-2 right-2 rounded-full border border-border bg-background/80 px-3 py-1 text-xs font-semibold text-foreground backdrop-blur-md pointer-events-none">
                {watchSatisfied ? (
                  <span className="inline-flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-primary" /> Watch done</span>
                ) : (
                  <span>Watching... {watchTarget - watchedSeconds}s</span>
                )}
              </div>
            </div>

            <div className="space-y-3">
              {actions.subscribe && (
                <ActionBtn label="Subscribe & turn on notifications" icon={<Youtube className="w-4 h-4" />} tone="youtube"
                  done={completed.subscribe} loading={verifying.subscribe}
                  onClick={() => verify("subscribe", `https://www.youtube.com/channel/${channelId}?sub_confirmation=1`)} />
              )}
              {actions.like && (
                <ActionBtn label="Like video" icon={<ThumbsUp className="w-4 h-4" />} tone="neutral"
                  done={completed.like} loading={verifying.like}
                  onClick={() => verify("like", `https://www.youtube.com/watch?v=${videoId}`)} />
              )}
              {actions.comment && (
                <ActionBtn label="Comment on video" icon={<MessageSquare className="w-4 h-4" />} tone="neutral"
                  done={completed.comment} loading={verifying.comment}
                  onClick={() => verify("comment", `https://www.youtube.com/watch?v=${videoId}`)} />
              )}
              {actions.discord && (
                <ActionBtn
                  label="Join Discord server"
                  icon={<svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" aria-hidden="true"><path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9459 2.4189-2.1568 2.4189Z" /></svg>}
                  tone="neutral"
                  done={completed.discord} loading={verifying.discord}
                  onClick={() => verify("discord", discordUrl || "https://discord.com")} />
              )}
            </div>

            <div className="mt-5">
              <div aria-live="polite" className="sr-only">Progress update: {completedSteps}/{totalSteps} done</div>
              <div className="mb-2 flex items-center justify-between">
                <small className="text-xs text-muted-foreground">Unlock progress</small>
                <span id="unlock-progress-badge" className="text-xs font-semibold text-primary">{completedSteps}/{totalSteps} done</span>
              </div>
              <div className="mb-4 h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label="Unlock progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progressPercent}>
                <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${progressPercent}%` }} />
              </div>
              <button
                type="button"
                className={`flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-opacity ${
                  unlocked ? "bg-primary text-primary-foreground hover:opacity-90" : "bg-muted text-muted-foreground cursor-not-allowed"
                }`}
                onClick={handleUnlock}
                disabled={!unlocked}
                aria-label={`Unlock link. ${completedSteps} of ${totalSteps} required steps completed`}
                aria-describedby="unlock-progress-badge"
              >
                {unlocked ? (
                  <><Download className="w-4 h-4" />Unlock link</>
                ) : (
                  <><Lock className="w-4 h-4" />Unlock link</>
                )}
              </button>
            </div>
          </div>
        </section>
      </article>
    </>
  );
}

function ActionBtn({ label, icon, tone, done, loading, onClick }: {
  label: string; icon: React.ReactNode; tone: "youtube" | "neutral";
  done?: boolean; loading?: boolean; onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`unlock-action-row ${done ? "unlock-action-success" : tone === "youtube" ? "unlock-action-youtube" : "unlock-action-neutral"}`}
      onClick={onClick}
      disabled={done || loading}
    >
      <span className="flex min-w-0 flex-1 items-center justify-center gap-2">
        {done ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : icon}
        <span className="truncate">{label}</span>
      </span>
      {loading ? <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
        : done ? <CheckCircle2 className="h-4 w-4 shrink-0" />
        : <ArrowRight className="h-4 w-4 shrink-0" />}
    </button>
  );
}

function YouTubeGatePlayer({ videoId, strict, onPlayingChange }: {
  videoId: string; strict?: boolean; onPlayingChange?: (playing: boolean) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);

  useEffect(() => {
    if (!videoId) return;
    let cancelled = false;

    const loadApi = () => new Promise<void>((resolve) => {
      if (window.YT && window.YT.Player) return resolve();
      const existing = document.querySelector('script[src="https://www.youtube.com/iframe_api"]');
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => { prev?.(); resolve(); };
      if (!existing) {
        const s = document.createElement('script');
        s.src = 'https://www.youtube.com/iframe_api';
        document.body.appendChild(s);
      }
    });

    loadApi().then(() => {
      if (cancelled || !containerRef.current) return;
      playerRef.current = new window.YT.Player(containerRef.current, {
        videoId,
        playerVars: {
          autoplay: 1, mute: 1, controls: strict ? 1 : 0, rel: 0, showinfo: 0,
          modestbranding: 1, playsinline: 1,
          loop: strict ? 0 : 1, playlist: videoId,
          disablekb: strict ? 0 : 1, fs: 0, iv_load_policy: 3,
        },
        events: {
          onReady: (e: any) => { try { e.target.mute(); e.target.playVideo(); } catch {} },
          onStateChange: (e: any) => {
            // 1 = playing, 2 = paused, 0 = ended
            if (strict) {
              onPlayingChange?.(e.data === 1);
            } else if (e.data === 2 || e.data === 0) {
              try { e.target.seekTo(e.data === 0 ? 0 : e.target.getCurrentTime(), true); e.target.playVideo(); } catch {}
            }
          },
        },
      });
    });

    return () => {
      cancelled = true;
      try { playerRef.current?.destroy?.(); } catch {}
    };
  }, [videoId, strict]);

  return <div ref={containerRef} className="w-full h-full" />;
}
