import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Lock, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";

// Bootstrap owners — hardcoded so you can NEVER be locked out even if the DB is unreachable.
// Everyone else is managed live from Settings → Admin Access (public.admin_users, checked via
// the is_current_user_admin RPC). Keep these four; add/remove the rest in the UI.
const ALLOWED_EMAILS = [
  "kimppy444@gmail.com",
  "jessekanhai34@gmail.com",
  "killerkanhai861@gmail.com",
  "askinggod009@gmail.com",
];

const PasswordGate = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // null = not checked yet, true/false = DB allowlist result
  const [dbAllowed, setDbAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Ask the backend whether the signed-in gmail is in the live admin allowlist.
  useEffect(() => {
    if (!session) { setDbAllowed(null); return; }
    let cancelled = false;
    supabase.rpc("is_current_user_admin")
      .then(({ data }) => { if (!cancelled) setDbAllowed(data === true); })
      .catch(() => { if (!cancelled) setDbAllowed(false); });
    return () => { cancelled = true; };
  }, [session]);

  const handleSignIn = async () => {
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/admin`,
        queryParams: { prompt: "select_account" },
      },
    });
    if (error) setError(error.message || "Sign-in failed");
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><div className="text-muted-foreground">Loading…</div></div>;
  }

  const email = session?.user?.email?.toLowerCase() ?? null;
  const bootstrapAllowed = !!email && ALLOWED_EMAILS.includes(email);
  const allowed = bootstrapAllowed || dbAllowed === true;

  if (session && allowed) return <>{children}</>;

  // Signed in, not a bootstrap owner, still waiting on the DB allowlist check.
  if (session && !bootstrapAllowed && dbAllowed === null) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><div className="text-muted-foreground">Checking access…</div></div>;
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-4">
        <div className="flex flex-col items-center gap-3 mb-6">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Lock className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-xl font-display font-bold text-foreground">Admin Access</h1>
          <p className="text-sm text-muted-foreground text-center">
            {session && !allowed
              ? `${email} is not authorized for this site.`
              : "Sign in with an authorized Google account."}
          </p>
        </div>

        {error && <p className="text-xs text-destructive text-center">{error}</p>}

        {session && !allowed ? (
          <Button onClick={handleSignOut} variant="outline" className="w-full">
            <LogOut className="w-4 h-4 mr-2" />
            Sign out & try another account
          </Button>
        ) : (
          <Button onClick={handleSignIn} className="w-full">
            Continue with Google
          </Button>
        )}
      </div>
    </div>
  );
};

export default PasswordGate;
