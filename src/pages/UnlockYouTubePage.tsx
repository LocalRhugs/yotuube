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
  const [actions, setActions] = useState({ subscribe: true, like: true, comment: false });
  const [completed, setCompleted] = useState<Record<string, boolean>>({});
  const [verifying, setVerifying] = useState<Record<string, boolean>>({});
  const [actionsDone, setActionsDone] = useState(false);
  const [bonusClicks, setBonusClicks] = useState(0);
  const [watchedSeconds, setWatchedSeconds] = useState(0);
  const watchSatisfied = watchedSeconds >= 6;
  const unlocked = actionsDone && bonusClicks >= 2 && watchSatisfied;

  // Count up to 6 seconds while the page is open (video autoplays muted below)
  useEffect(() => {
    if (watchSatisfied) return;
    const t = setInterval(() => setWatchedSeconds(s => Math.min(6, s + 1)), 1000);
    return () => clearInterval(t);
  }, [watchSatisfied]);

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
      if (Array.isArray(decoded) && decoded.length === 3) {
        const [mask, cId, tUrl] = decoded;
        const fullChannelId = typeof cId === "string" && cId.length === 22 ? `UC${cId}` : cId;
        setChannelId(fullChannelId);
        setTargetUrl(tUrl);
        setActions({
          subscribe: (mask & 1) === 1,
          like: (mask & 2) === 2,
          comment: (mask & 4) === 4,
        });
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
            <YouTubeAutoplayer videoId={videoId} />
            {!watchSatisfied && (
              <div className="absolute bottom-2 right-2 px-3 py-1 rounded-full bg-black/70 backdrop-blur-md border border-white/10 text-xs font-semibold text-white pointer-events-none">
                Watching... {6 - watchedSeconds}s
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

function YouTubeAutoplayer({ videoId }: { videoId: string }) {
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
          autoplay: 1, mute: 1, controls: 0, rel: 0, showinfo: 0,
          modestbranding: 1, playsinline: 1, loop: 1, playlist: videoId,
          disablekb: 1, fs: 0, iv_load_policy: 3,
        },
        events: {
          onReady: (e: any) => { try { e.target.mute(); e.target.playVideo(); } catch {} },
          onStateChange: (e: any) => {
            // 2 = paused, 0 = ended → force resume
            if (e.data === 2 || e.data === 0) {
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
  }, [videoId]);

  return <div ref={containerRef} className="w-full h-full" />;
}

