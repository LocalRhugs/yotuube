import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";
import { SITE_ORIGIN } from "../site";

function normalizeSlug(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

function randomSlug() {
  const alphabet = "abcdefghijkmnpqrstuvwxyz23456789";
  let out = "";
  const bytes = crypto.getRandomValues(new Uint8Array(7));
  for (const b of bytes) out += alphabet[b % alphabet.length];
  return out;
}

export default defineTool({
  name: "create_smart_link",
  title: "Create smart link",
  description:
    "Create a short smart link for the signed-in user, optionally gated behind a YouTube action before the destination unlocks.",
  inputSchema: {
    destinationUrl: z.string().url().describe("Where the visitor lands after unlocking."),
    title: z.string().trim().max(120).optional().describe("Title shown on the unlock page."),
    description: z.string().trim().max(400).optional().describe("Short description shown on the unlock page."),
    slug: z.string().trim().max(40).optional().describe("Custom slug; auto-generated when omitted."),
    youtubeVideoId: z
      .string()
      .trim()
      .optional()
      .describe("YouTube video ID to require watching before the link unlocks."),
    youtubeChannelId: z
      .string()
      .trim()
      .optional()
      .describe("YouTube channel ID to require subscribing to before the link unlocks."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) throw new ToolError("Not authenticated");
    const supabase = supabaseForUser(ctx);

    const slug = input.slug ? normalizeSlug(input.slug) : randomSlug();
    if (!slug) throw new ToolError("Slug must contain at least one letter or number.");

    const metadata: Record<string, unknown> = {};
    if (input.youtubeVideoId) metadata.youtubeVideoId = input.youtubeVideoId;
    if (input.youtubeChannelId) metadata.youtubeChannelId = input.youtubeChannelId;
    if (Object.keys(metadata).length) metadata.requireWatch = true;

    const { data, error } = await supabase
      .from("user_smart_links")
      .insert({
        user_id: ctx.getUserId(),
        slug,
        title: input.title ?? null,
        description: input.description ?? null,
        destination_url: input.destinationUrl,
        metadata,
      })
      .select("id, slug, destination_url, clicks")
      .single();

    if (error) {
      throw new ToolError(
        error.code === "23505" ? `The slug "${slug}" is already taken.` : error.message,
      );
    }

    const shortUrl = `${SITE_ORIGIN}/s/${data.slug}`;
    return {
      content: [{ type: "text" as const, text: `Created ${shortUrl} -> ${data.destination_url}` }],
      structuredContent: { id: data.id, slug: data.slug, shortUrl, destinationUrl: data.destination_url },
    };
  },
});
