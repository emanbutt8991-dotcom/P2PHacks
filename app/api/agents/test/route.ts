// POST /api/agents/test — verifies a provider connection server-side.
// Keys: a session-only key from the request body (never stored or logged), or the
// server environment variable. Keys never reach the browser bundle.
import { NextResponse } from "next/server";
import { getKey, getSetting } from "@/lib/keystore";

type Provider = "openai" | "anthropic" | "gemini" | "perplexity" | "openrouter" | "xai" | "custom";

const ENV_KEY: Record<Provider, string> = {
  openai: "OPENAI_API_KEY", anthropic: "ANTHROPIC_API_KEY", gemini: "GEMINI_API_KEY",
  perplexity: "PERPLEXITY_API_KEY", openrouter: "OPENROUTER_API_KEY", xai: "XAI_API_KEY", custom: "CUSTOM_API_KEY",
};

// naive per-instance rate limit
const hits = new Map<string, number[]>();
function limited(ip: string) {
  const now = Date.now();
  const arr = (hits.get(ip) ?? []).filter((t) => now - t < 60_000);
  arr.push(now);
  hits.set(ip, arr);
  return arr.length > 20;
}

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for") ?? "local";
  if (limited(ip)) return NextResponse.json({ status: "Rate limited", detail: "Too many tests — wait a minute." }, { status: 429 });

  let body: { provider?: string; model?: string; sessionKey?: string; baseUrl?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ status: "Failed", detail: "Invalid JSON" }, { status: 400 }); }

  const provider = body.provider as Provider;
  if (!provider || !(provider in ENV_KEY)) return NextResponse.json({ status: "Failed", detail: "Unknown provider" }, { status: 400 });

  const key = (typeof body.sessionKey === "string" && body.sessionKey.trim()) || getKey(ENV_KEY[provider]).value;
  if (!key) return NextResponse.json({ status: "Invalid key", detail: `No session key and ${ENV_KEY[provider]} is not saved yet. Add it under "AI keys".` });

  let url = "", headers: Record<string, string> = {};
  switch (provider) {
    case "openai": url = "https://api.openai.com/v1/models"; headers = { Authorization: `Bearer ${key}` }; break;
    case "anthropic": url = "https://api.anthropic.com/v1/models"; headers = { "x-api-key": key, "anthropic-version": "2023-06-01" }; break;
    case "gemini": url = "https://generativelanguage.googleapis.com/v1beta/models"; headers = { "x-goog-api-key": key }; break;
    case "perplexity": url = "https://api.perplexity.ai/models"; headers = { Authorization: `Bearer ${key}` }; break;
    case "xai": url = "https://api.x.ai/v1/models"; headers = { Authorization: `Bearer ${key}` }; break;
    case "openrouter": url = "https://openrouter.ai/api/v1/auth/key"; headers = { Authorization: `Bearer ${key}` }; break;
    case "custom": {
      const base = (body.baseUrl || getSetting("CUSTOM_BASE_URL") || "").replace(/\/+$/, "");
      if (!/^https:\/\/[^/\s]+/i.test(base)) return NextResponse.json({ status: "Failed", detail: "Custom base URL must be https://" });
      url = `${base}/models`; headers = { Authorization: `Bearer ${key}` }; break;
    }
  }

  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 10_000);
    const r = await fetch(url, { headers, signal: ctrl.signal, cache: "no-store" });
    clearTimeout(t);
    if (r.ok) return NextResponse.json({ status: "Connected", detail: `HTTP ${r.status}` });
    if (r.status === 401 || r.status === 403) return NextResponse.json({ status: "Invalid key", detail: `HTTP ${r.status}` });
    if (r.status === 429) return NextResponse.json({ status: "Rate limited", detail: "Provider rate limit" });
    if (r.status === 404 && provider === "perplexity") return NextResponse.json({ status: "Connected", detail: "Key accepted (models endpoint unavailable)" });
    return NextResponse.json({ status: "Failed", detail: `HTTP ${r.status}` });
  } catch (e) {
    return NextResponse.json({ status: "Failed", detail: e instanceof Error ? e.name : "Network error" });
  }
}
