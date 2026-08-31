import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Cloud, ShieldCheck } from "lucide-react";

type OAuthNamespace = {
  getAuthorizationDetails: (id: string) => Promise<{ data: any; error: any }>;
  approveAuthorization: (id: string) => Promise<{ data: any; error: any }>;
  denyAuthorization: (id: string) => Promise<{ data: any; error: any }>;
};

function oauthApi(): OAuthNamespace {
  return (supabase.auth as unknown as { oauth: OAuthNamespace }).oauth;
}

export default function OAuthConsentPage() {
  const [params] = useSearchParams();
  const authorizationId = params.get("authorization_id") ?? "";
  const [details, setDetails] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!authorizationId) {
        setError("Missing authorization_id");
        return;
      }
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        const next = window.location.pathname + window.location.search;
        window.location.href = "/signin?next=" + encodeURIComponent(next);
        return;
      }
      const { data, error: detailsError } = await oauthApi().getAuthorizationDetails(authorizationId);
      if (!active) return;
      if (detailsError) {
        setError(detailsError.message);
        return;
      }
      const immediate = data?.redirect_url ?? data?.redirect_to;
      if (immediate && !data?.client) {
        window.location.href = immediate;
        return;
      }
      setDetails(data);
    })();
    return () => {
      active = false;
    };
  }, [authorizationId]);

  async function decide(approve: boolean) {
    setBusy(true);
    const api = oauthApi();
    const { data, error: decideError } = approve
      ? await api.approveAuthorization(authorizationId)
      : await api.denyAuthorization(authorizationId);
    if (decideError) {
      setBusy(false);
      setError(decideError.message);
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      setError("No redirect returned by the authorization server.");
      return;
    }
    window.location.href = target;
  }

  const clientName = details?.client?.name ?? "an app";

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-gray-100 flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-8 space-y-6">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
            <Cloud className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-lg">Creator Cloud</span>
        </div>

        {error ? (
          <div className="space-y-2">
            <h1 className="text-xl font-bold">Could not load this request</h1>
            <p className="text-sm text-red-400">{error}</p>
            <p className="text-xs text-gray-500">
              The authorization may have expired. Start the connection again from the app you were using.
            </p>
          </div>
        ) : !details ? (
          <p className="text-sm text-gray-400">Loading authorization request…</p>
        ) : (
          <>
            <div className="space-y-2">
              <h1 className="text-xl font-bold">Connect {clientName} to your account</h1>
              <p className="text-sm text-gray-400">
                {clientName} will be able to view, create and delete your smart links and read your click
                analytics — acting as you.
              </p>
            </div>
            <div className="flex items-start gap-2 text-xs text-gray-500 bg-white/5 border border-white/10 rounded-lg p-3">
              <ShieldCheck className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
              You can revoke this access at any time from your account settings.
            </div>
            <div className="flex gap-3">
              <Button
                onClick={() => decide(true)}
                disabled={busy}
                className="flex-1 bg-gradient-to-r from-red-500 to-orange-500 text-white"
              >
                Approve
              </Button>
              <Button onClick={() => decide(false)} disabled={busy} variant="outline" className="flex-1">
                Deny
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
