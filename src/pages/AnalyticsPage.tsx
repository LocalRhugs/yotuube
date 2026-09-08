import { motion } from "framer-motion";
import { Eye, Users, Film, Loader2, RefreshCw, TrendingUp, TrendingDown, Minus, Rocket, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import StatCard from "@/components/StatCard";
import { useEffect, useMemo, useState } from "react";
import { getAllChannelStats, getChannelSnapshots, getRecentPerformance } from "@/lib/youtube-api";
import { Smartphone, Film as FilmIcon } from "lucide-react";

interface ChannelStat {
  id: string; channelId: string; title: string;
  subscriberCount: number; videoCount: number; viewCount: number;
  hiddenSubs?: boolean; thumbnail?: string;
}
interface Snap { channel_id: string; title: string; subs: number; views: number; videos: number; day: string; }
interface Perf {
  id: string; channelId: string; title: string;
  recentCount: number; avgViews: number;
  shortsCount: number; shortsAvg: number; longCount: number; longAvg: number;
  best: { id: string; title: string; views: number; isShort: boolean } | null;
}

const fmt = (n: number) => {
  if (!n || isNaN(n)) return "0";
  if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (Math.abs(n) >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toLocaleString();
};
const signed = (n: number) => (n > 0 ? "+" : "") + fmt(n);

type Period = 7 | 30 | 3650;

const AnalyticsPage = () => {
  const [channels, setChannels] = useState<ChannelStat[]>([]);
  const [snaps, setSnaps] = useState<Snap[]>([]);
  const [perf, setPerf] = useState<Perf[]>([]);
  const [loading, setLoading] = useState(true);
  const [perfLoading, setPerfLoading] = useState(true);
  const [period, setPeriod] = useState<Period>(7);

  const load = async () => {
    setLoading(true); setPerfLoading(true);
    const [statsRes, snapRes] = await Promise.all([getAllChannelStats(), getChannelSnapshots()]);
    if (statsRes.success && statsRes.data?.channels) setChannels(statsRes.data.channels);
    if (snapRes.success && snapRes.data?.snapshots) setSnaps(snapRes.data.snapshots);
    setLoading(false);
    // Recent-upload performance is a heavier call — load it after the fast stuff paints.
    const perfRes = await getRecentPerformance();
    if (perfRes.success && perfRes.data?.channels) setPerf(perfRes.data.channels);
    setPerfLoading(false);
  };
  useEffect(() => { load(); }, []);

  // series[channelId] = snapshots sorted by day asc
  const series = useMemo(() => {
    const m = new Map<string, Snap[]>();
    for (const s of snaps) {
      if (!m.has(s.channel_id)) m.set(s.channel_id, []);
      m.get(s.channel_id)!.push(s);
    }
    for (const arr of m.values()) arr.sort((a, b) => a.day.localeCompare(b.day));
    return m;
  }, [snaps]);

  // baseline snapshot for the selected period (nearest on/older than cutoff, else earliest)
  const cutoff = useMemo(() => {
    const d = new Date(); d.setDate(d.getDate() - period);
    return d.toISOString().slice(0, 10);
  }, [period]);

  const rows = useMemo(() => {
    return channels.map(c => {
      const hist = series.get(c.channelId) || [];
      let base: Snap | undefined;
      for (const s of hist) { if (s.day <= cutoff) base = s; }        // latest at/older than cutoff
      if (!base && hist.length) base = hist[0];                       // else earliest we have
      const dSubs = base ? c.subscriberCount - base.subs : null;
      const dViews = base ? c.viewCount - base.views : null;
      const dVideos = base ? c.videoCount - base.videos : null;
      const pct = base && base.subs > 0 && dSubs !== null ? (dSubs / base.subs) * 100 : null;
      return { c, base, dSubs, dViews, dVideos, pct, hist };
    });
  }, [channels, series, cutoff]);

  const sortedRows = useMemo(() => [...rows].sort((a, b) => (b.dSubs ?? -1) - (a.dSubs ?? -1)), [rows]);

  const totals = channels.reduce((a, c) => ({ subs: a.subs + c.subscriberCount, views: a.views + c.viewCount, videos: a.videos + c.videoCount }), { subs: 0, views: 0, videos: 0 });
  const totalDeltaSubs = rows.reduce((a, r) => a + (r.dSubs ?? 0), 0);
  const totalDeltaViews = rows.reduce((a, r) => a + (r.dViews ?? 0), 0);
  const haveHistory = rows.some(r => r.base && r.dSubs !== null);

  // Movers
  const withDelta = rows.filter(r => r.dSubs !== null);
  const grower = withDelta.length ? withDelta.reduce((a, b) => (b.dSubs! > a.dSubs! ? b : a)) : null;
  const stuck = withDelta.length ? withDelta.reduce((a, b) => (b.dSubs! < a.dSubs! ? b : a)) : null;

  const periodLabel = period === 7 ? "7 days" : period === 30 ? "30 days" : "all time";

  return (
    <div className="space-y-8">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-display font-bold text-foreground">Analytics</h1>
          <p className="text-muted-foreground">Growth across all YouTube channels · vs {periodLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 p-1 rounded-lg bg-muted/50">
            {([7, 30, 3650] as Period[]).map(p => (
              <button key={p} onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${period === p ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                {p === 7 ? "7d" : p === 30 ? "30d" : "All"}
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-1 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>
      </motion.div>

      {/* Totals with movement */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Subscribers" value={loading ? "…" : fmt(totals.subs)} icon={Users} platform="youtube"
          change={haveHistory ? `${signed(totalDeltaSubs)} vs ${periodLabel}` : "history building…"}
          changeType={totalDeltaSubs > 0 ? "positive" : totalDeltaSubs < 0 ? "negative" : "neutral"} />
        <StatCard title="Total Views" value={loading ? "…" : fmt(totals.views)} icon={Eye} platform="youtube"
          change={haveHistory ? `${signed(totalDeltaViews)} vs ${periodLabel}` : "history building…"}
          changeType={totalDeltaViews > 0 ? "positive" : totalDeltaViews < 0 ? "negative" : "neutral"} />
        <StatCard title="Total Videos" value={loading ? "…" : fmt(totals.videos)} icon={Film} platform="youtube" />
        <StatCard title="Channels" value={loading ? "…" : String(channels.length)} icon={Users} platform="youtube" />
      </div>

      {/* Movers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <MoverCard title="Growing the most" icon={<Rocket className="w-5 h-5" />} tone="pos"
          mover={grower} periodLabel={periodLabel} empty="No growth data yet" />
        <MoverCard title="Most stuck" icon={<Moon className="w-5 h-5" />} tone="neg"
          mover={stuck} periodLabel={periodLabel} empty="No growth data yet" />
      </div>

      {/* Per-channel growth table */}
      <div className="bg-card rounded-xl shadow-card border border-border/50 overflow-hidden">
        <div className="px-5 py-4 border-b border-border/50 flex items-center justify-between">
          <h3 className="font-display font-semibold text-foreground">Channels · sorted by subscribers gained</h3>
          {!haveHistory && !loading && (
            <span className="text-xs text-muted-foreground">Deltas fill in as daily snapshots accumulate</span>
          )}
        </div>
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : channels.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-muted-foreground">No YouTube channels connected.</p>
        ) : (
          <div className="divide-y divide-border/40">
            {sortedRows.map(({ c, dSubs, dViews, pct, hist }) => (
              <div key={c.id} className="px-5 py-3 flex items-center gap-4">
                {c.thumbnail
                  ? <img src={c.thumbnail} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" />
                  : <div className="w-9 h-9 rounded-full bg-muted shrink-0" />}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">{c.title}</p>
                  <p className="text-xs text-muted-foreground">{c.hiddenSubs ? "subs hidden" : fmt(c.subscriberCount) + " subs"} · {fmt(c.viewCount)} views</p>
                </div>
                <Sparkline values={hist.map(h => h.subs)} />
                <div className="w-24 text-right shrink-0">
                  <Delta value={dSubs} />
                  <p className="text-[11px] text-muted-foreground">subs {pct !== null ? `(${pct > 0 ? "+" : ""}${pct.toFixed(1)}%)` : ""}</p>
                </div>
                <div className="hidden sm:block w-24 text-right shrink-0">
                  <Delta value={dViews} />
                  <p className="text-[11px] text-muted-foreground">views</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent uploads performance — which format & which channels actually pull views */}
      <div className="bg-card rounded-xl shadow-card border border-border/50 overflow-hidden">
        <div className="px-5 py-4 border-b border-border/50">
          <h3 className="font-display font-semibold text-foreground">Recent Uploads Performance</h3>
          <p className="text-xs text-muted-foreground">Last ~20 uploads per channel · avg views + Shorts vs Long-form</p>
        </div>
        {perfLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : perf.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-muted-foreground">No recent uploads found.</p>
        ) : (
          <div className="divide-y divide-border/40">
            {[...perf].sort((a, b) => b.avgViews - a.avgViews).map(p => {
              const winner = p.shortsCount && p.longCount
                ? (p.shortsAvg > p.longAvg ? "short" : p.longAvg > p.shortsAvg ? "long" : "tie")
                : p.shortsCount ? "short" : p.longCount ? "long" : "none";
              return (
                <div key={p.id} className="px-5 py-3 flex items-center gap-4 flex-wrap sm:flex-nowrap">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">{p.title}</p>
                    <p className="text-xs text-muted-foreground">{p.recentCount} recent · <span className="text-foreground font-semibold">{fmt(p.avgViews)}</span> avg views/vid</p>
                  </div>
                  <div className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg ${winner === "short" ? "bg-red-500/10 text-red-400 ring-1 ring-red-500/30" : "text-muted-foreground"}`}>
                    <Smartphone className="w-3.5 h-3.5" /> {fmt(p.shortsAvg)} <span className="opacity-60">({p.shortsCount})</span>
                  </div>
                  <div className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg ${winner === "long" ? "bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/30" : "text-muted-foreground"}`}>
                    <FilmIcon className="w-3.5 h-3.5" /> {fmt(p.longAvg)} <span className="opacity-60">({p.longCount})</span>
                  </div>
                  <div className="hidden lg:block w-64 min-w-0">
                    {p.best && (
                      <p className="text-xs text-muted-foreground truncate" title={p.best.title}>
                        🏆 {fmt(p.best.views)} · {p.best.isShort ? "Short" : "Long"} — {p.best.title}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <div className="px-5 py-3 border-t border-border/40 flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><Smartphone className="w-3 h-3 text-red-400" /> Shorts avg (count)</span>
          <span className="flex items-center gap-1"><FilmIcon className="w-3 h-3 text-blue-400" /> Long avg (count)</span>
          <span>· highlighted = the format winning on that channel</span>
        </div>
      </div>

      {!haveHistory && !loading && channels.length > 0 && (
        <p className="text-center text-xs text-muted-foreground">
          📈 Growth tracking started today. Come back tomorrow (and beyond) to see day-over-day and month-over-month movement per channel.
        </p>
      )}
    </div>
  );
};

function Delta({ value }: { value: number | null }) {
  if (value === null) return <p className="text-sm font-bold text-muted-foreground">—</p>;
  const cls = value > 0 ? "text-success" : value < 0 ? "text-destructive" : "text-muted-foreground";
  const Icon = value > 0 ? TrendingUp : value < 0 ? TrendingDown : Minus;
  return (
    <p className={`text-sm font-bold flex items-center justify-end gap-1 ${cls}`}>
      <Icon className="w-3.5 h-3.5" />{signed(value)}
    </p>
  );
}

function MoverCard({ title, icon, tone, mover, periodLabel, empty }: {
  title: string; icon: React.ReactNode; tone: "pos" | "neg";
  mover: { c: ChannelStat; dSubs: number | null; pct: number | null } | null; periodLabel: string; empty: string;
}) {
  const accent = tone === "pos" ? "text-success" : "text-amber-400";
  return (
    <div className="bg-card rounded-xl p-5 shadow-card border border-border/50">
      <div className="flex items-center gap-2 mb-3">
        <span className={accent}>{icon}</span>
        <h3 className="font-display font-semibold text-foreground">{title}</h3>
        <span className="text-xs text-muted-foreground ml-auto">vs {periodLabel}</span>
      </div>
      {!mover || mover.dSubs === null ? (
        <p className="text-sm text-muted-foreground">{empty}</p>
      ) : (
        <div className="flex items-center gap-3">
          {mover.c.thumbnail ? <img src={mover.c.thumbnail} alt="" className="w-10 h-10 rounded-full" /> : <div className="w-10 h-10 rounded-full bg-muted" />}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground truncate">{mover.c.title}</p>
            <p className="text-xs text-muted-foreground">{fmt(mover.c.subscriberCount)} subs</p>
          </div>
          <div className="text-right">
            <p className={`text-lg font-bold ${tone === "pos" ? "text-success" : "text-amber-400"}`}>{signed(mover.dSubs)}</p>
            <p className="text-[11px] text-muted-foreground">{mover.pct !== null ? `${mover.pct > 0 ? "+" : ""}${mover.pct.toFixed(1)}%` : ""} subs</p>
          </div>
        </div>
      )}
    </div>
  );
}

// Tiny inline sparkline of a channel's subscriber snapshots.
function Sparkline({ values }: { values: number[] }) {
  if (!values || values.length < 2) return <div className="hidden md:block w-20" />;
  const w = 80, h = 24;
  const min = Math.min(...values), max = Math.max(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w;
    const y = h - ((v - min) / span) * h;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  const up = values[values.length - 1] >= values[0];
  return (
    <svg width={w} height={h} className="hidden md:block shrink-0" aria-hidden>
      <polyline points={pts} fill="none" stroke={up ? "hsl(var(--success))" : "hsl(var(--destructive))"} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

export default AnalyticsPage;
