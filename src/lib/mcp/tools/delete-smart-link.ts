import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "delete_smart_link",
  title: "Delete smart link",
  description: "Permanently delete one of the signed-in user's smart links by its slug.",
  inputSchema: {
    slug: z.string().trim().min(1).describe("Slug of the smart link to delete."),
  },
  annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ slug }, ctx) => {
    if (!ctx.isAuthenticated()) throw new ToolError("Not authenticated");
    const supabase = supabaseForUser(ctx);

    const { data, error } = await supabase
      .from("user_smart_links")
      .delete()
      .eq("slug", slug)
      .select("slug");

    if (error) throw new ToolError(error.message);
    if (!data || data.length === 0) throw new ToolError(`No smart link found with slug "${slug}".`);

    return {
      content: [{ type: "text" as const, text: `Deleted smart link "${slug}".` }],
      structuredContent: { slug, deleted: true },
    };
  },
});
