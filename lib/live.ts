// ─────────────────────────────────────────────────────────────────────────────
// LIVE RESEARCH — server-only. Calls a real AI provider with web search, asks for
// structured JSON, then runs deterministic verification on what came back.
// API keys are read on the server (lib/keystore.ts) and never leave it.
// ─────────────────────────────────────────────────────────────────────────────

import { getKey, getSetting } from "./keystore";

export type LiveProvider = "anthropic" | "openai" | "gemini" | "perplexity" | "xai";

export const LIVE_PROVIDERS: { id: LiveProvider; label: string; envKey: string; envModel: string; defaultModel: string; webSearch: boolean }[] = [
  { id: "anthropic", label: "Claude (Anthropic)", envKey: "ANTHROPIC_API_KEY", envModel: "ANTHROPIC_MODEL", defaultModel: "claude-sonnet-5-5", webSearch: true },
  { id: "openai", label: "ChatGPT (OpenAI)", envKey: "OPENAI_API_KEY", envModel: "OPENAI_MODEL", defaultModel: "gpt-5", webSearch: true },
  { id: "gemini", label: "Gemini (Google)", envKey: "GEMINI_API_KEY", envModel: "GEMINI_MODEL", defaultModel: "gemini-flash-latest", webSearch: true },
  { id: "perplexity", label: "Perplexity", envKey: "PERPLEXITY_API_KEY", envModel: "PERPLEXITY_MODEL", defaultModel: "sonar-pro", webSearch: true },
  { id: "xai", label: "Grok (xAI)", envKey: "XAI_API_KEY", envModel: "XAI_MODEL", defaultModel: "grok-4", webSearch: false },
];

export function configuredProviders() {
  return LIVE_PROVIDERS.map((p) => ({
    id: p.id, label: p.label, webSearch: p.webSearch,
    model: getSetting(p.envModel) || p.defaultModel,
    configured: Boolean(getKey(p.envKey).value),
  }));
}

// ── Result shape ─────────────────────────────────────────────────────────────
const CLASSES = ["VERIFIED FACT", "CALCULATED", "ESTIMATED", "INFERRED", "AI SCENARIO", "UNKNOWN"] as const;
const CONFS = ["HIGH", "MEDIUM", "LOW", "UNKNOWN"] as const;
const MATCHES = ["Exact", "Comparable", "Possible", "Unverified"] as const;
const RELS = ["CONFIRMED", "HIGH-CONFIDENCE INFERENCE", "POSSIBLE", "UNKNOWN"] as const;

export interface Claim { classification: (typeof CLASSES)[number]; confidence: (typeof CONFS)[number]; sources: number[]; downgraded?: string }
export interface LiveSource { id: number; title: string; url: string; publisher?: string; date?: string; tier: number; retrieved: boolean }
export interface LiveResult {
  query: string;
  subjectType: string;
  summary: string;
  subject: { name: string; description: string; headquarters?: string; industry?: string; naics?: string; hsCodes?: { code: string; description: string }[] } & Claim;
  inputs: ({ name: string; hs?: string; likelyOrigins: string[]; relationship: (typeof RELS)[number]; note?: string } & Claim)[];
  canadianSuppliers: ({ name: string; location: string; product: string; match: (typeof MATCHES)[number]; why: string; certifications?: string; capacity?: string } & Claim)[];
  planB: ({ name: string; country: string; product: string; match: (typeof MATCHES)[number]; tradeAgreement?: string; why: string } & Claim)[];
  tariffs: ({ item: string; rate: string; appliesTo: string; note?: string } & Claim)[];
  unknowns: string[];
  sources: LiveSource[];
  meta: { provider: LiveProvider; model: string; webSearch: boolean; retrievedUrls: number; elapsedMs: number; checked: number; downgraded: number; generatedAt: string };
}

