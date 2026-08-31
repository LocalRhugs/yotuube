import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import HomePage from "./HomePage";
import { posts } from "@/content/posts";

function renderAt(path: string) {
  return render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/category/:category" element={<HomePage />} />
        </Routes>
      </MemoryRouter>
    </HelmetProvider>
  );
}

describe("HomePage (visual-regression guard)", () => {
  it("renders the right-side 'This week on Creator Cloud' panel on the home hero — prevents the empty-right-half regression", () => {
    const { container } = renderAt("/");
    expect(container.textContent).toMatch(/this week on creator cloud/i);
  });

  it("the weekly panel lists at least 3 recent posts with links", () => {
    const { container } = renderAt("/");
    const paragraphs = Array.from(container.querySelectorAll<HTMLParagraphElement>("p"));
    const heading = paragraphs.find((el) => /this week on creator cloud/i.test(el.textContent ?? ""));
    expect(heading).toBeTruthy();
    const panel = heading?.parentElement;
    const links = panel?.querySelectorAll('a[href^="/blog/"]') ?? [];
    expect(links.length).toBeGreaterThanOrEqual(3);
  });

  it("renders the Editor's Picks rail on home (only when not filtering)", () => {
    const { container } = renderAt("/");
    expect(container.textContent).toMatch(/editor.s picks/i);
  });

  it("thin categories (e.g. TikTok with 1 post) still show a 'More from Creator Cloud' rail — prevents the empty-page regression", () => {
    const tiktokCount = posts.filter((p) => p.category === "TikTok").length;
    if (tiktokCount >= 4) return; // guard only relevant while category is thin
    const { container } = renderAt("/category/tiktok");
    expect(container.textContent).toMatch(/more from creator cloud/i);
  });

  it("category hero also gets the weekly panel — no empty-right-half on category pages", () => {
    const { container } = renderAt("/category/monetization");
    expect(container.textContent).toMatch(/this week on creator cloud/i);
  });
});
