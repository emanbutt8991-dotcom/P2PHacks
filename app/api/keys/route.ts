// GET    /api/keys            → which providers have a key, where it came from, masked
// POST   /api/keys {provider, key} → save a key on this computer (no restart needed)
// DELETE /api/keys {provider}      → remove a key saved from the app
import { NextResponse } from "next/server";
import { LIVE_PROVIDERS } from "@/lib/live";
import { getKey, saveKey, removeKey, mask, cleanKey, isLocalRequest } from "@/lib/keystore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function status() {
  return LIVE_PROVIDERS.map((p) => {
    const k = getKey(p.envKey);
    return { id: p.id, label: p.label, envKey: p.envKey, webSearch: p.webSearch, configured: Boolean(k.value), source: k.source, masked: mask(k.value) };
  });
}

export async function GET(req: Request) {
  return NextResponse.json({ providers: status(), canSave: isLocalRequest(req) });
}

async function body(req: Request): Promise<{ provider?: unknown; key?: unknown }> {
  try { return await req.json(); } catch { return {}; }
}

export async function POST(req: Request) {
  if (!isLocalRequest(req)) return NextResponse.json({ error: "Keys can only be saved when the app is opened on this computer (localhost). Use .env.local instead." }, { status: 403 });
  const b = await body(req);
  const p = LIVE_PROVIDERS.find((x) => x.id === b.provider);
  if (!p) return NextResponse.json({ error: "Choose a provider." }, { status: 400 });
  const key = typeof b.key === "string" ? cleanKey(b.key) : "";
  if (key.length < 10 || key.length > 400 || /\s/.test(key)) return NextResponse.json({ error: "That doesn't look like an API key. Paste the whole key with no spaces." }, { status: 400 });
  try { saveKey(p.envKey, key); }
  catch { return NextResponse.json({ error: "Couldn't write the key file in the project folder. Check the folder isn't read-only." }, { status: 500 }); }
  return NextResponse.json({ ok: true, providers: status() });
}

export async function DELETE(req: Request) {
  if (!isLocalRequest(req)) return NextResponse.json({ error: "Not allowed from another computer." }, { status: 403 });
  const b = await body(req);
  const p = LIVE_PROVIDERS.find((x) => x.id === b.provider);
  if (!p) return NextResponse.json({ error: "Choose a provider." }, { status: 400 });
  try { removeKey(p.envKey); } catch { /* nothing saved */ }
  return NextResponse.json({ ok: true, providers: status() });
}
