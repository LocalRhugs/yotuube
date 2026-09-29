/**
 * /cpatest  — native CPAGrip offer wall (Option B) test harness.
 *
 * NOT part of the live funnel yet. Discoverable only by direct URL, always noindex.
 *
 * Offers are pulled through our own edge-fn proxy (cpa-offers) which uses the
 * PRIVATE key server-side to fetch BOTH web + mobile offers for the visitor's
 * real geo (or a forced ?geo=XX for testing). We then group them into clear
 * sections — "No email needed" first — instead of one clumped list.
 *
 * Unlock is verified server-side: CPAGrip Global Postback -> cpa-postback ->
 * row in cpa_unlocks -> this page's poll of cpa-status flips to unlocked.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Lock, CheckCircle2, Loader2, ExternalLink, ShieldCheck, RefreshCw, Smartphone, Mail } from "lucide-react";

const OFFERS_PROXY = "https://hkspkqbnjdkwyyvxqglv.supabase.co/functions/v1/cpa-offers";
const STATUS_URL = "https://hkspkqbnjdkwyyvxqglv.supabase.co/functions/v1/cpa-status";
const UNLOCK_DEST = "https://combowick.com";

type Offer = {
  offer_id: string;
  title: string;
  description: string;
  payout: string;
  type: string;
  category: string;
  offerlink: string;
  offerphoto: string;
};

// Classify each offer: no-email (best), email, or hide (credit card — too much friction/risk).
type Kind = "noemail" | "email" | "hide";
function classify(o: Offer): Kind {
  const c = (o.category || "").toLowerCase();
  if (c.includes("credit card")) return "hide";
  if (c.includes("email") || c.includes("zip")) return "email";
  return "noemail"; // Mobile Install, Pin-Submit, App Install, etc.
}
function payoutNum(o: Offer) { return Number(o.payout) || 0; }

function makeSubid(): string {
  try { const e = sessionStorage.getItem("cpa_subid"); if (e) return e; } catch {}
  const rnd = (crypto as any)?.randomUUID?.().replace(/-/g, "") ||
    Math.random().toString(36).slice(2) + Date.now().toString(36);
  const subid = `cw_${rnd}`.slice(0, 40);
  try { sessionStorage.setItem("cpa_subid", subid); } catch {}
  return subid;
}

export default function CpaTestPage() {
  const subid = useMemo(makeSubid, []);
  const geoOverride = useMemo(() => {
    try { return (new URLSearchParams(window.location.search).get("geo") || "").toUpperCase().replace(/[^A-Z]/g, "").slice(0, 2); }
    catch { return ""; }
  }, []);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [country, setCountry] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [openedAny, setOpenedAny] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const pollRef = useRef<number | null>(null);

  const loadOffers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const url = `${OFFERS_PROXY}?subid=${encodeURIComponent(subid)}${geoOverride ? `&geo=${geoOverride}` : ""}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Feed HTTP ${res.status}`);
      const data = await res.json();
      setCountry(data.country || geoOverride || "");
      const list: Offer[] = Array.isArray(data.offers) ? data.offers : [];
      setOffers(list);
      if (!list.length) setError("No offers available for this location right now.");
    } catch (e: any) {
      setError(e?.message || "Failed to load offers.");
    } finally {
      setLoading(false);
    }
  }, [subid, geoOverride]);

  useEffect(() => { loadOffers(); }, [loadOffers]);

  // Poll postback status from load (returning/completed users unlock instantly).
  useEffect(() => {
    if (unlocked) return;
    const tick = async () => {
      try {
        const r = await fetch(`${STATUS_URL}?subid=${encodeURIComponent(subid)}`);
        if (r.ok) { const j = await r.json(); if (j?.completed) setUnlocked(true); }
      } catch {}
    };
    tick();
    pollRef.current = window.setInterval(tick, 4000);
    return () => { if (pollRef.current) window.clearInterval(pollRef.current); };
  }, [unlocked, subid]);

  const { noEmail, email } = useMemo(() => {
    const ne: Offer[] = [], em: Offer[] = [];
    for (const o of offers) {
      const k = classify(o);
      if (k === "noemail") ne.push(o);
      else if (k === "email") em.push(o);
    }
    ne.sort((a, b) => payoutNum(b) - payoutNum(a));
    em.sort((a, b) => payoutNum(b) - payoutNum(a));
    return { noEmail: ne, email: em };
  }, [offers]);

  const openOffer = (o: Offer) => {
    setOpenedAny(true);
    window.open(o.offerlink, "_blank", "noopener,noreferrer");
  };

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
              Pick any option below — it takes ~20 seconds.{country ? ` (${country})` : ""}
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
              <p className="mt-1 text-sm text-muted-foreground">Completion confirmed. In the live funnel this reveals the script.</p>
              <a href={UNLOCK_DEST} className="mt-4 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground hover:opacity-90">
                <ExternalLink className="h-4 w-4" /> Continue
              </a>
            </div>
          ) : (
            <>
              {openedAny && (
                <div className="mb-4 flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/10 p-3 text-xs">
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />
                  <span>Waiting for completion… finish the step in the new tab, then come back here.</span>
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

              {!loading && !error && (
                <div className="space-y-6">
                  {noEmail.length > 0 && (
                    <Section
                      icon={<Smartphone className="h-4 w-4" />}
                      title="No email needed — fastest"
                      subtitle="Just install a free app or a quick tap. Nothing to type."
                      tone="green"
                      offers={noEmail}
                      badge="No email"
                      onOpen={openOffer}
                    />
                  )}
                  {email.length > 0 && (
                    <Section
                      icon={<Mail className="h-4 w-4" />}
                      title="Quick email options"
                      subtitle="Just an email + zip. Use any email — it only verifies you're real, no spam. A throwaway works fine."
                      tone="neutral"
                      offers={email}
                      badge="Email + zip"
                      onOpen={openOffer}
                    />
                  )}
                </div>
              )}

              <p className="mt-6 flex items-center justify-center gap-1.5 text-center text-[11px] text-muted-foreground/70">
                <ShieldCheck className="h-3.5 w-3.5" /> Verified automatically — the page unlocks the moment you finish.
              </p>
            </>
          )}
        </div>
      </div>
    </>
  );
}

function Section({ icon, title, subtitle, tone, offers, badge, onOpen }: {
  icon: React.ReactNode; title: string; subtitle: string;
  tone: "green" | "neutral"; offers: Offer[]; badge: string; onOpen: (o: Offer) => void;
}) {
  const accent = tone === "green" ? "text-emerald-500" : "text-primary";
  const badgeCls = tone === "green"
    ? "bg-emerald-500/15 text-emerald-500"
    : "bg-primary/15 text-primary";
  return (
    <section>
      <div className="mb-2 flex items-center gap-2">
        <span className={`flex h-6 w-6 items-center justify-center rounded-md bg-muted ${accent}`}>{icon}</span>
        <h2 className="text-sm font-bold">{title}</h2>
        <span className="ml-auto text-[11px] text-muted-foreground">{offers.length}</span>
      </div>
      <p className="mb-3 text-xs text-muted-foreground">{subtitle}</p>
      <div className="space-y-2.5">
        {offers.map((o) => (
          <button
            key={o.offer_id}
            type="button"
            onClick={() => onOpen(o)}
            className="flex w-full items-center gap-3 rounded-xl border border-border bg-card p-3 text-left transition-colors hover:border-primary/50 hover:bg-muted/40"
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
              <span className="block truncate text-xs text-muted-foreground">{o.description}</span>
              <span className={`mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${badgeCls}`}>{badge}</span>
            </span>
            <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />
          </button>
        ))}
      </div>
    </section>
  );
}
