import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  BarChart3, Cloud, Copy, ExternalLink, Flame, Home, LayoutGrid,
  Link2, Lock, LogOut, MousePointerClick, Plus, Search, Settings2,
  Sparkles, Trash2, Youtube, ThumbsUp, MessageSquare, Wand2, Check,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

type LinkMeta = {
  videoId?: string;
  channelId?: string;
  requireSubscribe?: boolean;
  requireLike?: boolean;
  requireComment?: boolean;
};

type SmartLink = {
  id: string;
  slug: string;
  title: string | null;
  description: string | null;
  destination_url: string;
  clicks: number;
  created_at: string;
  metadata: LinkMeta | null;
};

type Tab = "overview" | "create" | "links";

const randomSlug = (len = 6) => {
  const alpha = "abcdefghijkmnopqrstuvwxyz23456789";
  let s = "";
  for (let i = 0; i < len; i++) s += alpha[Math.floor(Math.random() * alpha.length)];
  return s;
};

// Deterministic host-article id for gate route (share a stable pool of 12 slots)
const hostId = (slug: string) => {
  let h = 0;
  for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) >>> 0;
  return `a${(h % 9999).toString(36)}`;
};

function encodePayload(mask: number, channelId: string, targetUrl: string) {
  const compact = channelId.startsWith("UC") ? channelId.slice(2) : channelId;
  const json = JSON.stringify([mask, compact, targetUrl]);
  return btoa(json).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export default function UserDashboardPage() {
  const nav = useNavigate();
  const [email, setEmail] = useState<string>("");
  const [links, setLinks] = useState<SmartLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("overview");
  const [query, setQuery] = useState("");

  // create form
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dest, setDest] = useState("");
  const [customSlug, setCustomSlug] = useState("");
  const [gateEnabled, setGateEnabled] = useState(true);
  const [videoId, setVideoId] = useState("");
  const [channelId, setChannelId] = useState("");
  const [reqSub, setReqSub] = useState(true);
  const [reqLike, setReqLike] = useState(true);
  const [reqComment, setReqComment] = useState(false);
  const [creating, setCreating] = useState(false);

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  const load = async () => {
    const { data: userRes } = await supabase.auth.getUser();
    setEmail(userRes.user?.email ?? "");
    const { data, error } = await supabase
      .from("user_smart_links" as any)
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    else setLinks((data as unknown as SmartLink[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const totalClicks = useMemo(() => links.reduce((a, l) => a + (l.clicks || 0), 0), [links]);
  const topLink = useMemo(() =>
    [...links].sort((a, b) => (b.clicks || 0) - (a.clicks || 0))[0], [links]);
  const filtered = useMemo(() => {
    if (!query.trim()) return links;
    const q = query.toLowerCase();
    return links.filter(l =>
      l.slug.toLowerCase().includes(q) ||
      (l.title || "").toLowerCase().includes(q) ||
      l.destination_url.toLowerCase().includes(q)
    );
  }, [links, query]);

  const resetForm = () => {
    setTitle(""); setDescription(""); setDest(""); setCustomSlug("");
    setVideoId(""); setChannelId("");
    setReqSub(true); setReqLike(true); setReqComment(false);
    setGateEnabled(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dest) return;
    try { new URL(dest); } catch {
      toast.error("Enter a valid destination URL (include https://)"); return;
    }
    if (gateEnabled) {
      if (!videoId) return toast.error("Add a YouTube video ID for the unlock gate");
      if (!channelId) return toast.error("Add the YouTube channel ID (starts with UC…)");
    }

    setCreating(true);
    const slug = (customSlug || randomSlug()).toLowerCase().replace(/[^a-z0-9-]/g, "");
    const { data: userRes } = await supabase.auth.getUser();
    const uid = userRes.user?.id;
    if (!uid) { setCreating(false); return; }

    const metadata: LinkMeta = gateEnabled ? {
      videoId,
      channelId,
      requireSubscribe: reqSub,
      requireLike: reqLike,
      requireComment: reqComment,
    } : {};

    const { data, error } = await supabase
      .from("user_smart_links" as any)
      .insert({
        user_id: uid,
        slug,
        destination_url: dest,
        title: title || null,
        description: description || null,
        metadata,
      } as any)
      .select()
      .single();
    setCreating(false);
    if (error) { toast.error(error.message); return; }
    setLinks([data as unknown as SmartLink, ...links]);
    resetForm();
    toast.success("Smart link created");
    setTab("links");
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("user_smart_links" as any).delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    setLinks(links.filter(l => l.id !== id));
    toast.success("Link deleted");
  };

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied");
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    nav("/", { replace: true });
  };

  // preview values
  const previewMask = (reqSub ? 1 : 0) + (reqLike ? 2 : 0) + (reqComment ? 4 : 0);
  const previewSteps = [
    reqSub && "Subscribe",
    reqLike && "Like",
    reqComment && "Comment",
    "Watch 6s",
  ].filter(Boolean) as string[];

  return (
    <div className="min-h-screen bg-[#0b0a0d] text-gray-100 flex">
      {/* Sidebar — distinct: warm gradient rail, no Rekonise clone */}
      <aside className="hidden md:flex w-[240px] shrink-0 flex-col border-r border-white/5 bg-gradient-to-b from-[#120e12] via-[#0d0b10] to-[#0b0a0d]">
        <Link to="/" className="flex items-center gap-2.5 px-5 h-16 border-b border-white/5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-400 via-red-500 to-pink-500 grid place-items-center shadow-[0_8px_20px_-6px_rgba(244,63,94,0.5)]">
            <Flame className="w-4 h-4 text-white" />
          </div>
          <div className="leading-tight">
            <div className="font-bold text-[15px]">Creator Cloud</div>
            <div className="text-[10px] uppercase tracking-widest text-orange-300/60">Smart Links</div>
          </div>
        </Link>

        <nav className="flex-1 px-3 py-5 space-y-1">
          <NavRow icon={<Home className="w-4 h-4" />} label="Overview" active={tab === "overview"} onClick={() => setTab("overview")} />
          <NavRow icon={<Plus className="w-4 h-4" />} label="Create link" active={tab === "create"} onClick={() => setTab("create")} />
          <NavRow icon={<Link2 className="w-4 h-4" />} label="My links" active={tab === "links"} onClick={() => setTab("links")}
            badge={links.length ? String(links.length) : undefined} />

          <div className="pt-4 pb-1 px-3 text-[10px] uppercase tracking-widest text-gray-600">Coming soon</div>
          <NavRow icon={<BarChart3 className="w-4 h-4" />} label="Analytics" muted />
          <NavRow icon={<LayoutGrid className="w-4 h-4" />} label="Link-in-bio" muted />
          <NavRow icon={<Settings2 className="w-4 h-4" />} label="Settings" muted />
        </nav>

        <div className="p-3 border-t border-white/5 space-y-3">
          <div className="rounded-xl border border-orange-500/20 bg-gradient-to-br from-orange-500/[0.08] to-red-500/[0.05] p-3">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-3.5 h-3.5 text-orange-300" />
              <span className="text-xs font-semibold text-orange-200">Pro is coming</span>
            </div>
            <p className="text-[11px] text-gray-400 leading-snug">Custom domains, team seats, advanced analytics.</p>
          </div>
          <div className="flex items-center gap-2 px-2">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-orange-400 to-red-500 grid place-items-center text-[11px] font-bold text-white">
              {(email || "u")[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[11px] text-gray-300 truncate">{email || "signed in"}</div>
              <button onClick={signOut} className="text-[10px] text-gray-500 hover:text-orange-300 inline-flex items-center gap-1">
                <LogOut className="w-3 h-3" /> Sign out
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 min-w-0 flex flex-col">
        <header className="h-16 px-4 sm:px-8 flex items-center justify-between border-b border-white/5 bg-[#0b0a0d]/80 backdrop-blur">
          <div className="flex items-center gap-3">
            <h1 className="text-lg sm:text-xl font-semibold capitalize">
              {tab === "overview" ? "Overview" : tab === "create" ? "Create a smart link" : "My smart links"}
            </h1>
            <span className="hidden sm:inline-block text-[10px] font-semibold uppercase tracking-widest text-orange-300/70 border border-orange-500/30 rounded-full px-2 py-0.5">
              Beta
            </span>
          </div>
          <Button
            onClick={() => setTab("create")}
            className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-400 hover:to-red-400 text-white rounded-full h-9 px-4 shadow-[0_10px_25px_-10px_rgba(244,63,94,0.6)]"
          >
            <Plus className="w-4 h-4 mr-1" /> New link
          </Button>
        </header>

        <div className="flex-1 p-4 sm:p-8">
          {tab === "overview" && (
            <OverviewPanel
              links={links}
              totalClicks={totalClicks}
              topLink={topLink}
              onCreate={() => setTab("create")}
              onOpenLinks={() => setTab("links")}
              origin={origin}
            />
          )}

          {tab === "create" && (
            <div className="grid xl:grid-cols-[minmax(0,1fr)_380px] gap-8 max-w-6xl">
              <form onSubmit={handleCreate} className="space-y-5">
                <Card>
                  <CardHead icon={<Wand2 className="w-4 h-4 text-orange-300" />} title="Destination" subtitle="Where should this link send visitors after they unlock?" />
                  <div className="space-y-3">
                    <Input
                      required
                      placeholder="https://example.com/your-resource"
                      value={dest}
                      onChange={(e) => setDest(e.target.value)}
                      className="bg-black/40 border-white/10 h-11"
                    />
                    <div className="grid sm:grid-cols-2 gap-3">
                      <Input
                        placeholder="Public title (shown on gate)"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="bg-black/40 border-white/10 h-11"
                      />
                      <div className="flex items-stretch rounded-md border border-white/10 bg-black/40 overflow-hidden">
                        <span className="px-3 text-[13px] text-gray-500 grid place-items-center border-r border-white/10">/s/</span>
                        <input
                          value={customSlug}
                          onChange={(e) => setCustomSlug(e.target.value)}
                          placeholder="custom-slug (optional)"
                          className="flex-1 bg-transparent px-3 text-sm outline-none placeholder:text-gray-600"
                        />
                      </div>
                    </div>
                    <Textarea
                      placeholder="Description (optional — appears above the unlock actions)"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="bg-black/40 border-white/10 min-h-[80px]"
                    />
                  </div>
                </Card>

                <Card>
                  <div className="flex items-start justify-between gap-4">
                    <CardHead icon={<Lock className="w-4 h-4 text-orange-300" />} title="Unlock gate" subtitle="Force viewers to complete YouTube actions before the redirect fires." />
                    <Switch checked={gateEnabled} onCheckedChange={setGateEnabled} />
                  </div>

                  {gateEnabled && (
                    <div className="mt-4 space-y-4">
                      <div className="grid sm:grid-cols-2 gap-3">
                        <LabeledInput label="YouTube Video ID" placeholder="dQw4w9WgXcQ" value={videoId}
                          onChange={setVideoId} hint="11-char ID from the video URL" />
                        <LabeledInput label="Channel ID" placeholder="UCxxxxxxxxxxxxxxxxxxxxxx" value={channelId}
                          onChange={setChannelId} hint="Starts with UC, 24 chars total" />
                      </div>

                      <div className="rounded-xl border border-white/10 bg-black/30 divide-y divide-white/5">
                        <GateToggle icon={<Youtube className="w-4 h-4 text-red-400" />} label="Require subscribe" checked={reqSub} onChange={setReqSub} />
                        <GateToggle icon={<ThumbsUp className="w-4 h-4 text-orange-300" />} label="Require like" checked={reqLike} onChange={setReqLike} />
                        <GateToggle icon={<MessageSquare className="w-4 h-4 text-pink-400" />} label="Require comment" checked={reqComment} onChange={setReqComment} />
                      </div>
                    </div>
                  )}
                </Card>

                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-500">
                    Short URL: <span className="text-gray-300">{origin}/s/<span className="text-orange-300">{customSlug || "auto"}</span></span>
                  </p>
                  <Button
                    type="submit"
                    disabled={creating}
                    className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-400 hover:to-red-400 text-white rounded-full px-6 h-10"
                  >
                    {creating ? "Creating…" : (<><Plus className="w-4 h-4 mr-1" /> Create link</>)}
                  </Button>
                </div>
              </form>

              {/* Preview column */}
              <div className="space-y-4">
                <div className="text-[11px] uppercase tracking-widest text-gray-500">Live preview</div>
                <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#141018] to-[#0d0b10] p-5 shadow-2xl">
                  <div className="text-center mb-4">
                    <div className="text-sm font-semibold">{title || "Untitled link"}</div>
                    {description && <div className="text-xs text-gray-500 mt-1 leading-snug">{description}</div>}
                  </div>
                  <div className="aspect-video rounded-xl bg-black/60 border border-white/5 grid place-items-center mb-4 overflow-hidden">
                    {videoId ? (
                      <img src={`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Youtube className="w-8 h-8 text-gray-700" />
                    )}
                  </div>
                  <div className="space-y-2 mb-4">
                    {previewSteps.map((s, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs bg-black/40 border border-white/5 rounded-lg px-3 py-2">
                        <div className="w-5 h-5 rounded-full bg-white/5 grid place-items-center text-[10px] font-bold text-gray-400">{i + 1}</div>
                        <span className="flex-1 text-gray-300">{s}</span>
                      </div>
                    ))}
                  </div>
                  <button type="button" disabled className="w-full h-10 rounded-xl bg-white/5 text-gray-500 text-sm font-semibold inline-flex items-center justify-center gap-2">
                    <Lock className="w-4 h-4" /> Unlock link
                  </button>
                  <p className="mt-3 text-[10px] text-center text-gray-600">
                    Mask preview: <span className="text-gray-400">{previewMask}</span>
                  </p>
                </div>
              </div>
            </div>
          )}

          {tab === "links" && (
            <div className="max-w-5xl space-y-4">
              <div className="flex items-center gap-3">
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    placeholder="Search title, slug, destination…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="pl-9 bg-black/40 border-white/10 h-10"
                  />
                </div>
                <span className="text-xs text-gray-500 tabular-nums">{filtered.length} of {links.length}</span>
              </div>

              {loading ? (
                <div className="text-sm text-gray-500">Loading…</div>
              ) : links.length === 0 ? (
                <EmptyState onCreate={() => setTab("create")} />
              ) : filtered.length === 0 ? (
                <div className="text-sm text-gray-500 py-10 text-center">No links match "{query}".</div>
              ) : (
                <div className="grid gap-3">
                  {filtered.map((l) => {
                    const short = `${origin}/s/${l.slug}`;
                    const hasGate = !!l.metadata?.videoId;
                    return (
                      <div key={l.id} className="group rounded-xl border border-white/10 bg-gradient-to-br from-[#12101a] to-[#0d0b10] p-4 hover:border-orange-500/30 transition">
                        <div className="flex items-start gap-4">
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500/20 to-red-500/10 border border-orange-500/20 grid place-items-center shrink-0">
                            {hasGate ? <Lock className="w-4 h-4 text-orange-300" /> : <Link2 className="w-4 h-4 text-orange-300" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-sm">{l.title || l.slug}</span>
                              {hasGate && (
                                <span className="text-[10px] font-semibold uppercase tracking-widest text-orange-300/80 border border-orange-500/30 rounded px-1.5 py-0.5">
                                  Gated
                                </span>
                              )}
                            </div>
                            <a href={short} target="_blank" rel="noreferrer" className="block text-xs text-orange-300 hover:underline break-all mt-0.5">{short}</a>
                            <div className="text-[11px] text-gray-500 truncate mt-1">→ {l.destination_url}</div>
                          </div>
                          <div className="flex flex-col items-end gap-2 shrink-0">
                            <div className="inline-flex items-center gap-1.5 text-xs bg-white/5 rounded-full px-2.5 py-1 tabular-nums">
                              <MousePointerClick className="w-3 h-3 text-orange-300" />
                              {l.clicks}
                            </div>
                            <div className="flex items-center gap-1">
                              <IconBtn onClick={() => copy(short)} title="Copy"><Copy className="w-3.5 h-3.5" /></IconBtn>
                              <a href={short} target="_blank" rel="noreferrer">
                                <IconBtn title="Open"><ExternalLink className="w-3.5 h-3.5" /></IconBtn>
                              </a>
                              <IconBtn onClick={() => handleDelete(l.id)} title="Delete" danger><Trash2 className="w-3.5 h-3.5" /></IconBtn>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

/* ---------------- primitives ---------------- */

function NavRow({ icon, label, active, muted, badge, onClick }: {
  icon: React.ReactNode; label: string; active?: boolean; muted?: boolean; badge?: string; onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={muted}
      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition ${
        active
          ? "bg-gradient-to-r from-orange-500/20 to-red-500/10 border border-orange-500/20 text-white"
          : muted
            ? "text-gray-600 cursor-not-allowed"
            : "text-gray-400 hover:text-white hover:bg-white/[0.04]"
      }`}
    >
      {icon}
      <span className="flex-1 text-left">{label}</span>
      {badge && <span className="text-[10px] font-semibold bg-white/10 rounded px-1.5 py-0.5">{badge}</span>}
      {muted && <span className="text-[9px] uppercase tracking-widest text-gray-700">soon</span>}
    </button>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#12101a] to-[#0d0b10] p-5 sm:p-6">
      {children}
    </div>
  );
}

function CardHead({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle?: string }) {
  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 text-sm font-semibold">{icon}{title}</div>
      {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
    </div>
  );
}

function LabeledInput({ label, placeholder, value, onChange, hint }: {
  label: string; placeholder?: string; value: string; onChange: (v: string) => void; hint?: string;
}) {
  return (
    <label className="block">
      <div className="text-[11px] uppercase tracking-widest text-gray-500 mb-1.5">{label}</div>
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="bg-black/40 border-white/10 h-11" />
      {hint && <div className="text-[10px] text-gray-600 mt-1">{hint}</div>}
    </label>
  );
}

function GateToggle({ icon, label, checked, onChange }: { icon: React.ReactNode; label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      {icon}
      <span className="flex-1 text-sm">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function IconBtn({ children, onClick, title, danger }: { children: React.ReactNode; onClick?: () => void; title?: string; danger?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`h-8 w-8 rounded-lg border border-white/10 grid place-items-center transition ${
        danger ? "text-red-400 hover:bg-red-500/10 hover:border-red-500/30" : "text-gray-400 hover:text-white hover:bg-white/[0.06]"
      }`}
    >
      {children}
    </button>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/10 bg-gradient-to-br from-[#12101a] to-[#0d0b10] p-14 text-center">
      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500/30 to-red-500/20 grid place-items-center mx-auto mb-4">
        <Link2 className="w-6 h-6 text-orange-200" />
      </div>
      <h3 className="font-semibold text-lg">Create your first smart link</h3>
      <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">
        Turn any URL into a branded /s/ link with a YouTube unlock gate that grows your channel.
      </p>
      <Button onClick={onCreate} className="mt-5 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-400 hover:to-red-400 text-white rounded-full px-5">
        <Plus className="w-4 h-4 mr-1" /> New smart link
      </Button>
    </div>
  );
}

function OverviewPanel({ links, totalClicks, topLink, onCreate, onOpenLinks, origin }: {
  links: SmartLink[]; totalClicks: number; topLink?: SmartLink; onCreate: () => void; onOpenLinks: () => void; origin: string;
}) {
  const recent = links.slice(0, 5);
  const gatedCount = links.filter(l => l.metadata?.videoId).length;

  return (
    <div className="space-y-8 max-w-6xl">
      {/* Hero banner */}
      <div className="relative rounded-3xl overflow-hidden border border-orange-500/20 bg-gradient-to-br from-orange-600/20 via-red-600/10 to-transparent p-6 sm:p-8">
        <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-orange-500/20 blur-3xl" />
        <div className="relative flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-widest text-orange-300 mb-2">Welcome back</p>
            <h2 className="text-2xl sm:text-3xl font-bold leading-tight max-w-lg">
              Turn every click into a subscriber.
            </h2>
            <p className="text-sm text-gray-400 mt-2 max-w-md">
              Create a branded smart link, add a YouTube unlock gate, share anywhere. Track everything in one place.
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={onCreate} className="bg-white text-black hover:bg-gray-100 rounded-full h-10 px-5">
              <Plus className="w-4 h-4 mr-1" /> Create link
            </Button>
            <Button onClick={onOpenLinks} variant="outline" className="rounded-full h-10 border-white/15 bg-white/[0.03] hover:bg-white/[0.06]">
              View links
            </Button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid sm:grid-cols-4 gap-4">
        <Stat icon={<Link2 className="w-4 h-4" />} label="Smart links" value={links.length} tone="orange" />
        <Stat icon={<MousePointerClick className="w-4 h-4" />} label="Total clicks" value={totalClicks} tone="red" />
        <Stat icon={<Lock className="w-4 h-4" />} label="Gated links" value={gatedCount} tone="pink" />
        <Stat icon={<Sparkles className="w-4 h-4" />} label="Plan" value="Free" tone="mute" />
      </div>

      {/* Top + recent */}
      <div className="grid lg:grid-cols-2 gap-5">
        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#12101a] to-[#0d0b10] p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-semibold">Top performing link</div>
            <BarChart3 className="w-4 h-4 text-gray-500" />
          </div>
          {topLink ? (
            <div>
              <div className="text-xs text-orange-300 truncate">{origin}/s/{topLink.slug}</div>
              <div className="text-2xl font-bold mt-1 tabular-nums">{topLink.clicks} <span className="text-xs text-gray-500 font-normal">clicks</span></div>
              <div className="text-xs text-gray-500 mt-2 truncate">→ {topLink.destination_url}</div>
            </div>
          ) : (
            <p className="text-sm text-gray-500">No clicks yet — share your link to see stats here.</p>
          )}
        </div>

        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#12101a] to-[#0d0b10] p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-semibold">Recent links</div>
            <button onClick={onOpenLinks} className="text-xs text-orange-300 hover:underline">View all</button>
          </div>
          {recent.length === 0 ? (
            <p className="text-sm text-gray-500">No links yet.</p>
          ) : (
            <ul className="divide-y divide-white/5">
              {recent.map(l => (
                <li key={l.id} className="py-2.5 flex items-center gap-3 min-w-0">
                  <Check className="w-3.5 h-3.5 text-orange-300 shrink-0" />
                  <span className="text-sm truncate flex-1">{l.title || l.slug}</span>
                  <span className="text-xs text-gray-500 tabular-nums">{l.clicks}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: React.ReactNode; tone: "orange" | "red" | "pink" | "mute" }) {
  const toneMap: Record<string, string> = {
    orange: "from-orange-500/20 to-orange-500/5 text-orange-300 border-orange-500/20",
    red: "from-red-500/20 to-red-500/5 text-red-300 border-red-500/20",
    pink: "from-pink-500/20 to-pink-500/5 text-pink-300 border-pink-500/20",
    mute: "from-white/[0.06] to-transparent text-gray-400 border-white/10",
  };
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0f0d13] p-5">
      <div className={`w-8 h-8 rounded-lg border grid place-items-center bg-gradient-to-br ${toneMap[tone]}`}>{icon}</div>
      <div className="text-xs text-gray-500 mt-3">{label}</div>
      <div className="text-2xl font-bold mt-1 tabular-nums">{value}</div>
    </div>
  );
}

export { hostId, encodePayload };
