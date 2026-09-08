import { useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckCircle2, Lock, ThumbsUp, MessageSquare, Youtube, ArrowRight, Loader2, Download } from "lucide-react";
import ComplianceFooter from "@/components/ComplianceFooter";

declare global { interface Window { YT?: any; onYouTubeIframeAPIReady?: () => void; } }


export default function UnlockYouTubePage() {
  const { videoId = "" } = useParams();
  const [searchParams] = useSearchParams();

  const [targetUrl, setTargetUrl] = useState("");
  const [channelId, setChannelId] = useState("");
  const [discordUrl, setDiscordUrl] = useState("");
  const [actions, setActions] = useState({ subscribe: true, like: true, comment: false, discord: false, watch: false });
  const [watchVideoId, setWatchVideoId] = useState("");
  const [watchTarget, setWatchTarget] = useState(6); // legacy default; overridden when the "watch" action is on
  const [completed, setCompleted] = useState<Record<string, boolean>>({});
  const [verifying, setVerifying] = useState<Record<string, boolean>>({});
  const [actionsDone, setActionsDone] = useState(false);
  const [bonusClicks, setBonusClicks] = useState(0);
  const [watchedSeconds, setWatchedSeconds] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  // Strict watch: creator explicitly required "watch" → countdown only advances while playing.
  const strictWatch = actions.watch;
  const heroVideoId = strictWatch && watchVideoId ? watchVideoId : videoId;
  const watchSatisfied = watchedSeconds >= watchTarget;
  const unlocked = actionsDone && bonusClicks >= 2 && watchSatisfied;

  // Countdown. Legacy links tick freely (video autoplays muted). When the creator required
  // "watch", the countdown only advances while the video is actually PLAYING — pause it and
  // the timer freezes until they resume.
  useEffect(() => {
    if (watchSatisfied) return;
    if (strictWatch && !isPlaying) return;
    const t = setInterval(() => setWatchedSeconds(s => Math.min(watchTarget, s + 1)), 1000);
    return () => clearInterval(t);
  }, [watchSatisfied, strictWatch, isPlaying, watchTarget]);

  // Inject Monetag tag.min.js once + add noindex meta so this URL doesn't get scraped
  useEffect(() => {
    // noindex (defense against being scraped into porn-link directories that trigger YT strikes)
    const robots = document.createElement('meta');
    robots.name = 'robots';
    robots.content = 'noindex, nofollow';
    document.head.appendChild(robots);
    const rating = document.createElement('meta');
    rating.name = 'rating';
    rating.content = 'general';
    document.head.appendChild(rating);

    if (!document.querySelector('script[data-monetag="zone"]')) {
      const s = document.createElement('script');
      s.dataset.zone = '11035793';
      s.dataset.monetag = 'zone';
      s.src = 'https://al5sm.com/tag.min.js';
      s.async = true;
      document.body.appendChild(s);
    }
    return () => {
      robots.remove();
      rating.remove();
    };
  }, []);

  useEffect(() => {
    try {
      const d = searchParams.get("d");
      if (!d) return;
      const base64 = d.replace(/-/g, "+").replace(/_/g, "/");
      const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
      const decoded = JSON.parse(atob(padded));
      if (Array.isArray(decoded) && decoded.length >= 3) {
        const [mask, cId, tUrl] = decoded;
        const fullChannelId = typeof cId === "string" && cId.length === 22 ? `UC${cId}` : cId;
        setChannelId(fullChannelId);
        setTargetUrl(tUrl);
        const act = {
          subscribe: (mask & 1) === 1,
          like: (mask & 2) === 2,
          comment: (mask & 4) === 4,
          discord: (mask & 8) === 8,
          watch: (mask & 16) === 16,
        };
        setActions(act);
        // Optional fields were appended sequentially (discord, then watch) — walk a cursor.
        let idx = 3;
        if (act.discord) { const dUrl = decoded[idx++]; if (typeof dUrl === "string") setDiscordUrl(dUrl); }
        if (act.watch) {
          const wId = decoded[idx++];
          const wSec = decoded[idx++];
          if (typeof wId === "string") setWatchVideoId(wId);
          setWatchTarget(Math.max(1, Number(wSec) || 30));
        }
      }
    } catch (e) {
      console.error("Failed to parse unlock params", e);
    }
  }, [searchParams]);

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

  const handleBonusClick = () => {
    window.open("https://omg10.com/4/11035810", "_blank");
    setBonusClicks(c => Math.min(2, c + 1));
  };

  const handleUnlock = () => {
    if (unlocked && targetUrl) window.location.href = targetUrl;
  };

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white flex flex-col items-center justify-center p-4">
      {/* Bridge page — excluded from AdSense crawl per Google policy */}
      {typeof document !== "undefined" && (() => {
        const id = "robots-noindex";
        if (!document.querySelector(`meta[name="robots"]#${id}`)) {
          const m = document.createElement("meta");
          m.name = "robots"; m.id = id; m.content = "noindex,nofollow"; document.head.appendChild(m);
        }
        return null;
      })()}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-600/20 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/20 blur-[120px] rounded-full" />
      </div>
      <div className="max-w-md w-full relative z-10 space-y-8">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm mb-4">
            <Lock className="w-3 h-3 text-purple-400" />
            <span className="text-xs font-medium text-gray-300">Content Locked</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
            Complete Steps to Unlock
          </h1>
          <p className="text-gray-400 text-sm">Perform the actions below to access the destination link.</p>
        </div>
        <Card className="bg-[#1a1a1a] border-white/5 shadow-2xl overflow-hidden">
          <div className="aspect-video w-full bg-black relative group">
            <YouTubeGatePlayer videoId={heroVideoId} strict={strictWatch} onPlayingChange={setIsPlaying} />
            {!watchSatisfied && strictWatch && !isPlaying && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-[2px] pointer-events-none">
                <div className="px-4 py-2 rounded-full bg-black/80 border border-white/15 text-sm font-semibold text-white flex items-center gap-2">
                  ▶ Resume the video to continue · {watchTarget - watchedSeconds}s left
                </div>
              </div>
            )}
            {!watchSatisfied && (!strictWatch || isPlaying) && (
              <div className="absolute bottom-2 right-2 px-3 py-1 rounded-full bg-black/70 backdrop-blur-md border border-white/10 text-xs font-semibold text-white pointer-events-none">
                Watching... {watchTarget - watchedSeconds}s
              </div>
            )}
            {watchSatisfied && (
              <div className="absolute bottom-2 right-2 px-3 py-1 rounded-full bg-green-600/90 backdrop-blur-md text-xs font-semibold text-white flex items-center gap-1 pointer-events-none">
                <CheckCircle2 className="w-3 h-3" /> Watch verified
              </div>
            )}
          </div>
          <div className="p-6 space-y-4">
            {actions.subscribe && (
              <ActionBtn label="Subscribe to Channel" icon={<Youtube className="w-5 h-5 text-white" />} colorBg="bg-red-600"
                done={completed.subscribe} loading={verifying.subscribe}
                onClick={() => verify("subscribe", `https://www.youtube.com/channel/${channelId}?sub_confirmation=1`)} />
            )}
            {actions.like && (
              <ActionBtn label="Like Video" icon={<ThumbsUp className="w-5 h-5 text-white" />} colorBg="bg-blue-600"
                done={completed.like} loading={verifying.like}
                onClick={() => verify("like", `https://www.youtube.com/watch?v=${videoId}`)} />
            )}
            {actions.comment && (
              <ActionBtn label="Comment on Video" icon={<MessageSquare className="w-5 h-5 text-white" />} colorBg="bg-green-600"
                done={completed.comment} loading={verifying.comment}
                onClick={() => verify("comment", `https://www.youtube.com/watch?v=${videoId}`)} />
            )}
            {actions.discord && (
              <ActionBtn label="Join Discord Server" icon={<DiscordIcon />} colorBg="bg-indigo-600"
                done={completed.discord} loading={verifying.discord}
                onClick={() => verify("discord", discordUrl || "https://discord.com")} />
            )}
          </div>
          <div className="p-6 bg-white/5 border-t border-white/5 space-y-3">
            {actionsDone && bonusClicks < 2 && (
              <Button
                onClick={handleBonusClick}
                className="w-full h-12 text-base font-bold bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white shadow-lg shadow-orange-500/25 animate-pulse"
              >
                <span className="flex items-center gap-2">
                  <ArrowRight className="w-5 h-5" />
                  Click this button {2 - bonusClicks} more time{2 - bonusClicks === 1 ? "" : "s"}
                </span>
              </Button>
            )}
            <Button
              className={`w-full h-12 text-lg font-bold transition-all duration-300 ${
                unlocked
                  ? "bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 shadow-lg shadow-purple-500/25"
                  : "bg-gray-700 text-gray-400 cursor-not-allowed"
              }`}
              onClick={handleUnlock}
              disabled={!unlocked}
            >
              {unlocked ? (
                <span className="flex items-center gap-2"><Download className="w-5 h-5" />Unlock Link</span>
              ) : (
                <span className="flex items-center gap-2"><Lock className="w-4 h-4" />Complete Steps to Unlock</span>
              )}
            </Button>
            {!actionsDone && <p className="text-center text-xs text-gray-500">Checking for completion automatically...</p>}
            {actionsDone && bonusClicks < 2 && <p className="text-center text-xs text-amber-400">One more step — click the orange button above to unlock!</p>}
          </div>
        </Card>
        <p className="text-center text-xs text-gray-600">Powered by Social Unlock (self-hosted • testing)</p>
      </div>
      <ComplianceFooter />
    </div>
  );
}

function DiscordIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white" aria-hidden="true">
      <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9459 2.4189-2.1568 2.4189Z" />
    </svg>
  );
}

function ActionBtn({ label, icon, colorBg, done, loading, onClick }: {
  label: string; icon: React.ReactNode; colorBg: string;
  done?: boolean; loading?: boolean; onClick: () => void;
}) {
  return (
    <Button
      variant="outline"
      className={`w-full h-14 justify-between group border-white/10 hover:bg-white/5 ${
        done ? "bg-green-500/10 border-green-500/50 hover:bg-green-500/20" : ""
      }`}
      onClick={onClick}
      disabled={done || loading}
    >
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${done ? "bg-green-500" : colorBg}`}>{icon}</div>
        <div className="text-left">
          <div className="font-semibold">{label}</div>
          <div className="text-xs text-muted-foreground">Required</div>
        </div>
      </div>
      {loading ? <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
        : done ? <CheckCircle2 className="w-5 h-5 text-green-500" />
        : <ArrowRight className="w-5 h-5 text-gray-500 group-hover:text-white transition-colors" />}
    </Button>
  );
}

/**
 * Gate player. In legacy mode (strict=false) it autoplays muted and force-resumes on pause
 * so the fixed countdown always ticks. In strict mode (the creator required "watch") it gives
 * the viewer real controls, does NOT force-resume, and reports play/pause up so the parent can
 * freeze the countdown and prompt them to resume.
 */
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
            // YT states: 1 = playing, 2 = paused, 0 = ended, 3 = buffering
            if (strict) {
              onPlayingChange?.(e.data === 1);
            } else if (e.data === 2 || e.data === 0) {
              // legacy: never let it stop
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

