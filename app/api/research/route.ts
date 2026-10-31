// GET  /api/research → which live providers are configured (no keys returned)
// POST /api/research → run live research { query, provider, model? }
import { NextResponse } from "next/server";
import { configuredProviders, runLiveResearch, ProviderError, type LiveProvider } from "@/lib/live";

export const runtime = "nodejs";
export const maxDuration = 120;
export const dynamic = "force-dynamic";

const hits = new Map<string, number[]>();
function limited(ip: string) {
  const now = Date.now();
  const a = (hits.get(ip) ?? []).filter((t) => now - t < 60_000);
  a.push(now);
  hits.set(ip, a);
  return a.length > 6; // max 6 live searches / minute / client
}

export async function GET() {
  return NextResponse.json({ providers: configuredProviders() });
}

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for") ?? "local";
  if (limited(ip)) return NextResponse.json({ error: "Too many searches — wait a minute and try again." }, { status: 429 });

  let body: { query?: unknown; provider?: unknown; model?: unknown };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }

  const query = typeof body.query === "string" ? body.query.replace(/[\u0000-\u001f<>]/g, " ").trim().slice(0, 160) : "";
  if (query.length < 2) return NextResponse.json({ error: "Type a company, product, material or HS code." }, { status: 400 });

  const available = configuredProviders().filter((p) => p.configured);
  const provider = (typeof body.provider === "string" && available.some((p) => p.id === body.provider) ? body.provider : available[0]?.id) as LiveProvider | undefined;
  if (!provider) return NextResponse.json({ error: "No AI key saved yet. Add one under AI keys on this page." }, { status: 400 });

  try {
    const result = await runLiveResearch(query, provider, typeof body.model === "string" ? body.model : undefined);
    return NextResponse.json({ result });
  } catch (e) {
    const status = e instanceof ProviderError ? e.status : 500;
    let msg = e instanceof Error ? e.message : "Unexpected error.";
    if (status === 401 || status === 403) msg = "The API key was rejected. Check it under Manage AI keys (copy the whole key, and make sure the account has credit).";
    if (status === 429) msg = "The AI provider's rate limit or credit limit was hit. Wait a moment, or check your billing/credits.";
    if (status === 404) msg = `Model not found: ${msg}. Change the model name and try again.`;
    return NextResponse.json({ error: msg }, { status: status >= 400 && status < 600 ? status : 500 });
  }
}
