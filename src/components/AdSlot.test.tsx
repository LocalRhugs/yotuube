import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import AdSlot from "./AdSlot";

describe("AdSlot (visual-regression guard)", () => {
  it("wraps the ad in a container marked with data-ad-wrapper so the global CSS rule can hide it when AdSense doesn't fill", () => {
    const { container } = render(<AdSlot slot="9999999999" />);
    const wrapper = container.querySelector("[data-ad-wrapper]");
    expect(wrapper).not.toBeNull();
    expect(wrapper?.classList.contains("ad-slot-wrapper")).toBe(true);
  });

  it("does NOT set a hard minHeight on the <ins> element — that previously caused a 90-450px empty gap pre-AdSense-approval", () => {
    const { container } = render(<AdSlot slot="9999999999" />);
    const ins = container.querySelector("ins.adsbygoogle") as HTMLElement | null;
    expect(ins).not.toBeNull();
    // inline style.minHeight must be empty/0 — collapse is handled by CSS based on data-ad-status="filled"
    const mh = ins?.style.minHeight ?? "";
    expect(mh === "" || mh === "0px" || mh === "0").toBe(true);
  });

  it("carries the AdSense publisher id and the slot id passed in", () => {
    const { container } = render(<AdSlot slot="1234567890" />);
    const ins = container.querySelector("ins.adsbygoogle") as HTMLElement | null;
    expect(ins?.getAttribute("data-ad-client")).toBe("ca-pub-8877213222492502");
    expect(ins?.getAttribute("data-ad-slot")).toBe("1234567890");
  });
});
