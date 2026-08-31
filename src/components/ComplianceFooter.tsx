import { Link } from "react-router-dom";
import { ShieldCheck } from "lucide-react";

/**
 * Permanent safety/abuse disclaimer rendered on every public unlock page.
 * Shown so platforms (YouTube, Meta) and ad networks can verify we explicitly
 * prohibit adult / illegal / harmful content. Also gives a DMCA contact path.
 */
export default function ComplianceFooter() {
  return (
    <div className="max-w-md w-full relative z-10 mt-8 pb-4 text-center">
      <div className="rounded-xl border border-white/10 bg-black/40 backdrop-blur-sm p-4 space-y-2">
        <div className="flex items-center justify-center gap-2 text-emerald-400">
          <ShieldCheck className="w-4 h-4" />
          <span className="text-xs font-semibold uppercase tracking-wider">Safe-content policy</span>
        </div>
        <p className="text-[11px] leading-relaxed text-gray-400">
          We do <strong className="text-gray-200">not</strong> host, promote, or condone adult, pornographic,
          violent, or otherwise illegal material. This unlock page only links to creator-supplied
          destinations and YouTube / Meta content. 18+ only. Ads served by third-party networks are
          subject to their own moderation.
        </p>
        <p className="text-[11px] text-gray-500">
          Report abuse:{" "}
          <a href="mailto:abuse@cloud-publish-pro.app" className="underline hover:text-gray-300">
            abuse@cloud-publish-pro.app
          </a>{" "}
          ·{" "}
          <Link to="/terms" className="underline hover:text-gray-300">Terms & DMCA</Link>
        </p>
      </div>
    </div>
  );
}
