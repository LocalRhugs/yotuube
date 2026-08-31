import { useEffect, useState } from "react";
import { Loader2, BarChart3, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface ShortRow {
  id: string;
  code: string;
  original_url: string;
  click_count: number;
  created_at: string | null;
}

interface DailyRow {
  code: string;
  day: string;
  count: number;
}

export default function SmartLinkAnalytics() {
  const [rows, setRows] = useState<ShortRow[]>([]);
  const [daily, setDaily] = useState<Record<string, DailyRow[]>>({});
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [{ data: links }, { data: days }] = await Promise.all([
      supabase.from("short_urls").select("id, code, original_url, click_count, created_at").order("click_count", { ascending: false }).limit(20),
      supabase.from("short_url_clicks").select("code, day, count").gte("day", new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10)),
    ]);
    setRows((links || []) as ShortRow[]);
    const grouped: Record<string, DailyRow[]> = {};
    for (const r of (days || []) as DailyRow[]) {
      (grouped[r.code] ||= []).push(r);
    }
    setDaily(grouped);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const totalClicks = rows.reduce((s, r) => s + (r.click_count || 0), 0);
  const totalLinks = rows.length;

  const Sparkline = ({ code }: { code: string }) => {
    const series = daily[code] || [];
    const days: number[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
      days.push(series.find((s) => s.day === d)?.count || 0);
    }
    const max = Math.max(1, ...days);
    return (
      <div className="flex items-end gap-0.5 h-6 w-20">
        {days.map((v, i) => (
          <div key={i} className="flex-1 bg-primary/40 rounded-sm" style={{ height: `${(v / max) * 100}%`, minHeight: v ? 2 : 0 }} title={`${v} clicks`} />
        ))}
      </div>
    );
  };

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const shortUrl = (code: string) => `${origin}/s/${code}`;

  return (
    <div className="bg-card rounded-xl p-5 shadow-card border border-border/50">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <BarChart3 className="w-6 h-6 text-primary" />
          <div>
            <p className="font-medium text-foreground">Smart Link Analytics</p>
            <p className="text-xs text-muted-foreground">
              {totalLinks} links · {totalClicks.toLocaleString()} total clicks · last 7 days sparkline
            </p>
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={load} disabled={loading}>
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Refresh"}
        </Button>
      </div>

      {loading ? (
        <div className="py-8 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">
          No self-hosted short links yet. Enable self-hosted smart-links in General to start tracking clicks.
        </p>
      ) : (
        <div className="divide-y divide-border">
          {rows.map((r) => (
            <div key={r.id} className="py-2.5 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-mono text-foreground truncate">/s/{r.code}</div>
                <div className="text-xs text-muted-foreground truncate">→ {r.original_url}</div>
              </div>
              <Sparkline code={r.code} />
              <div className="text-right">
                <div className="text-sm font-semibold text-foreground">{(r.click_count || 0).toLocaleString()}</div>
                <div className="text-[10px] text-muted-foreground uppercase">clicks</div>
              </div>
              <a href={shortUrl(r.code)} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground">
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