// ── Prompt ───────────────────────────────────────────────────────────────────
const SYSTEM = `You are the CanFirst-AI research team (Company, Trade, Canadian Supplier, Global Supplier and Policy agents) for a Canadian supply-chain intelligence platform.
Goal: for the user's subject (a company, industry, product, material or HS code), find what it depends on from the U.S./abroad, which CANADIAN companies could plausibly supply it first, and which international "Plan B" suppliers exist outside Canada and the U.S.

Hard rules:
- Use web search. Prefer Tier 1 sources (Government of Canada, Statistics Canada, CBSA, ISED, official filings), then Tier 2 (company annual reports/sites), Tier 3 (trade associations), Tier 4 (credible news), Tier 5 (other).
- NEVER fabricate. If you cannot find something, say so in "unknowns". Do not invent companies, prices, capacities, revenues or tariff rates.
- Never claim a company buys from a specific supplier unless a source says so. Importers are not necessarily final users.
- Being in the same industry does NOT make a supplier a match. Use match = Exact | Comparable | Possible | Unverified.
- Every claim must cite source ids from your "sources" list. A claim with no source must be classification "INFERRED" or "UNKNOWN" with confidence LOW/UNKNOWN.
- Tariffs: give the current rate only if a source supports it; otherwise "UNKNOWN". Separate current policy from possible future changes (put the latter in "note").
- Be neutral. Do not recommend a political position. Do not rank countries as politically best.
- Keep it concise: up to 6 inputs, 6 Canadian suppliers, 5 Plan B suppliers, 5 tariff items, 12 sources.

Return ONLY one JSON object, no prose before or after, matching exactly:
{
 "subjectType": "company|industry|product|material|hs_code",
 "summary": "2-4 sentence neutral executive summary",
 "subject": {"name":"","description":"","headquarters":"","industry":"","naics":"","hsCodes":[{"code":"","description":""}],"classification":"VERIFIED FACT|INFERRED|UNKNOWN","confidence":"HIGH|MEDIUM|LOW|UNKNOWN","sources":[1]},
 "inputs":[{"name":"","hs":"","likelyOrigins":["United States"],"relationship":"CONFIRMED|HIGH-CONFIDENCE INFERENCE|POSSIBLE|UNKNOWN","note":"","classification":"","confidence":"","sources":[1]}],
 "canadianSuppliers":[{"name":"","location":"City, Province","product":"","match":"Exact|Comparable|Possible|Unverified","why":"","certifications":"","capacity":"","classification":"","confidence":"","sources":[2]}],
 "planB":[{"name":"","country":"","product":"","match":"","tradeAgreement":"CUSMA|CETA|CPTPP|CKFTA|...","why":"","classification":"","confidence":"","sources":[3]}],
 "tariffs":[{"item":"","rate":"","appliesTo":"","note":"","classification":"","confidence":"","sources":[4]}],
 "unknowns":["what could not be found"],
 "sources":[{"id":1,"title":"","url":"https://...","publisher":"","date":"YYYY-MM-DD or empty","tier":1}]
}`;

const userPrompt = (q: string) => `Subject: "${q}"\nResearch it now for CanFirst-AI. Canadian options first, global alternatives always, evidence decides. Today's date is ${new Date().toISOString().slice(0, 10)}. Output only the JSON object.`;

// ── Provider calls ───────────────────────────────────────────────────────────
interface Raw { text: string; citedUrls: { url: string; title?: string }[] }

async function post(url: string, headers: Record<string, string>, body: unknown, timeoutMs = 110_000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify(body), signal: ctrl.signal, cache: "no-store" });
    const txt = await r.text();
    let json: any = null;
    try { json = JSON.parse(txt); } catch { /* non-JSON error page */ }
    if (!r.ok) {
      const msg = json?.error?.message || json?.error?.type || json?.message || txt.slice(0, 200);
      throw new ProviderError(r.status, msg);
    }
    return json;
  } catch (e) {
    if (e instanceof ProviderError) throw e;
    if (e instanceof Error && e.name === "AbortError") throw new ProviderError(504, "The AI took too long to respond. Try a narrower search.");
    throw new ProviderError(502, "Could not reach the AI provider (network error).");
  } finally { clearTimeout(t); }
}

