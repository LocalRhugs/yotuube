/**
 * /cpatest  — native CPAGrip offer wall (Option B) test harness.
 *
 * NOT part of the live funnel yet. Discoverable only by direct URL, always noindex.
 *
 * Flow:
 *   1. Each visitor gets a unique subid (persisted for the session).
 *   2. We fetch the CPAGrip JSON offer feed client-side (CORS: *), passing the
 *      subid as tracking_id so it rides through into the conversion postback.
 *   3. Offers render natively — easy Email/Zip submits first — user opens one.
 *   4. When CPAGrip fires its Global Postback to our Supabase fn, the page's
 *      poll of /cpa-status flips to unlocked.
 *
 * Once verified, this offer wall replaces the Linkvertise reveal in the funnel.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Lock, CheckCircle2, Loader2, ExternalLink, ShieldCheck, RefreshCw } from "lucide-react";

const CPA_USER_ID = "2558012";
const CPA_PUBKEY = "62e21ef56139a78f56a8d036104e6947";
const FEED_BASE = "https://www.cpagrip.com/common/offer_feed_json.php";
// Supabase (yotuube backend) edge fn that the CPAGrip Global Postback hits.
const STATUS_URL = "https://hkspkqbnjdkwyyvxqglv.supabase.co/functions/v1/cpa-status";
// Where the user lands once unlocked (placeholder until wired into the real funnel).
const UNLOCK_DEST = "https://combowick.com";

type Offer = {
  offer_id: string;
  title: string;
  description: string;
  payout: string;
  type: string;
  category: string;
  accepted_countries: string;
  offerlink: string;
  offerphoto: string;
};

// Easy, low-friction categories float to the top so users pick those.
const EASY_RANK: Record<string, number> = {
  "Email/Zip Submit": 0,
  "Email Submit": 0,
  "Zip Submit": 0,
  "Pin Submit": 1,
  "Mobile": 2,
};
function easeScore(o: Offer): number {
  const cat = EASY_RANK[o.category];
  return cat === undefined ? 5 : cat;
}

function makeSubid(): string {
  try {
    const existing = sessionStorage.getItem("cpa_subid");
    if (existing) return existing;
  } catch {}
  const rnd =
    (crypto as any)?.randomUUID?.().replace(/-/g, "") ||
    Math.random().toString(36).slice(2) + Date.now().toString(36);
  const subid = `cw_${rnd}`.slice(0, 40);
  try { sessionStorage.setItem("cpa_subid", subid); } catch {}
  return subid;
}

export default function CpaTestPage() {
  const subid = useMemo(makeSubid, []);
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
      const url = `${FEED_BASE}?user_id=${CPA_USER_ID}&pubkey=${CPA_PUBKEY}&tracking_id=${encodeURIComponent(subid)}`;
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      if (!res.ok) throw new Error(`Feed HTTP ${res.status}`);
      const data = await res.json();
      const gen: Array<Record<string, string>> = data.general || [];
      const cc = gen.find((g) => "country_code" in g)?.country_code || "";
      setCountry(cc);
      const list: Offer[] = Array.isArray(data.offers) ? data.offers : [];
      list.sort((a, b) => easeScore(a) - easeScore(b) || Number(b.payout) - Number(a.payout));
      setOffers(list);
      if (!list.length) setError("No offers available for your location right now.");
    } catch (e: any) {
      setError(e?.message || "Failed to load offers.");
    } finally {
      setLoading(false);
    }
  }, [subid]);

  useEffect(() => { loadOffers(); }, [loadOffers]);

  // Poll the postback status from load (catches returning/already-completed users
  // within their access window) and while waiting after an offer is opened.
  useEffect(() => {
    if (unlocked) return;
    const tick = async () => {
      try {
        const r = await fetch(`${STATUS_URL}?subid=${encodeURIComponent(subid)}`);
        if (r.ok) {
          const j = await r.json();
          if (j?.completed) { setUnlocked(true); }
        }
      } catch {}
    };
    tick();
    pollRef.current = window.setInterval(tick, 4000);
    return () => { if (pollRef.current) window.clearInterval(pollRef.current); };
  }, [unlocked, subid]);

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
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary mb-2">
              Internal test · not live
            </p>
            <h1 className="text-2xl font-bold flex items-center justify-center gap-2">
              <Lock className="h-5 w-5 text-primary" /> Complete 1 offer to unlock
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Pick the easiest one below (Email/Zip = fastest). {country ? `Offers for: ${country}` : ""}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground/70">subid: {subid}</p>
          </div>

          {unlocked ? (
            <div className="rounded-2xl border border-primary/40 bg-primary/10 p-6 text-center">
              <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-primary" />
              <h2 className="text-lg font-bold">Unlocked! 🎉</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Postback received — completion confirmed. In the live funnel this redirects to the script.
              </p>
              <a
                href={UNLOCK_DEST}
                className="mt-4 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground hover:opacity-90"
              >
                <ExternalLink className="h-4 w-4" /> Continue
              </a>
            </div>
          ) : (
            <>
              {openedAny && (
                <div className="mb-4 flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/10 p-3 text-xs">
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />
                  <span>Waiting for offer completion… complete the offer in the new tab, then come back here.</span>
                </div>
              )}

              {loading && (
                <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" /> Loading offers…
                </div>
              )}

              {error && !loading && (
                <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-center text-sm">
                  <p className="text-destructive-foreground">{error}</p>
                  <button
                    onClick={loadOffers}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted"
                  >
                    <RefreshCw className="h-3.5 w-3.5" /> Retry
                  </button>
                </div>
              )}

              {!loading && !error && (
                <div className="space-y-2.5">
                  {offers.map((o) => (
                    <button
                      key={o.offer_id}
                      type="button"
                      onClick={() => openOffer(o)}
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
                        <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">
                          {o.category}
                        </span>
                      </span>
                      <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              )}

              <p className="mt-5 flex items-center justify-center gap-1.5 text-center text-[11px] text-muted-foreground/70">
                <ShieldCheck className="h-3.5 w-3.5" /> Completion is verified server-side via CPAGrip postback.
              </p>
            </>
          )}
        </div>
      </div>
    </>
  );
}
