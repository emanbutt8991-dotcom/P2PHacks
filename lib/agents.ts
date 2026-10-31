// Agent registry — the 12 specialised agents, their default provider and the
// concise, user-facing status lines shown in the Analysis Room.
export type Provider = "openai" | "anthropic" | "gemini" | "perplexity" | "openrouter" | "custom";

export interface AgentDef {
  id: string;
  name: string;
  role: string;
  status: string;
  finding: string;
  provider: Provider;
  model: string;
}

export const PROVIDERS: { id: Provider; label: string; defaultModel: string; baseUrl: string }[] = [
  { id: "openai", label: "OpenAI", defaultModel: "gpt-4o", baseUrl: "https://api.openai.com/v1" },
  { id: "anthropic", label: "Anthropic", defaultModel: "claude-sonnet-5-5", baseUrl: "https://api.anthropic.com/v1" },
  { id: "gemini", label: "Google Gemini", defaultModel: "gemini-2.5-pro", baseUrl: "https://generativelanguage.googleapis.com/v1beta" },
  { id: "perplexity", label: "Perplexity", defaultModel: "sonar-pro", baseUrl: "https://api.perplexity.ai" },
  { id: "openrouter", label: "OpenRouter", defaultModel: "openrouter/auto", baseUrl: "https://openrouter.ai/api/v1" },
  { id: "custom", label: "Custom OpenAI-compatible", defaultModel: "", baseUrl: "" },
];

export const AGENTS: AgentDef[] = [
  { id: "company", name: "Company Intelligence Agent", role: "Company, operations, products, documented relationships", status: "Researching company...", finding: "CanFirst Industrial Systems · Cambridge, ON · 350 employees · NAICS 333248 (DEMO)", provider: "perplexity", model: "sonar-pro" },
  { id: "trade", name: "Trade Agent", role: "HS codes, NAICS, trade flows, tariffs", status: "Mapping imports...", finding: "7 input categories mapped · 4 sourced from the U.S. · HS 7208 flagged", provider: "openai", model: "gpt-4o" },
  { id: "canadian", name: "Canadian Supplier Agent", role: "Can Canada supply it first?", status: "Searching Canada first...", finding: "4 Canadian candidates · 1 Exact · 1 Comparable · 1 Possible · 1 Unverified", provider: "perplexity", model: "sonar-pro" },
  { id: "global", name: "Global Supplier Agent", role: "Plan B diversification outside CA and current country", status: "Building Plan B...", finding: "South Korea (CKFTA), Germany (CETA), Mexico (CUSMA) shortlisted", provider: "perplexity", model: "sonar-pro" },
  { id: "financial", name: "Financial Agent", role: "Landed cost, FX, switching, 3-year impact (deterministic engine)", status: "Calculating landed cost...", finding: "Current landed cost $1,181/t vs Lakeshore $931/t (calculated)", provider: "openai", model: "gpt-4o" },
  { id: "climate", name: "Climate Agent", role: "Production + transport CO2e", status: "Estimating emissions...", finding: "Trade-off found: lowest-cost option is NOT lowest-carbon", provider: "gemini", model: "gemini-2.5-pro" },
  { id: "economic", name: "Economic Agent", role: "Import substitution, regional activity, jobs scenarios", status: "Modelling Canadian impact...", finding: "Illustrative multiplier 1.55 applied — flagged ESTIMATED", provider: "openai", model: "gpt-4o" },
  { id: "community", name: "Community Agent", role: "Workers, regions, skills, stakeholder considerations", status: "Evaluating stakeholder effects...", finding: "Hamilton-area demand may rise; capacity pressure possible", provider: "anthropic", model: "claude-sonnet-5-5" },
  { id: "policy", name: "Policy & Geopolitical Agent", role: "Tariffs, agreements, export controls, chokepoints", status: "Reviewing trade environment...", finding: "Current-policy vs future-scenario separated · 3 agreements checked", provider: "perplexity", model: "sonar-pro" },
  { id: "forecast", name: "Forecast Agent", role: "6-month to 3-year base / upside / downside", status: "Projecting scenarios...", finding: "3 scenario paths generated from disclosed assumptions", provider: "openai", model: "gpt-4o" },
  { id: "redteam", name: "Red Team / Verification Agent", role: "Challenges every claim, source and calculation", status: "Verifying 47 claims...", finding: "41 passed · 4 downgraded to ESTIMATED · 2 rejected (unsupported capacity claims)", provider: "anthropic", model: "claude-opus-5-5" },
  { id: "chief", name: "Chief Analyst", role: "Synthesises only verified outputs", status: "Building CanFirst report...", finding: "CanFirst Intelligence Report ready · no single 'best' answer issued", provider: "openai", model: "gpt-4o" },
];
