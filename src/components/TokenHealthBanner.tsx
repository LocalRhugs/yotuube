import { useEffect, useState } from "react";
import { AlertTriangle, Loader2, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { checkYouTubeTokenHealth, getYouTubeAuthUrl, validateYouTubeConfig } from "@/lib/youtube-api";
import { toast } from "sonner";

interface BrokenChannel {
  id: string;
  channelTitle: string;
  error: string;
}

const POLL_MS = 10 * 60 * 1000; // 10 min
const DISMISS_KEY = "tokenHealthDismissedAt";

export default function TokenHealthBanner() {
  const [broken, setBroken] = useState<BrokenChannel[]>([]);
  const [loading, setLoading] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const runCheck = async () => {
    setLoading(true);
    const res = await checkYouTubeTokenHealth();
    if (res.success && Array.isArray(res.data?.channels)) {
      const bad: BrokenChannel[] = res.data.channels
        .filter((c: any) => !c.healthy)
        .map((c: any) => ({ id: c.id, channelTitle: c.channelTitle || "Channel", error: c.error || "Token expired" }));
      setBroken(bad);
    }
    setLoading(false);
  };

  useEffect(() => {
    // Respect a 1-hour dismiss
    const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) || 0);
    if (Date.now() - dismissedAt < 60 * 60 * 1000) setDismissed(true);

    runCheck();
    const id = setInterval(runCheck, POLL_MS);
    return () => clearInterval(id);
  }, []);

  const handleReconnect = async () => {
    setReconnecting(true);
    const redirectUri = `${window.location.origin}/youtube-callback`;
    const validation = await validateYouTubeConfig(redirectUri);
    if (!validation.success || !validation.data?.valid) {
      toast.error("OAuth config invalid", { description: validation.data?.issues?.join(". ") || validation.error });
      setReconnecting(false);
      return;
    }
    const res = await getYouTubeAuthUrl(redirectUri);
    if (res.success && res.data?.url) {
      window.location.href = res.data.url;
    } else {
      toast.error(res.error || "Failed to start reconnect");
      setReconnecting(false);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setDismissed(true);
  };

  if (dismissed || broken.length === 0) return null;

  return (
    <div className="sticky top-0 z-50 bg-destructive/15 border-b border-destructive/40 backdrop-blur">
      <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center gap-3">
        <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0" />
        <div className="flex-1 text-sm">
          <span className="font-semibold text-destructive">
            {broken.length} YouTube channel{broken.length > 1 ? "s" : ""} need{broken.length > 1 ? "" : "s"} reconnect:
          </span>{" "}
          <span className="text-muted-foreground">
            {broken.map((c) => c.channelTitle).join(", ")}
          </span>
        </div>
        <Button size="sm" variant="destructive" onClick={handleReconnect} disabled={reconnecting}>
          {reconnecting ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5 mr-1.5" />}
          Reconnect now
        </Button>
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={runCheck} disabled={loading} title="Re-check">
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
        </Button>
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleDismiss} title="Dismiss for 1 hour">
          <X className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}
