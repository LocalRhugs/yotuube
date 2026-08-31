import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

declare global {
  interface Window { adsbygoogle: unknown[]; }
}

interface AdSlotProps {
  slot?: string;
  format?: "auto" | "fluid" | "rectangle";
  layout?: string;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Google AdSense ad slot.
 * The publisher script is injected only on valid article routes by
 * AdSenseScript. Each slot pushes itself onto the adsbygoogle queue on mount.
 */
export default function AdSlot({
  slot = "0000000000",
  format = "auto",
  layout,
  className = "",
  style,
}: AdSlotProps) {
  const ref = useRef<HTMLModElement>(null);
  const pushed = useRef(false);
  const { pathname } = useLocation();
  const allowed = pathname.startsWith("/blog/");

  useEffect(() => {
    if (!allowed) return;
    if (pushed.current) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      pushed.current = true;
    } catch {
      /* AdSense not ready or blocked — silent */
    }
  }, [allowed]);

  if (!allowed) return null;

  return (
    <div
      className={`ad-slot-wrapper my-8 flex justify-center ${className}`}
      data-ad-wrapper
    >
      <ins
        ref={ref}
        className="adsbygoogle"
        style={{ display: "block", width: "100%", ...style }}
        data-ad-client="ca-pub-8877213222492502"
        data-ad-slot={slot}
        data-ad-format={format}
        data-ad-layout={layout}
        data-full-width-responsive="true"
      />
    </div>
  );
}
