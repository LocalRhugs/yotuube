import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listSmartLinks from "./tools/list-smart-links";
import createSmartLink from "./tools/create-smart-link";
import getLinkAnalytics from "./tools/get-link-analytics";
import deleteSmartLink from "./tools/delete-smart-link";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "remix-of-remix-of-remix-of-remix-of-remix-of-social-sync-hub",
  title: "Remix of Remix of Remix of Remix of Remix of Social Sync Hub",
  version: "0.1.0",
  instructions:
    "Tools for managing Creator Cloud smart links. Use `list_smart_links` to browse the signed-in user's links, `create_smart_link` to make a new short link (optionally gated behind a YouTube watch/subscribe action), `get_link_analytics` for click performance, and `delete_smart_link` to remove one.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listSmartLinks, createSmartLink, getLinkAnalytics, deleteSmartLink],
});
