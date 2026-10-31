// Modular data-source adapters. Each connector implements the same interface so
// new sources can be added without touching the UI or the calculation engine.
import type { Evidence } from "./types";

export type Tier = 1 | 2 | 3 | 4 | 5;

export const TIER_LABELS: Record<Tier, string> = {
  1: "Government / official statistics / regulatory filings",
  2: "Company annual reports / official company information",
  3: "Trade associations / established research organizations",
  4: "Credible news / market research",
  5: "Other web sources",
};

export interface SourceAdapter {
  id: string;
  name: string;
  tier: Tier;
  url: string;
  covers: string[];
  status: "demo" | "ready" | "not-configured";
  /** Fetch evidence for a query. Real implementations call the source server-side. */
  query?: (q: string) => Promise<Evidence[]>;
}

export const SOURCES: SourceAdapter[] = [
  { id: "statcan", name: "Statistics Canada", tier: 1, url: "https://www.statcan.gc.ca", covers: ["Trade flows", "Input-output multipliers", "Employment"], status: "not-configured" },
  { id: "tdo", name: "Trade Data Online (ISED)", tier: 1, url: "https://ised-isde.canada.ca/site/trade-data-online/en", covers: ["Imports by HS & origin", "Province detail"], status: "not-configured" },
  { id: "cid", name: "Canadian Importers Database", tier: 1, url: "https://ised-isde.canada.ca/site/canadian-importers-database/en", covers: ["Importers by product & city"], status: "not-configured" },
  { id: "cbsa", name: "Canada Border Services Agency — Customs Tariff", tier: 1, url: "https://www.cbsa-asfc.gc.ca/trade-commerce/tariff-tarif/menu-eng.html", covers: ["Tariff schedule", "Surtaxes", "Customs rules"], status: "not-configured" },
  { id: "opengov", name: "Open Government Canada", tier: 1, url: "https://open.canada.ca", covers: ["Datasets"], status: "not-configured" },
  { id: "nrcan", name: "Natural Resources Canada", tier: 1, url: "https://natural-resources.canada.ca", covers: ["Minerals & metals", "Energy"], status: "not-configured" },
  { id: "eccc", name: "Environment and Climate Change Canada", tier: 1, url: "https://www.canada.ca/en/environment-climate-change.html", covers: ["Emission factors", "Carbon pricing"], status: "not-configured" },
  { id: "comtrade", name: "UN Comtrade", tier: 1, url: "https://comtradeplus.un.org", covers: ["Global trade flows"], status: "not-configured" },
  { id: "worldbank", name: "World Bank WITS", tier: 1, url: "https://wits.worldbank.org", covers: ["Tariffs", "Trade indicators"], status: "not-configured" },
  { id: "oecd", name: "OECD", tier: 1, url: "https://data.oecd.org", covers: ["TiVA", "Industry indicators"], status: "not-configured" },
  { id: "filings", name: "Company filings (SEDAR+ / EDGAR)", tier: 2, url: "https://www.sedarplus.ca", covers: ["Annual reports", "Disclosed suppliers"], status: "not-configured" },
  { id: "assoc", name: "Trade associations", tier: 3, url: "", covers: ["Member directories", "Capacity surveys"], status: "not-configured" },
  { id: "news", name: "Credible news & market research", tier: 4, url: "", covers: ["Price observations", "Policy developments"], status: "not-configured" },
  { id: "demo", name: "CanFirst Demo Dataset", tier: 5, url: "", covers: ["Fictional company, suppliers & values"], status: "demo" },
];

export const DEMO_SOURCE = "CanFirst Demo Dataset (fictional)";