export class ProviderError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

async function callAnthropic(q: string, key: string, model: string): Promise<Raw> {
  const messages: any[] = [{ role: "user", content: userPrompt(q) }];
  const blocks: any[] = [];
  for (let turn = 0; turn < 4; turn++) {
    const j = await post("https://api.anthropic.com/v1/messages", { "x-api-key": key, "anthropic-version": "2023-06-01" }, {
      model, max_tokens: 8000, system: SYSTEM, messages,
      tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 6 }],
    });
    blocks.push(...(j.content ?? []));
    if (j.stop_reason !== "pause_turn") break;
    messages.push({ role: "assistant", content: j.content });
  }
  const text = blocks.filter((b) => b.type === "text").map((b) => b.text).join("");
  const cited: Raw["citedUrls"] = [];
  for (const b of blocks) {
    if (b.type === "web_search_tool_result" && Array.isArray(b.content)) for (const r of b.content) if (r.url) cited.push({ url: r.url, title: r.title });
    if (b.type === "text" && Array.isArray(b.citations)) for (const c of b.citations) if (c.url) cited.push({ url: c.url, title: c.title });
  }
  return { text, citedUrls: cited };
}

async function callOpenAI(q: string, key: string, model: string): Promise<Raw> {
  const body = (tool: string) => ({ model, instructions: SYSTEM, input: userPrompt(q), tools: [{ type: tool }] });
  let j: any;
  try { j = await post("https://api.openai.com/v1/responses", { Authorization: `Bearer ${key}` }, body("web_search")); }
  catch (e) {
    if (e instanceof ProviderError && e.status === 400 && /web_search|tool/i.test(e.message)) j = await post("https://api.openai.com/v1/responses", { Authorization: `Bearer ${key}` }, body("web_search_preview"));
    else throw e;
  }
  let text = "";
  const cited: Raw["citedUrls"] = [];
  for (const item of j.output ?? []) {
    if (item.type !== "message") continue;
    for (const c of item.content ?? []) {
      if (c.type === "output_text") {
        text += c.text;
        for (const a of c.annotations ?? []) if (a.type === "url_citation" && a.url) cited.push({ url: a.url, title: a.title });
      }
    }
  }
  return { text, citedUrls: cited };
}

async function callGemini(q: string, key: string, model: string): Promise<Raw> {
  const j = await post(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, { "x-goog-api-key": key }, {
    systemInstruction: { parts: [{ text: SYSTEM }] },
    contents: [{ role: "user", parts: [{ text: userPrompt(q) }] }],
    tools: [{ google_search: {} }],
  });
  const cand = j.candidates?.[0];
  const text = (cand?.content?.parts ?? []).map((p: any) => p.text ?? "").join("");
  // Gemini returns redirect URIs; the title holds the real domain.
  const cited = (cand?.groundingMetadata?.groundingChunks ?? []).filter((c: any) => c.web).map((c: any) => ({ url: c.web.uri, title: c.web.title }));
  return { text, citedUrls: cited };
}

async function callChatCompatible(url: string, q: string, key: string, model: string): Promise<Raw> {
  const j = await post(url, { Authorization: `Bearer ${key}` }, {
    model, temperature: 0.1,
    messages: [{ role: "system", content: SYSTEM }, { role: "user", content: userPrompt(q) }],
  });
  const text = j.choices?.[0]?.message?.content ?? "";
  const cited = [
    ...(Array.isArray(j.citations) ? j.citations.map((u: string) => ({ url: u })) : []),
    ...(Array.isArray(j.search_results) ? j.search_results.map((s: any) => ({ url: s.url, title: s.title })) : []),
  ];
  return { text, citedUrls: cited };
}

