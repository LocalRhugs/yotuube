import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";
import { SITE_ORIGIN } from "../site";

export default defineTool({
  name: "list_smart_links",
  title: "List smart links",
  description:
    "List the signed-in user's smart links with their slug, destination, short URL and click count.",
  inputSchema: {
    search: z.string().trim().optional().describe("Optional text filter on slug, title or destination."),
    limit: z.number().int().min(1).max(100).default(25).describe("Maximum number of links to return."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ search, limit }, ctx) => {
    if (!ctx.isAuthenticated()) throw new ToolError("Not authenticated");
    const supabase = supabaseForUser(ctx);

    let query = supabase
      .from("user_smart_links")
      .select("id, slug, title, description, destination_url, clicks, metadata, created_at")
      .order("created_at", { ascending: false })
      .limit(limit ?? 25);

    if (search) {
      query = query.or(
        `slug.ilike.%${search}%,title.ilike.%${search}%,destination_url.ilike.%${search}%`,
      );
    }

    const { data, error } = await query;
    if (error) throw new ToolError(error.message);

    const links = (data ?? []).map((row) => ({
      id: row.id,
      slug: row.slug,
      title: row.title,
      description: row.description,
      destinationUrl: row.destination_url,
      shortUrl: `${SITE_ORIGIN}/s/${row.slug}`,
      clicks: row.clicks,
      gated: Boolean(row.metadata && Object.keys(row.metadata as object).length > 0),
      createdAt: row.created_at,
    }));

    return {
      content: [
        {
          type: "text" as const,
          text: links.length
            ? links
                .map((l) => `${l.shortUrl} -> ${l.destinationUrl} (${l.clicks} clicks)${l.gated ? " [gated]" : ""}`)
                .join("\n")
            : "No smart links yet.",
        },
      ],
      structuredContent: { links, count: links.length },
    };
  },
});
