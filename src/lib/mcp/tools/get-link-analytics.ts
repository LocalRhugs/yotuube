import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";
import { SITE_ORIGIN } from "../site";

export default defineTool({
  name: "get_link_analytics",
  title: "Get link analytics",
  description:
    "Summarize click performance across the signed-in user's smart links, with a ranked list of top performers.",
  inputSchema: {
    top: z.number().int().min(1).max(25).default(5).describe("How many top links to include."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ top }, ctx) => {
    if (!ctx.isAuthenticated()) throw new ToolError("Not authenticated");
    const supabase = supabaseForUser(ctx);

    const { data, error } = await supabase
      .from("user_smart_links")
      .select("slug, title, destination_url, clicks, metadata")
      .order("clicks", { ascending: false });

    if (error) throw new ToolError(error.message);

    const rows = data ?? [];
    const totalClicks = rows.reduce((sum, r) => sum + (r.clicks ?? 0), 0);
    const gated = rows.filter(
      (r) => r.metadata && Object.keys(r.metadata as object).length > 0,
    ).length;
    const topLinks = rows.slice(0, top ?? 5).map((r) => ({
      slug: r.slug,
      title: r.title,
      shortUrl: `${SITE_ORIGIN}/s/${r.slug}`,
      destinationUrl: r.destination_url,
      clicks: r.clicks,
    }));

    const summary = [
      `Links: ${rows.length}`,
      `Total clicks: ${totalClicks}`,
      `Gated links: ${gated}`,
      "",
      ...topLinks.map((l, i) => `${i + 1}. ${l.shortUrl} — ${l.clicks} clicks`),
    ].join("\n");

    return {
      content: [{ type: "text" as const, text: summary }],
      structuredContent: { totalLinks: rows.length, totalClicks, gatedLinks: gated, topLinks },
    };
  },
});