// ── Parsing & deterministic verification (the "Red Team" pass) ──────────────
const host = (u: string) => { try { return new URL(u).hostname.replace(/^www\./, "").toLowerCase(); } catch { return u.replace(/^www\./, "").toLowerCase(); } };
const str = (v: unknown, max = 600) => (typeof v === "string" ? v.replace(/[\u0000-\u001f]/g, " ").trim().slice(0, max) : "");
const pick = <T extends readonly string[]>(v: unknown, opts: T, dflt: T[number]): T[number] => {
  const s = str(v).toUpperCase();
  return (opts.find((o) => o.toUpperCase() === s) ?? dflt) as T[number];
};
const arr = (v: unknown, n: number): any[] => (Array.isArray(v) ? v.slice(0, n) : []);

function extractJSON(text: string): any {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = fenced ? fenced[1] : text;
  const start = body.indexOf("{"), end = body.lastIndexOf("}");
  if (start < 0 || end <= start) throw new ProviderError(502, "The AI did not return structured results. Try again or rephrase the search.");
  try { return JSON.parse(body.slice(start, end + 1)); }
  catch { throw new ProviderError(502, "The AI returned malformed results. Try again."); }
}

export function normalize(q: string, raw: Raw, provider: LiveProvider, model: string, webSearch: boolean, elapsedMs: number): LiveResult {
  const j = extractJSON(raw.text);
  const retrievedHosts = new Set(raw.citedUrls.flatMap((c) => [host(c.url), c.title ? host(c.title) : ""]).filter(Boolean));
  const retrievedUrls = new Set(raw.citedUrls.map((c) => c.url));

  const sources: LiveSource[] = arr(j.sources, 20).map((s: any, i: number) => {
    const url = str(s.url, 500);
    const okUrl = /^https?:\/\//i.test(url);
    return {
      id: Number.isFinite(+s.id) ? +s.id : i + 1,
      title: str(s.title, 200) || host(url),
      url: okUrl ? url : "",
      publisher: str(s.publisher, 120),
      date: str(s.date, 20),
      tier: Math.min(5, Math.max(1, Math.round(+s.tier || 5))),
      retrieved: okUrl && (retrievedUrls.has(url) || retrievedHosts.has(host(url))),
    };
  });
  // Add provider citations the model forgot to list, so the user can still inspect them.
  for (const c of raw.citedUrls) {
    if (sources.length >= 25) break;
    if (!/^https?:\/\//i.test(c.url) || sources.some((s) => s.url === c.url || (s.url && host(s.url) === host(c.url) && provider !== "gemini"))) continue;
    sources.push({ id: 1000 + sources.length, title: str(c.title, 200) || host(c.url), url: c.url, tier: 5, retrieved: true });
  }

  const byId = new Map(sources.map((s) => [s.id, s]));
  let checked = 0, downgraded = 0;
  const claim = (o: any): Claim => {
    checked++;
    const ids: number[] = arr(o?.sources, 8).map(Number).filter((n) => byId.has(n));
    let classification = pick(o?.classification, CLASSES, "INFERRED");
    let confidence = pick(o?.confidence, CONFS, "LOW");
    let reason: string | undefined;
    const retrieved = ids.filter((id) => byId.get(id)!.retrieved);
    if (ids.length === 0) {
      if (classification === "VERIFIED FACT") { classification = "INFERRED"; reason = "No source cited"; }
      if (confidence === "HIGH" || confidence === "MEDIUM") { confidence = "LOW"; reason = reason ?? "No source cited"; }
    } else if (retrieved.length === 0 && webSearch) {
      if (classification === "VERIFIED FACT") { classification = "INFERRED"; reason = "Cited source was not retrieved during this search"; }
      if (confidence === "HIGH") { confidence = "MEDIUM"; reason = reason ?? "Cited source was not retrieved during this search"; }
    }
    if (!webSearch && classification === "VERIFIED FACT") { classification = "INFERRED"; reason = "Provider has no web search — answer is from model memory"; }
    if (reason) downgraded++;
    return { classification, confidence, sources: ids, downgraded: reason };
  };

  const s0 = j.subject ?? {};
  const result: LiveResult = {
    query: q,
    subjectType: str(j.subjectType, 30) || "unknown",
    summary: str(j.summary, 1200),
    subject: {
      name: str(s0.name, 160) || q, description: str(s0.description, 600), headquarters: str(s0.headquarters, 160), industry: str(s0.industry, 160), naics: str(s0.naics, 120),
      hsCodes: arr(s0.hsCodes, 6).map((h: any) => ({ code: str(h.code, 20), description: str(h.description, 200) })).filter((h) => h.code),
      ...claim(s0),
    },
    inputs: arr(j.inputs, 8).map((x: any) => ({ name: str(x.name, 160), hs: str(x.hs, 20), likelyOrigins: arr(x.likelyOrigins, 6).map((c: any) => str(c, 60)).filter(Boolean), relationship: pick(x.relationship, RELS, "UNKNOWN"), note: str(x.note, 300), ...claim(x) })).filter((x) => x.name),
    canadianSuppliers: arr(j.canadianSuppliers, 8).map((x: any) => ({ name: str(x.name, 160), location: str(x.location, 120), product: str(x.product, 200), match: pick(x.match, MATCHES, "Unverified"), why: str(x.why, 400), certifications: str(x.certifications, 200), capacity: str(x.capacity, 200), ...claim(x) })).filter((x) => x.name),
    planB: arr(j.planB, 6).map((x: any) => ({ name: str(x.name, 160), country: str(x.country, 80), product: str(x.product, 200), match: pick(x.match, MATCHES, "Unverified"), tradeAgreement: str(x.tradeAgreement, 80), why: str(x.why, 400), ...claim(x) })).filter((x) => x.name),
    tariffs: arr(j.tariffs, 6).map((x: any) => ({ item: str(x.item, 160), rate: str(x.rate, 60) || "UNKNOWN", appliesTo: str(x.appliesTo, 200), note: str(x.note, 300), ...claim(x) })).filter((x) => x.item),
    unknowns: arr(j.unknowns, 10).map((u: any) => str(u, 300)).filter(Boolean),
    sources,
    meta: { provider, model, webSearch, retrievedUrls: raw.citedUrls.length, elapsedMs, checked: 0, downgraded: 0, generatedAt: new Date().toISOString() },
  };
  // Suppliers whose evidence is weak can't be shown as better than "Unverified"/"Possible".
  for (const s of [...result.canadianSuppliers, ...result.planB]) {
    if (s.sources.length === 0 && s.match !== "Unverified") { if (!s.downgraded) downgraded++; s.match = "Unverified"; s.downgraded = s.downgraded ?? "No source — match set to Unverified"; }
  }
  result.meta.checked = checked;
  result.meta.downgraded = downgraded;
  return result;
}

export async function runLiveResearch(q: string, provider: LiveProvider, modelOverride?: string): Promise<LiveResult> {
  const p = LIVE_PROVIDERS.find((x) => x.id === provider);
  if (!p) throw new ProviderError(400, "Unknown provider.");
  const key = getKey(p.envKey).value;
  if (!key) throw new ProviderError(400, `${p.label} has no API key yet. Add one under "AI keys" on this page or in Agent Settings.`);
  const model = (modelOverride && /^[\w.\-:/]{1,80}$/.test(modelOverride) ? modelOverride : "") || getSetting(p.envModel) || p.defaultModel;
  const t0 = Date.now();
  let raw: Raw;
  switch (provider) {
    case "anthropic": raw = await callAnthropic(q, key, model); break;
    case "openai": raw = await callOpenAI(q, key, model); break;
    case "gemini": raw = await callGemini(q, key, model); break;
    case "perplexity": raw = await callChatCompatible("https://api.perplexity.ai/chat/completions", q, key, model); break;
    case "xai": raw = await callChatCompatible("https://api.x.ai/v1/chat/completions", q, key, model); break;
  }
  return normalize(q, raw, provider, model, p.webSearch, Date.now() - t0);
}
