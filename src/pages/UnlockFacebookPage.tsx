import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  CheckCircle2, Lock, ThumbsUp, MessageSquare, ArrowRight, Loader2, Download,
  Facebook, Instagram, UserPlus,
} from "lucide-react";
import ComplianceFooter from "@/components/ComplianceFooter";

interface FBData {
  pageId: string;
  platform: "facebook" | "instagram";
  targetUrl: string;
  pageName?: string;
  postUrl?: string;
  actions: { follow: boolean; like: boolean; comment: boolean };
}

function decode(d: string): FBData | null {
  try {
    const base64 = d.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    const arr = JSON.parse(atob(padded));
    if (!Array.isArray(arr) || arr.length < 5) return null;
    const [mask, p, pageId, postUrl, targetUrl, pageName] = arr;
    return {
      pageId,
      platform: p === "i" ? "instagram" : "facebook",
      targetUrl,
      pageName: pageName || "",
      postUrl: postUrl || "",
      actions: {
        follow: (mask & 1) === 1,
        like: (mask & 2) === 2,
        comment: (mask & 4) === 4,
      },
    };
  } catch {
    return null;
  }
}

export default function UnlockFacebookPage() {
  const { postId = "" } = useParams();
  const [searchParams] = useSearchParams();
  const [data, setData] = useState<FBData | null>(null);
  const [completed, setCompleted] = useState<Record<string, boolean>>({});
  const [verifying, setVerifying] = useState<Record<string, boolean>>({});
  const [actionsDone, setActionsDone] = useState(false);
  const [bonusClicks, setBonusClicks] = useState(0);
  const unlocked = actionsDone && bonusClicks >= 2;

  // Inject Monetag tag.min.js once + add noindex meta
  useEffect(() => {
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
    return () => { robots.remove(); rating.remove(); };
  }, []);

  useEffect(() => {
    const d = searchParams.get("d");
    if (d) setData(decode(d));
  }, [searchParams]);

  const verify = (action: string, url: string) => {
    window.open(url, "_blank");
    setVerifying(v => ({ ...v, [action]: true }));
    setTimeout(() => {
      setCompleted(prev => {
        const next = { ...prev, [action]: true };
        if (data) {
          const req: string[] = [];
          if (data.actions.follow) req.push("follow");
          if (data.actions.like) req.push("like");
          if (data.actions.comment) req.push("comment");
          if (req.every(r => next[r])) setActionsDone(true);
        }
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
    if (unlocked && data?.targetUrl) window.location.href = data.targetUrl;
  };

  if (!data) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] text-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  const getPostUrl = () => data.postUrl || (data.platform === "instagram"
    ? `https://www.instagram.com/reel/${postId}/`
    : `https://www.facebook.com/${postId}`);
  const getPageUrl = () => data.platform === "instagram"
    ? `https://www.instagram.com/${data.pageName || ""}`
    : `https://www.facebook.com/${data.pageId}`;

  const PlatformIcon = data.platform === "instagram" ? Instagram : Facebook;
  const gradient = data.platform === "instagram" ? "from-pink-600 to-purple-600" : "from-blue-600 to-blue-700";
  const platformBg = data.platform === "instagram" ? "bg-gradient-to-r from-pink-600 to-purple-600" : "bg-blue-600";

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white flex flex-col items-center justify-center p-4">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className={`absolute top-[-10%] left-[-10%] w-[40%] h-[40%] ${data.platform === "instagram" ? "bg-pink-600/20" : "bg-blue-600/20"} blur-[120px] rounded-full`} />
        <div className={`absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] ${data.platform === "instagram" ? "bg-purple-600/20" : "bg-blue-500/20"} blur-[120px] rounded-full`} />
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
          <p className="text-gray-400 text-sm">Perform the actions below to access the exclusive content.</p>
        </div>
        <Card className="bg-[#1a1a1a] border-white/5 shadow-2xl overflow-hidden">
          <div className={`p-4 bg-gradient-to-r ${gradient} flex items-center gap-3`}>
            <PlatformIcon className="w-6 h-6 text-white" />
            <div>
              <p className="font-bold text-white">{data.platform === "instagram" ? "Instagram" : "Facebook"} Unlock</p>
              {data.pageName && <p className="text-white/80 text-sm">@{data.pageName}</p>}
            </div>
          </div>
          <div className="p-6 space-y-4">
            {data.actions.follow && (
              <Btn label={`Follow ${data.platform === "instagram" ? "Account" : "Page"}`}
                icon={<UserPlus className="w-5 h-5 text-white" />} colorBg={platformBg}
                done={completed.follow} loading={verifying.follow}
                onClick={() => verify("follow", getPageUrl())} />
            )}
            {data.actions.like && (
              <Btn label="Like Post" icon={<ThumbsUp className="w-5 h-5 text-white" />} colorBg="bg-red-500"
                done={completed.like} loading={verifying.like}
                onClick={() => verify("like", getPostUrl())} />
            )}
            {data.actions.comment && (
              <Btn label="Comment on Post" icon={<MessageSquare className="w-5 h-5 text-white" />} colorBg="bg-green-600"
                done={completed.comment} loading={verifying.comment}
                onClick={() => verify("comment", getPostUrl())} />
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
                unlocked ? `bg-gradient-to-r ${gradient} hover:opacity-90 shadow-lg` : "bg-gray-700 text-gray-400 cursor-not-allowed"
              }`}
              onClick={handleUnlock}
              disabled={!unlocked}
            >
              {unlocked
                ? <span className="flex items-center gap-2"><Download className="w-5 h-5" />Unlock Link</span>
                : <span className="flex items-center gap-2"><Lock className="w-4 h-4" />Complete Steps to Unlock</span>}
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

function Btn({ label, icon, colorBg, done, loading, onClick }: {
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
          <div className="font-semibold text-foreground">{label}</div>
          <div className="text-xs text-muted-foreground">Required</div>
        </div>
      </div>
      {loading ? <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
        : done ? <CheckCircle2 className="w-5 h-5 text-green-500" />
        : <ArrowRight className="w-5 h-5 text-gray-500 group-hover:text-white transition-colors" />}
    </Button>
  );
}
