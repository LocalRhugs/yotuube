/**
 * /cpatest  — native CPALead offer wall ("soft lock") test harness.
 *
 * NOT part of the live funnel yet. Discoverable only by direct URL, always noindex.
 *
 * Offers come through our edge-fn proxy (cpa-offers), which sorts each one into a
 * section (Apps / Surveys / Phone / Email) and drops money/ID asks (cards, loans,
 * casinos, trials). Visitors pick the kind they're comfortable with — people who
 * won't give an email never have to look at email offers.
 *
 * Unlock (whichever comes first):
 *   - verified: CPALead postback -> cpa-postback -> cpa_unlocks row -> cpa-status poll
 *   - timer:    AWAY_SECONDS spent AWAY on the offer tab (the clock pauses while
 *               they sit on this page, so waiting here doesn't skip the offer)
 * No offers for the visitor's country -> send them on to the Linkvertise route (?next=).
 *
 * Every step is reported to cpa-status (POST) -> cpa_events, so we can see which
 * sections/offers people actually pick and finish, per country.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import {
  Lock, CheckCircle2, Loader2, ExternalLink, ShieldCheck, RefreshCw,
  Smartphone, Mail, ClipboardList, Phone, Globe, ArrowRight, Timer,
} from "lucide-react";

const FN = "https://hkspkqbnjdkwyyvxqglv.supabase.co/functions/v1";
const OFFERS_PROXY = `${FN}/cpa-offers`;
const STATUS_URL = `${FN}/cpa-status`;
const UNLOCK_DEST = "https://combowick.com";
const DEFAULT_FALLBACK = "https://keys.combowick.com"; // Linkvertise route when a country has no offers
const AWAY_SECONDS = 40;
const MIN_OFFERS = 1; // fewer usable offers than this -> fallback route

type Kind = "app" | "survey" | "phone" | "email";
type Offer = {
  offer_id: string;
  title: string;
  description: string;
  kind: Kind;
  payout: string;
  offerlink: string;
  offerphoto: string;
};

const SECTIONS: Record<Kind, { label: string; title: string; note: string; icon: typeof Smartphone; tone: string }> = {
  app: {
    label: "Apps", title: "Download an app", icon: Smartphone, tone: "emerald",
    note: "No email needed. Install a free app or game and open it.",
  },
  survey: {
    label: "Surveys", title: "Quick survey", icon: ClipboardList, tone: "sky",
    note: "Answer a few questions. Some ask for an email at the start.",
  },
  phone: {
    label: "Phone", title: "Phone number", icon: Phone, tone: "violet",
    note: "Enter your number and type the code you get by text.",
  },
  email: {
    label: "Email", title: "Sign up with email", icon: Mail, tone: "amber",
    note: "Use any email — a spare one works fine.",
  },
};
const ORDER: Kind[] = ["app", "survey", "phone", "email"];
const TONE: Record<string, { text: string; bg: string; border: string }> = {
  emerald: { text: "text-emerald-500", bg: "bg-emerald-500/15", border: "border-emerald-500/50" },
  sky: { text: "text-sky-500", bg: "bg-sky-500/15", border: "border-sky-500/50" },
  violet: { text: "text-violet-500", bg: "bg-violet-500/15", border: "border-violet-500/50" },
  amber: { text: "text-amber-500", bg: "bg-amber-500/15", border: "border-amber-500/50" },
};

function makeSubid(): string {
  try { const e = sessionStorage.getItem("cpa_subid"); if (e) return e; } catch {}
  const rnd = (crypto as any)?.randomUUID?.().replace(/-/g, "") ||
    Math.random().toString(36).slice(2) + Date.now().toString(36);
  const subid = `cw_${rnd}`.slice(0, 40);
  try { sessionStorage.setItem("cpa_subid", subid); } catch {}
  return subid;
}

function param(name: string): string {
  try { return new URLSearchParams(window.location.search).get(name) || ""; } catch { return ""; }
}

export default function CpaTestPage() {
  const subid = useMemo(makeSubid, []);
  const geoOverride = useMemo(() => param("geo").toUpperCase().replace(/[^A-Z]/g, "").slice(0, 2), []);
  const fallbackUrl = useMemo(() => {
    const n = param("next");
    return /^https:\/\//i.test(n) ? n : DEFAULT_FALLBACK;
  }, []);

  const [offers, setOffers] = useState<Offer[]>([]);
  const [country, setCountry] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<Kind | null>(null);
  const [current, setCurrent] = useState<Offer | null>(null);
  const [awayMs, setAwayMs] = useState(() => {
    try { return Number(sessionStorage.getItem("cpa_away_ms")) || 0; } catch { return 0; }
  });
  const [isAway, setIsAway] = useState(false);
  const [unlocked, setUnlocked] = useState<null | "verified" | "timer">(null);
  const [redirectIn, setRedirectIn] = useState<number | null>(null);

  const awaySince = useRef<number | null>(null);
  const awayBase = useRef(awayMs);
  const countryRef = useRef("");

  const track = useCallback((event: string, extra: Partial<{ kind: string; offer_id: string }> = {}) => {
    try {
      fetch(STATUS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subid, event, country: countryRef.current, ...extra }),
        keepalive: true,
      }).catch(() => {});
    } catch {}
  }, [subid]);

  // ---- load offers ----
  const loadOffers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const ua = navigator.userAgent || "";
      const dev = /android/i.test(ua) ? "android"
        : /iphone|ipad|ipod/i.test(ua) ? "ios"
        : /mobi/i.test(ua) ? "mobile" : "desktop";
      const url = `${OFFERS_PROXY}?network=cpalead&device=${dev}&subid=${encodeURIComponent(subid)}${geoOverride ? `&geo=${geoOverride}` : ""}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Feed HTTP ${res.status}`);
      const data = await res.json();
      const c = data.country || geoOverride || "";
      countryRef.current = c;
      setCountry(c);
      const list: Offer[] = (Array.isArray(data.offers) ? data.offers : []).filter((o: Offer) => ORDER.includes(o.kind));
      setOffers(list);
      if (list.length < MIN_OFFERS) {
        track("no_offers");
        setRedirectIn(6);
      } else {
        track("view");
        setTab((t) => t ?? ORDER.find((k) => list.some((o) => o.kind === k)) ?? null);
      }
    } catch (e: any) {
      setError(e?.message || "Failed to load offers.");
    } finally {
      setLoading(false);
    }
  }, [subid, geoOverride, track]);

  useEffect(() => { loadOffers(); }, [loadOffers]);

  // ---- no offers: count down, then go to the Linkvertise route ----
  useEffect(() => {
    if (redirectIn === null) return;
    if (redirectIn <= 0) { window.location.href = fallbackUrl; return; }
    const t = window.setTimeout(() => setRedirectIn((s) => (s === null ? s : s - 1)), 1000);
    return () => window.clearTimeout(t);
  }, [redirectIn, fallbackUrl]);

  // ---- verified unlock: poll the postback ----
  useEffect(() => {
    if (unlocked) return;
    const tick = async () => {
      try {
        const r = await fetch(`${STATUS_URL}?subid=${encodeURIComponent(subid)}`);
        if (r.ok) { const j = await r.json(); if (j?.completed) setUnlocked("verified"); }
      } catch {}
    };
    tick();
    const id = window.setInterval(tick, 4000);
    return () => window.clearInterval(id);
  }, [unlocked, subid]);

  // ---- soft-lock timer: only counts while the visitor is away on the offer ----
  useEffect(() => {
    if (!current || unlocked) return;
    const away = () => document.visibilityState === "hidden" || !document.hasFocus();
    const sync = () => {
      const now = Date.now();
      if (away()) {
        if (awaySince.current === null) awaySince.current = now;
        setIsAway(true);
      } else {
        if (awaySince.current !== null) {
          awayBase.current += now - awaySince.current;
          awaySince.current = null;
        }
        setIsAway(false);
      }
      const total = awayBase.current + (awaySince.current !== null ? now - awaySince.current : 0);
      setAwayMs(total);
      try { sessionStorage.setItem("cpa_away_ms", String(total)); } catch {}
    };
    sync();
    const id = window.setInterval(sync, 500);
    document.addEventListener("visibilitychange", sync);
    window.addEventListener("blur", sync);
    window.addEventListener("focus", sync);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", sync);
      window.removeEventListener("blur", sync);
      window.removeEventListener("focus", sync);
    };
  }, [current, unlocked]);

  useEffect(() => {
    if (!unlocked && current && awayMs >= AWAY_SECONDS * 1000) setUnlocked("timer");
  }, [awayMs, current, unlocked]);

  useEffect(() => {
    if (unlocked) track(unlocked === "verified" ? "verified_unlock" : "timer_unlock", current ? { kind: current.kind, offer_id: current.offer_id } : {});
  }, [unlocked]); // eslint-disable-line react-hooks/exhaustive-deps

  const byKind = useMemo(() => {
    const m: Record<Kind, Offer[]> = { app: [], survey: [], phone: [], email: [] };
    for (const o of offers) m[o.kind].push(o);
    return m;
  }, [offers]);

  const pickTab = (k: Kind) => { setTab(k); track("tab", { kind: k }); };

  const openOffer = (o: Offer) => {
    setCurrent(o);
    track("open_offer", { kind: o.kind, offer_id: o.offer_id });
    window.open(o.offerlink, "_blank", "noopener,noreferrer");
  };

  const secsLeft = Math.max(0, Math.ceil(AWAY_SECONDS - awayMs / 1000));
  const pct = Math.min(100, (awayMs / (AWAY_SECONDS * 1000)) * 100);
  const sec = tab ? SECTIONS[tab] : null;

  return (
    <>
      <Helmet>
        <title>Unlock Access</title>
        <meta name="robots" content="noindex, nofollow" />
        <meta name="googlebot" content="noindex, nofollow" />
      </Helmet>

      <div className="min-h-screen bg-background text-foreground px-4 py-8">
        <div className="mx-auto w-full max-w-lg">
          <div className="mb-5 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary mb-2">Internal test · not live</p>
            <h1 className="text-2xl font-bold flex items-center justify-center gap-2">
              <Lock className="h-5 w-5 text-primary" /> Complete 1 step to unlock
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Pick the kind of step you like best, then do one.{country ? ` (${country})` : ""}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground/70">subid: {subid}</p>
            {geoOverride && (
              <p className="mt-2 inline-block rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-[11px] font-semibold text-amber-500">
                🌐 Previewing {geoOverride} offers (test) — completing still credits on your REAL IP
              </p>
            )}
          </div>

          {unlocked ? (
            <div className="rounded-2xl border border-primary/40 bg-primary/10 p-6 text-center">
              <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-primary" />
              <h2 className="text-lg font-bold">Unlocked! 🎉</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {unlocked === "verified" ? "Offer completion confirmed." : "Thanks for trying an offer."}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground/70">test: unlocked by {unlocked === "verified" ? "postback" : `${AWAY_SECONDS}s timer`}</p>
              <a href={UNLOCK_DEST} className="mt-4 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground hover:opacity-90">
                <ExternalLink className="h-4 w-4" /> Continue
              </a>
            </div>
          ) : redirectIn !== null ? (
            <div className="rounded-2xl border border-border bg-card p-6 text-center">
              <Globe className="mx-auto mb-3 h-9 w-9 text-muted-foreground" />
              <h2 className="text-base font-bold">No offers in your country right now</h2>
              <p className="mt-1 text-sm text-muted-foreground">No problem — we'll send you to the other unlock method.</p>
              <a href={fallbackUrl} className="mt-4 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground hover:opacity-90">
                Continue <ArrowRight className="h-4 w-4" />
              </a>
              <p className="mt-2 text-[11px] text-muted-foreground">Going there in {Math.max(0, redirectIn)}s…</p>
            </div>
          ) : (
            <>
              {current && (
                <div className="mb-4 rounded-xl border border-primary/30 bg-primary/10 p-3">
                  <div className="flex items-center gap-2 text-xs">
                    {isAway ? <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" /> : <Timer className="h-4 w-4 shrink-0 text-primary" />}
                    <span className="min-w-0 flex-1">
                      {isAway
                        ? <>Doing <b>{current.title}</b>… {secsLeft}s left</>
                        : <>Back too soon — finish the offer in the other tab. <b>{secsLeft}s</b> left (the timer only runs while you're on the offer).</>}
                    </span>
                    {!isAway && (
                      <button onClick={() => openOffer(current)} className="shrink-0 rounded-lg bg-primary px-2.5 py-1 text-[11px] font-semibold text-primary-foreground">
                        Reopen
                      </button>
                    )}
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary transition-[width] duration-500" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )}

              {loading && (
                <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" /> Loading options…
                </div>
              )}

              {error && !loading && (
                <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-center text-sm">
                  <p className="text-destructive-foreground">{error}</p>
                  <button onClick={loadOffers} className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted">
                    <RefreshCw className="h-3.5 w-3.5" /> Retry
                  </button>
                </div>
              )}

              {!loading && !error && offers.length > 0 && (
                <>
                  {/* section picker */}
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {ORDER.map((k) => {
                      const s = SECTIONS[k], n = byKind[k].length, t = TONE[s.tone], on = tab === k;
                      return (
                        <button
                          key={k}
                          type="button"
                          disabled={!n}
                          onClick={() => pickTab(k)}
                          className={`flex flex-col items-center gap-1 rounded-xl border p-3 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-35 ${on ? `${t.border} ${t.bg}` : "border-border bg-card hover:bg-muted/40"}`}
                        >
                          <s.icon className={`h-5 w-5 ${t.text}`} />
                          <span>{s.label}</span>
                          <span className="text-[10px] font-normal text-muted-foreground">{n ? `${n} option${n > 1 ? "s" : ""}` : "none"}</span>
                        </button>
                      );
                    })}
                  </div>

                  {tab && sec && (
                    <section className="mt-5">
                      <div className="mb-1 flex items-center gap-2">
                        <sec.icon className={`h-4 w-4 ${TONE[sec.tone].text}`} />
                        <h2 className="text-sm font-bold">{sec.title}</h2>
                      </div>
                      <p className="mb-3 text-xs text-muted-foreground">{sec.note}</p>
                      <div className="space-y-2.5">
                        {byKind[tab].map((o) => (
                          <button
                            key={o.offer_id}
                            type="button"
                            onClick={() => openOffer(o)}
                            className={`flex w-full items-center gap-3 rounded-xl border bg-card p-3 text-left transition-colors hover:border-primary/50 hover:bg-muted/40 ${current?.offer_id === o.offer_id ? "border-primary/60" : "border-border"}`}
                          >
                            <img
                              src={o.offerphoto}
                              alt=""
                              loading="lazy"
                              className="h-12 w-12 shrink-0 rounded-lg object-cover bg-muted"
                              onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = "hidden"; }}
                            />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-semibold">{o.title}</span>
                              <span className="block line-clamp-2 text-xs text-muted-foreground">{o.description}</span>
                            </span>
                            <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />
                          </button>
                        ))}
                      </div>
                    </section>
                  )}
                </>
              )}

              <p className="mt-6 flex items-center justify-center gap-1.5 text-center text-[11px] text-muted-foreground/70">
                <ShieldCheck className="h-3.5 w-3.5" /> Finish the step in the new tab — this page unlocks automatically.
              </p>
            </>
          )}
        </div>
      </div>
    </>
  );
}
