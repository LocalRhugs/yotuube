// discord-announce — posts a new-video announcement to a Discord webhook (server-side).
// Smart pinging: caller passes `ping` ("everyone" | "here" | "none") for long-form vs Short,
// so Shorts don't @everyone like Discord's built-in integration. Includes a clear CTA so
// players know exactly what to press + where the script is (description + pinned comment).

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
function json(o: unknown, status = 200) {
  return new Response(JSON.stringify(o), { status, headers: { ...cors, "Content-Type": "application/json" } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const b = await req.json().catch(() => ({}));
    const webhookUrl = String(b.webhookUrl || "");
    if (!/^https:\/\/(discord|discordapp)\.com\/api\/webhooks\/\d+\/[\w-]+/.test(webhookUrl)) {
      return json({ success: false, error: "invalid_webhook" }, 400);
    }
    const isShort = !!b.isShort;
    const vid = String(b.videoId || "").replace(/[^A-Za-z0-9_-]/g, "").slice(0, 20);
    const link = vid ? (isShort ? `https://www.youtube.com/shorts/${vid}` : `https://www.youtube.com/watch?v=${vid}`) : undefined;
    const img = (typeof b.thumbnail === "string" && b.thumbnail.startsWith("http")) ? b.thumbnail
      : (vid ? `https://i.ytimg.com/vi/${vid}/hqdefault.jpg` : undefined);

    // Clear call-to-action so players know exactly what to press + where the script is.
    const typeLine = isShort ? "📱 **New Short is live!**" : "🎬 **New script is live!**";
    const cta = link
      ? `\n\n**▶️ [CLICK HERE TO WATCH & GET THE SCRIPT](${link})**\n\n🔑 The script link is in the **video description** and the **pinned comment** — watch, grab it, and you're in.`
      : "";

    const embed: Record<string, unknown> = {
      title: String(b.title || "New video").slice(0, 256),
      description: typeLine + cta,
      color: isShort ? 0xf59e0b : 0xff0000,
      fields: [
        { name: "📺 Channel", value: String(b.channelTitle || "YouTube").slice(0, 100), inline: true },
        { name: "🎞️ Type", value: isShort ? "Short" : "Long-form", inline: true },
        { name: "📱 Mobile", value: "Supported", inline: true },
      ],
      footer: { text: "COMBO_WICK • Like + Sub for daily scripts" },
      timestamp: new Date().toISOString(),
    };
    if (link) embed.url = link;
    if (img) embed.image = { url: img };

    const ping = b.ping === "everyone" ? "@everyone" : b.ping === "here" ? "@here" : "";
    const payload = {
      username: "COMBO_WICK Uploads",
      content: ping, // just the ping — the CTA + link live in the embed (no messy raw URL)
      embeds: [embed],
      allowed_mentions: { parse: ping ? ["everyone"] : [] },
    };

    const r = await fetch(webhookUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (!r.ok) return json({ success: false, error: `discord_${r.status}`, detail: (await r.text()).slice(0, 200) });
    return json({ success: true });
  } catch (e) {
    return json({ success: false, error: e instanceof Error ? e.message : "error" });
  }
});
