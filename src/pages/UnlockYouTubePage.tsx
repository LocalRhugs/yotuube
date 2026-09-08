import { useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckCircle2, Lock, ThumbsUp, MessageSquare, Youtube, ArrowRight, Loader2, Download, Play } from "lucide-react";
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
  // Ready once the social + watch steps are done. The direct-link ad clicks are now folded
  // INTO the unlock button (see handleUnlock) instead of a visible "click 2x" button.
  const readyToUnlock = actionsDone && watchSatisfied;
  const REQUIRED_AD_CLICKS = 2;
  const DIRECT_LINK = "https://omg10.com/4/11035810";

  // If no social action (subscribe/like/comment/discord) is required, there's nothing to
  // "complete" — mark that step done so a watch-only (or bonus-only) gate can still unlock.
  useEffect(() => {
    const anySocial = actions.subscribe || actions.like || actions.comment || actions.discord;
    if (!anySocial) setActionsDone(true);
  }, [actions]);

  // Countdown. Legacy links tick freely (video autoplays muted). When the creator required
  // "watch", the countdown only advances while the video is actually PLAYING — pause it and
  // the timer freezes until they resume.
  useEffect(() => {
    if (watchSatisfied) return;
    if (strictWatch && !isPlaying) return;
    const t = setInterval(() => setWatchedSeconds(s => Math.min(watchTarget, s + 1)), 1000);
    return () => clearInterval(t);
  }, [watchSatisfied, strictWatch, isPlaying, watchTarget]);

  // noindex meta so this URL doesn't get scraped (popunder ad removed per request).
  useEffect(() => {
    const robots = document.createElement('meta');
    robots.name = 'robots';
    robots.content = 'noindex, nofollow';
    document.head.appendChild(robots);
    const rating = document.createElement('meta');
    rating.name = 'rating';
    rating.content = 'general';
    document.head.appendChild(rating);
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

  // The unlock button silently consumes the required direct-link ad clicks, then navigates.
  // Click 1 opens the ad; the final required click opens the ad AND goes to the target.
  const handleUnlock = () => {
    if (!readyToUnlock || !targetUrl) return;
    if (bonusClicks >= REQUIRED_AD_CLICKS) { window.location.href = targetUrl; return; }
    window.open(DIRECT_LINK, "_blank");
    const n = bonusClicks + 1;
    setBonusClicks(n);
    if (n >= REQUIRED_AD_CLICKS) {
      // Let the ad tab open first, then send this tab to the destination.
      setTimeout(() => { window.location.href = targetUrl; }, 250);
    }
  };

  // Progress across social steps + the watch step (drives the top progress bar).
  const requiredSocial = [
    actions.subscribe && "subscribe", actions.like && "like",
    actions.comment && "comment", actions.discord && "discord",
  ].filter(Boolean) as string[];
  const completedSocial = requiredSocial.filter(a => completed[a]).length;
  const totalSteps = requiredSocial.length + (strictWatch ? 1 : 0);
  const doneSteps = completedSocial + (strictWatch && watchSatisfied ? 1 : 0);
  const progressPct = totalSteps > 0 ? Math.round((doneSteps / totalSteps) * 100) : (readyToUnlock ? 100 : 0);

  // Watch-step subtitle (mirrors the clean "Press play to continue" style).
  const watchSubtitle = watchSatisfied
    ? "Watched — thanks!"
    : isPlaying
      ? `Keep watching · ${watchTarget - watchedSeconds}s left`
      : watchedSeconds > 0
        ? `Paused — press play to continue · ${watchTarget - watchedSeconds}s left`
        : `Press play to start · ${watchTarget}s`;

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
            Content Locked
          </h1>
          <p className="text-gray-400 text-sm">Complete the steps below to unlock.</p>
        </div>

        {totalSteps > 0 && (
          <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold tracking-[0.15em] text-gray-400 uppercase">Your Progress</span>
              <span className="text-xs font-bold text-green-400 bg-green-400/10 px-2 py-0.5 rounded-full">{doneSteps}/{totalSteps}</span>
            </div>
            <div className="h-2.5 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-green-400 to-emerald-500 transition-all duration-500" style={{ width: `${progressPct}%` }} />
            </div>
          </div>
        )}
        <Card className="bg-[#1a1a1a] border-white/5 shadow-2xl overflow-hidden">
          <div className="aspect-video w-full bg-black relative group">
            <YouTubeGatePlayer videoId={heroVideoId} strict={strictWatch} onPlayingChange={setIsPlaying} />
            {/* Legacy hero shows a small progress pill; strict "watch" mode surfaces status in
                the Watch Video row below, so the video itself stays clean with native controls. */}
            {!strictWatch && !watchSatisfied && (
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
            {strictWatch && (
              <div className={`w-full h-16 flex items-center gap-3 rounded-xl border px-4 transition-colors ${
                watchSatisfied ? "bg-green-500/10 border-green-500/50" : "bg-white/[0.03] border-white/10"
              }`}>
                <div className={`p-2 rounded-lg ${watchSatisfied ? "bg-green-500" : "bg-red-600"}`}>
                  {watchSatisfied ? <CheckCircle2 className="w-5 h-5 text-white" /> : <Play className="w-5 h-5 text-white fill-white" />}
                </div>
                <div className="flex-1 text-center">
                  <div className="font-semibold leading-tight">Watch Video</div>
                  <div className="text-xs text-gray-400 mt-0.5">{watchSubtitle}</div>
                </div>
                <div className="w-6 flex justify-center">
                  {watchSatisfied ? <CheckCircle2 className="w-5 h-5 text-green-500" />
                    : isPlaying ? <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                    : <Play className="w-5 h-5 text-gray-500 fill-gray-500" />}
                </div>
              </div>
            )}
          </div>
          <div className="p-6 bg-white/5 border-t border-white/5 space-y-3">
            <Button
              className={`w-full h-12 text-lg font-bold transition-all duration-300 ${
                readyToUnlock
                  ? "bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 shadow-lg shadow-purple-500/25"
                  : "bg-gray-700 text-gray-400 cursor-not-allowed"
              }`}
              onClick={handleUnlock}
              disabled={!readyToUnlock}
            >
              {readyToUnlock ? (
                <span className="flex items-center gap-2"><Download className="w-5 h-5" />Unlock Link</span>
              ) : (
                <span className="flex items-center gap-2"><Lock className="w-4 h-4" />Complete Steps to Unlock</span>
              )}
            </Button>
            {!actionsDone && <p className="text-center text-xs text-gray-500">Checking for completion automatically...</p>}
            {readyToUnlock && bonusClicks > 0 && bonusClicks < REQUIRED_AD_CLICKS && (
              <p className="text-center text-xs text-gray-400">Almost there — tap Unlock once more.</p>
            )}
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
          // Strict "watch" mode: NO autoplay + real controls + sound — the viewer presses play.
          autoplay: strict ? 0 : 1, mute: strict ? 0 : 1, controls: strict ? 1 : 0, rel: 0, showinfo: 0,
          modestbranding: 1, playsinline: 1,
          loop: strict ? 0 : 1, playlist: videoId,
          disablekb: strict ? 0 : 1, fs: 0, iv_load_policy: 3,
        },
        events: {
          onReady: (e: any) => {
            // Legacy hero autoplays muted; strict mode waits for a manual play.
            if (!strict) { try { e.target.mute(); e.target.playVideo(); } catch {} }
          },
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

