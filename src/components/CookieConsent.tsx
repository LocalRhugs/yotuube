import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Cookie } from "lucide-react";

const KEY = "cc_consent_v1";

export default function CookieConsent() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!localStorage.getItem(KEY)) setOpen(true);
  }, []);

  const decide = (value: "all" | "essential") => {
    localStorage.setItem(KEY, value);
    setOpen(false);
    // Signal AdSense for personalized vs non-personalized ads (best-effort)
    try {
      // @ts-ignore
      window.adsbygoogle = window.adsbygoogle || [];
      // @ts-ignore
      window.adsbygoogle.requestNonPersonalizedAds = value === "essential" ? 1 : 0;
    } catch { /* ignore */ }
  };

  if (!open) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-[60] p-3 sm:p-4">
      <div className="mx-auto max-w-4xl rounded-xl border border-white/10 bg-[#0f0f0f]/95 backdrop-blur-lg p-4 sm:p-5 shadow-2xl flex flex-col sm:flex-row gap-3 sm:items-center">
        <Cookie className="w-5 h-5 text-amber-400 flex-shrink-0" />
        <p className="text-sm text-gray-300 flex-1">
          We use cookies to run this site and to show ads (Google AdSense). You can accept all cookies or only the
          essentials. See our{" "}
          <Link to="/privacy" className="underline hover:text-white">Privacy Policy</Link>.
        </p>
        <div className="flex gap-2 flex-shrink-0">
          <Button variant="outline" size="sm" onClick={() => decide("essential")} className="border-white/10">
            Essential only
          </Button>
          <Button size="sm" onClick={() => decide("all")}>Accept all</Button>
        </div>
      </div>
    </div>
  );
}
