import { motion } from "framer-motion";
import StatCard from "@/components/StatCard";
import {
  Youtube, Facebook, Instagram, Eye, Users, Video, Loader2, RefreshCw, Upload, CalendarDays
} from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { getFacebookPages, getInstagramAccount } from "@/lib/facebook-api";
import { getAllChannelStats } from "@/lib/youtube-api";
import { getUploadHistory } from "@/lib/upload-history";

interface ChannelStat {
  id: string; channelId: string; title: string; clientId?: string;
  subscriberCount: number; videoCount: number; viewCount: number;
  hiddenSubs?: boolean; thumbnail?: string;
}

const fmt = (n: number) => {
  if (!n || isNaN(n)) return "0";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toLocaleString();
};

const Dashboard = () => {
  const [yt, setYt] = useState<ChannelStat[]>([]);
  const [ytLoading, setYtLoading] = useState(true);
  const [fbData, setFbData] = useState<{ pages: number; followers: number }>({ pages: 0, followers: 0 });
  const [igData, setIgData] = useState<{ accounts: number; followers: number }>({ accounts: 0, followers: 0 });
  const [fbLoading, setFbLoading] = useState(true);

  // Upload activity from local history
  const [activity, setActivity] = useState({ today: 0, week: 0, total: 0 });

  const loadYouTube = async () => {
    setYtLoading(true);
    const res = await getAllChannelStats();
    if (res.success && res.data?.channels) {
      const chans: ChannelStat[] = res.data.channels;
      chans.sort((a, b) => b.subscriberCount - a.subscriberCount);
      setYt(chans);
    }
    setYtLoading(false);
  };

  const computeActivity = () => {
    try {
      const hist = getUploadHistory();
      const now = Date.now();
      const dayMs = 86400000;
      const startToday = new Date(); startToday.setHours(0, 0, 0, 0);
      let today = 0, week = 0;
      for (const h of hist) {
        const t = new Date(h.uploadedAt).getTime();
        if (isNaN(t)) continue;
        if (t >= startToday.getTime()) today++;
        if (now - t <= 7 * dayMs) week++;
      }
      setActivity({ today, week, total: hist.length });
    } catch { /* ignore */ }
  };

  useEffect(() => {
    loadYouTube();
    computeActivity();
    (async () => {
      setFbLoading(true);
      const res = await getFacebookPages();
      if (res.success && res.data?.data) {
        const pages = res.data.data;
        let fbFollowers = 0, igAccounts = 0, igFollowers = 0;
        for (const page of pages) {
          fbFollowers += page.fan_count || 0;
          const igRes = await getInstagramAccount(page.id);
          if (igRes.success && igRes.data?.instagram_business_account) {
            igAccounts++;
            igFollowers += igRes.data.instagram_business_account.followers_count || 0;
          }
        }
        setFbData({ pages: pages.length, followers: fbFollowers });
        setIgData({ accounts: igAccounts, followers: igFollowers });
      }
      setFbLoading(false);
    })();
  }, []);

  const totals = yt.reduce(
    (a, c) => ({ subs: a.subs + c.subscriberCount, views: a.views + c.viewCount, videos: a.videos + c.videoCount }),
    { subs: 0, views: 0, videos: 0 }
  );
  const maxSubs = Math.max(1, ...yt.map(c => c.subscriberCount));

  return (
    <div className="space-y-8">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-display font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Track your progress across all channels</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => { loadYouTube(); computeActivity(); }} disabled={ytLoading}>
          <RefreshCw className={`w-4 h-4 mr-1 ${ytLoading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </motion.div>

      {/* YouTube totals */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="YouTube Channels" value={ytLoading ? "…" : String(yt.length)} icon={Youtube} platform="youtube" />
        <StatCard title="Total Subscribers" value={ytLoading ? "…" : fmt(totals.subs)} icon={Users} platform="youtube" />
        <StatCard title="Total Views" value={ytLoading ? "…" : fmt(totals.views)} icon={Eye} platform="youtube" />
        <StatCard title="Total Videos" value={ytLoading ? "…" : fmt(totals.videos)} icon={Video} platform="youtube" />
      </div>

      {/* Upload activity (from this device's upload history) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card rounded-xl p-5 shadow-card border border-border/50 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary"><Upload className="w-5 h-5" /></div>
          <div><p className="text-2xl font-display font-bold text-foreground">{activity.today}</p><p className="text-xs text-muted-foreground">Uploads today</p></div>
        </div>
        <div className="bg-card rounded-xl p-5 shadow-card border border-border/50 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary"><CalendarDays className="w-5 h-5" /></div>
          <div><p className="text-2xl font-display font-bold text-foreground">{activity.week}</p><p className="text-xs text-muted-foreground">Uploads this week</p></div>
        </div>
        <div className="bg-card rounded-xl p-5 shadow-card border border-border/50 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-muted-foreground"><Video className="w-5 h-5" /></div>
          <div><p className="text-2xl font-display font-bold text-foreground">{activity.total}</p><p className="text-xs text-muted-foreground">Uploads tracked (all-time)</p></div>
        </div>
      </div>

      {/* Per-channel progress */}
      <div className="bg-card rounded-xl shadow-card border border-border/50 overflow-hidden">
        <div className="px-5 py-4 border-b border-border/50 flex items-center gap-2">
          <Youtube className="w-4 h-4 text-youtube" />
          <h3 className="font-display font-semibold text-foreground">Channels</h3>
          <span className="text-xs text-muted-foreground">· sorted by subscribers</span>
        </div>
        {ytLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : yt.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-muted-foreground">No YouTube channels connected. Add them in Settings.</p>
        ) : (
          <div className="divide-y divide-border/40">
            {yt.map((c, i) => (
              <div key={c.id} className="px-5 py-3 flex items-center gap-4">
                <span className="text-xs text-muted-foreground w-5 text-right">{i + 1}</span>
                {c.thumbnail
                  ? <img src={c.thumbnail} alt="" className="w-9 h-9 rounded-full object-cover" />
                  : <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-youtube"><Youtube className="w-4 h-4" /></div>}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{c.title}</p>
                  <div className="mt-1 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-red-500 to-orange-500" style={{ width: `${Math.round((c.subscriberCount / maxSubs) * 100)}%` }} />
                  </div>
                </div>
                <div className="hidden sm:flex items-center gap-5 text-xs text-muted-foreground shrink-0 w-56 justify-end">
                  <span className="flex items-center gap-1" title="Subscribers"><Users className="w-3 h-3" />{c.hiddenSubs ? "—" : fmt(c.subscriberCount)}</span>
                  <span className="flex items-center gap-1" title="Videos"><Video className="w-3 h-3" />{fmt(c.videoCount)}</span>
                  <span className="flex items-center gap-1" title="Views"><Eye className="w-3 h-3" />{fmt(c.viewCount)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Facebook / Instagram (secondary) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-card rounded-xl p-5 shadow-card border border-border/50">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center text-facebook"><Facebook className="w-5 h-5" /></div>
            <div>
              <h3 className="font-display font-semibold text-foreground">Facebook</h3>
              <p className="text-xs text-muted-foreground">{fbLoading ? "Loading…" : `${fbData.pages} page${fbData.pages !== 1 ? "s" : ""} connected`}</p>
            </div>
          </div>
          {!fbLoading && <p className="text-sm text-muted-foreground">{fbData.followers.toLocaleString()} followers</p>}
        </div>
        <div className="bg-card rounded-xl p-5 shadow-card border border-border/50">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center text-instagram"><Instagram className="w-5 h-5" /></div>
            <div>
              <h3 className="font-display font-semibold text-foreground">Instagram</h3>
              <p className="text-xs text-muted-foreground">{fbLoading ? "Loading…" : igData.accounts > 0 ? `${igData.accounts} account${igData.accounts !== 1 ? "s" : ""} linked` : "No accounts linked"}</p>
            </div>
          </div>
          {!fbLoading && igData.accounts > 0 && <p className="text-sm text-muted-foreground">{igData.followers.toLocaleString()} followers</p>}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
