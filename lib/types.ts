// Core domain types for CanFirst-AI.

export type Classification =
  | "VERIFIED FACT"
  | "CALCULATED"
  | "ESTIMATED"
  | "INFERRED"
  | "AI SCENARIO"
  | "UNKNOWN"
  | "DEMO DATA";

export type Confidence = "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN";

export type RelationshipLabel = "CONFIRMED" | "HIGH-CONFIDENCE INFERENCE" | "POSSIBLE" | "UNKNOWN";

export type ProductMatch = "Exact" | "Comparable" | "Possible" | "Unverified";

export type TransportMode = "truck" | "rail" | "ocean" | "ocean+rail";

/** A value that carries its own evidence — every number shown in the UI should be one of these. */
export interface Evidence {
  label: string;
  value: string;
  classification: Classification;
  confidence: Confidence;
  source?: string;
  sourceUrl?: string;
  sourceDate?: string;
  retrievalDate?: string;
  methodology?: string;
  assumptions?: string[];
  agent?: string;
  note?: string;
}

export interface SupplierOption {
  id: string;
  name: string;
  kind: "current" | "canadian" | "global";
  location: string;
  country: string;
  countryCode: string;
  match: ProductMatch;
  unitPrice: number; // CAD per tonne
  priceBasis: "OBSERVED" | "ESTIMATE";
  freightPerT: number; // CAD per tonne
  mode: TransportMode;
  distanceKm: number;
  tariffPct: number; // applied to unit price
  tradeAgreement: string;
  insurancePct: number;
  brokeragePerT: number;
  fxRiskPct: number; // currency buffer on unit price
  leadDays: number;
  productionCO2ePerT: number; // tonnes CO2e per tonne of product
  capacityNote: string;
  certifications: string[];
  switchingCost: number; // one-time CAD
  geopolitics: string;
  evidenceQuality: Confidence;
}

export interface Input {
  id: string;
  name: string;
  hs: string;
  hsDesc: string;
  origin: string;
  country: string;
  countryCode: string;
  annualSpend: number; // CAD invoice value
  volume: string;
  tariffPct: number;
  leadDays: number;
  relationship: RelationshipLabel;
  flagship?: boolean;
}
