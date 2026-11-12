/** Photo reader. Needs ANTHROPIC_API_KEY in .env.local; without it the chat falls back to asking the user. */
const PROMPT = `You read photos taken by a Schindler employee of lifts, escalators, moving walks, building sites and notices.
Reply with ONLY one JSON object, no prose:
{"subject":"unit|site|notice|none","equip":"lift|escalator|walk","brand":"ours|other|unclear","number":"unit number or null","servicer":"us|other|maker|staff|nobody|unknown","capacity":"text or null","ageGuess":number or null,"sees":"one short sentence"}
- subject "unit": a lift/escalator/moving walk is shown. "site": a building under construction with no lift yet. "notice": a notice or sign about a lift. "none": none of these.
- brand "ours" only if you can read the Schindler name or logo; "other" if another maker's name or logo is readable; otherwise "unclear". Never guess.
- number: only if clearly legible on a plate; otherwise null.
- servicer: from a service sticker; "unknown" if none is visible.`;

export async function POST(req: Request) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return Response.json({ error: "no reader configured" }, { status: 501 });
  let body: { images?: string[]; hint?: string };
  try { body = await req.json(); } catch { return Response.json({ error: "bad request" }, { status: 400 }); }
  const images = (body.images ?? []).slice(0, 4);
  const content = [
    ...images.flatMap((u) => { const m = /^data:(image\/[a-z+]+);base64,(.+)$/.exec(u); return m ? [{ type: "image", source: { type: "base64", media_type: m[1], data: m[2] } }] : []; }),
    { type: "text", text: `Read these photos.${body.hint ? ` Context: ${body.hint}` : ""}` },
  ];
  if (content.length < 2) return Response.json({ error: "no images" }, { status: 400 });
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST", headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: "claude-sonnet-5-5", max_tokens: 400, system: PROMPT, messages: [{ role: "user", content }] }),
  });
  if (!res.ok) return Response.json({ error: "reader failed" }, { status: 502 });
  const data = (await res.json()) as { content?: { type: string; text?: string }[] };
  const txt = data.content?.find((c) => c.type === "text")?.text ?? "";
  const m = /\{[\s\S]*\}/.exec(txt);
  if (!m) return Response.json({ error: "unreadable answer" }, { status: 502 });
  try {
    const j = JSON.parse(m[0]);
    return Response.json({
      subject: ["unit", "site", "notice", "none"].includes(j.subject) ? j.subject : "none", equip: ["lift", "escalator", "walk"].includes(j.equip) ? j.equip : "lift",
      brand: ["ours", "other", "unclear"].includes(j.brand) ? j.brand : "unclear", number: j.number || undefined,
      servicer: ["us", "other", "maker", "staff", "nobody", "unknown"].includes(j.servicer) ? j.servicer : "unknown",
      capacity: j.capacity || undefined, ageGuess: typeof j.ageGuess === "number" ? j.ageGuess : undefined, sees: String(j.sees ?? ""),
    });
  } catch { return Response.json({ error: "unreadable answer" }, { status: 502 }); }
}
