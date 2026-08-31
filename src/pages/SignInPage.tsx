import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Cloud, Sparkles, Link2, BarChart3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";

export default function SignInPage() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const mode = params.get("mode") === "signup" ? "signup" : "signin";

  const rawNext = params.get("next");
  const next = rawNext && /^\/(?!\/)/.test(rawNext) ? rawNext : "/dashboard";

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      if (s) nav(next, { replace: true });
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) nav(next, { replace: true });
      setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, [nav, next]);

  const handleGoogle = async () => {
    setError(null);
    const res = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: `${window.location.origin}/signin?next=${encodeURIComponent(next)}`,
      extraParams: { prompt: "select_account" },
    });
    if (res.error) setError(res.error.message || "Sign-in failed");
  };


  return (
    <div className="min-h-screen bg-[#0a0a0a] text-gray-100 grid md:grid-cols-2">
      <div className="hidden md:flex flex-col justify-between p-10 bg-gradient-to-br from-red-500/10 via-orange-500/5 to-transparent border-r border-white/5">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
            <Cloud className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-lg">Creator Cloud</span>
        </Link>
        <div className="space-y-6 max-w-sm">
          <h2 className="text-3xl font-bold leading-tight">Smart links that turn clicks into subscribers.</h2>
          <ul className="space-y-4 text-sm text-gray-400">
            <li className="flex gap-3"><Link2 className="w-5 h-5 text-orange-400 flex-shrink-0" /> Create branded short links with a required action gate.</li>
            <li className="flex gap-3"><Sparkles className="w-5 h-5 text-orange-400 flex-shrink-0" /> Free forever plan — no credit card required.</li>
            <li className="flex gap-3"><BarChart3 className="w-5 h-5 text-orange-400 flex-shrink-0" /> Real-time click analytics on every link.</li>
          </ul>
        </div>
        <p className="text-xs text-gray-600">© {new Date().getFullYear()} Creator Cloud</p>
      </div>

      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-6">
          <div className="md:hidden flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
              <Cloud className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg">Creator Cloud</span>
          </div>

          <div>
            <h1 className="text-2xl font-bold">
              {mode === "signup" ? "Create your free account" : "Welcome back"}
            </h1>
            <p className="text-sm text-gray-400 mt-2">
              {mode === "signup"
                ? "Start building smart links in seconds."
                : "Sign in to manage your smart links and analytics."}
            </p>
          </div>

          {error && (
            <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
              {error}
            </div>
          )}

          <Button onClick={handleGoogle} disabled={loading} className="w-full h-11 bg-white text-black hover:bg-gray-100">
            <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            Continue with Google
          </Button>

          <p className="text-xs text-gray-500 text-center">
            By continuing you agree to our{" "}
            <Link to="/terms" className="underline hover:text-gray-300">Terms</Link> and{" "}
            <Link to="/privacy" className="underline hover:text-gray-300">Privacy Policy</Link>.
          </p>

          <div className="text-center text-sm text-gray-500">
            {mode === "signup" ? (
              <>Already have an account? <Link to="/signin" className="text-white hover:underline">Sign in</Link></>
            ) : (
              <>New here? <Link to="/signin?mode=signup" className="text-white hover:underline">Create an account</Link></>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
