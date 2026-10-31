// ─────────────────────────────────────────────────────────────────────────────
// DEMO DATA — fictional, for the hackathon flagship flow.
// Every company and supplier named here is FICTIONAL. Values are simulated.
// The UI labels all of this as DEMO DATA. Real data enters via lib/sources.ts.
// ─────────────────────────────────────────────────────────────────────────────
import type { Input, SupplierOption } from "./types";

export const DEMO_DATE = "2026-10-01";

export const company = {
  id: "canfirst-industrial",
  name: "CanFirst Industrial Systems",
  industry: "Advanced Manufacturing",
  naics: "333248 — Other industrial machinery manufacturing",
  hq: "Cambridge, Ontario",
  operations: ["Cambridge, ON (assembly)", "Mississauga, ON (warehouse)"],
  employees: 350,
  revenue: "$96M (simulated)",
  products: ["Automated conveyor systems", "Industrial control cabinets", "Material-handling frames"],
};

/** Procurement inputs. Dependency %s are computed from these, never hard-coded. */
export const inputs: Input[] = [
  { id: "steel", name: "Steel (hot-rolled flat)", hs: "7208", hsDesc: "Flat-rolled iron/non-alloy steel, hot-rolled", origin: "Texas, USA", country: "United States", countryCode: "US", annualSpend: 8_400_000, volume: "9,800 t/yr", tariffPct: 25, leadDays: 21, relationship: "CONFIRMED", flagship: true },
  { id: "electronics", name: "Industrial electronics", hs: "8537", hsDesc: "Boards, panels, consoles for electric control", origin: "Michigan, USA", country: "United States", countryCode: "US", annualSpend: 5_200_000, volume: "14,500 units/yr", tariffPct: 0, leadDays: 35, relationship: "CONFIRMED" },
  { id: "aluminum", name: "Aluminum components", hs: "7616", hsDesc: "Other articles of aluminum", origin: "Ohio, USA", country: "United States", countryCode: "US", annualSpend: 3_600_000, volume: "620 t/yr", tariffPct: 25, leadDays: 24, relationship: "CONFIRMED" },
  { id: "plastics", name: "Plastic components", hs: "3926", hsDesc: "Other articles of plastics", origin: "Pennsylvania, USA", country: "United States", countryCode: "US", annualSpend: 2_100_000, volume: "1.2M parts/yr", tariffPct: 0, leadDays: 18, relationship: "HIGH-CONFIDENCE INFERENCE" },
  { id: "machined", name: "Machined parts", hs: "8483", hsDesc: "Transmission shafts, bearings housings, gears", origin: "Ontario, Canada", country: "Canada", countryCode: "CA", annualSpend: 5_100_000, volume: "38,000 parts/yr", tariffPct: 0, leadDays: 9, relationship: "CONFIRMED" },
  { id: "sensors", name: "Sensors & controllers", hs: "9032", hsDesc: "Automatic regulating instruments", origin: "Osaka, Japan", country: "Japan", countryCode: "JP", annualSpend: 2_000_000, volume: "9,000 units/yr", tariffPct: 0, leadDays: 42, relationship: "POSSIBLE" },
  { id: "bearings", name: "Bearings", hs: "8482", hsDesc: "Ball or roller bearings", origin: "Bavaria, Germany", country: "Germany", countryCode: "DE", annualSpend: 1_980_000, volume: "52,000 units/yr", tariffPct: 0, leadDays: 38, relationship: "CONFIRMED" },
];

export const STEEL_VOLUME_T = 9_800;

/** Steel sourcing options for the flagship "Can Canada supply it?" flow. */
export const steelOptions: SupplierOption[] = [
  {
    id: "gulf", name: "Gulf Coast Steel Co.", kind: "current", location: "Houston, Texas", country: "United States", countryCode: "US",
    match: "Exact", unitPrice: 857, priceBasis: "OBSERVED", freightPerT: 88, mode: "rail", distanceKm: 2_300,
    tariffPct: 25, tradeAgreement: "CUSMA (counter-tariff applied in demo)", insurancePct: 0.3, brokeragePerT: 6, fxRiskPct: 1.5,
    leadDays: 21, productionCO2ePerT: 1.2, capacityNote: "Large — no constraint expected", certifications: ["ASTM A1011", "ISO 9001"],
    switchingCost: 0, geopolitics: "Exposed to Canada–US tariff measures", evidenceQuality: "HIGH",
  },
  {
    id: "lakeshore", name: "Lakeshore Steel Works", kind: "canadian", location: "Hamilton, Ontario", country: "Canada", countryCode: "CA",
    match: "Exact", unitPrice: 905, priceBasis: "ESTIMATE", freightPerT: 18, mode: "truck", distanceKm: 75,
    tariffPct: 0, tradeAgreement: "Domestic", insurancePct: 0.2, brokeragePerT: 0, fxRiskPct: 0,
    leadDays: 10, productionCO2ePerT: 1.6, capacityNote: "~12,000 t/yr spare (supplier-stated, unverified)", certifications: ["CSA G40.21", "ASTM A1011", "ISO 9001"],
    switchingCost: 180_000, geopolitics: "Domestic — low", evidenceQuality: "MEDIUM",
  },
  {
    id: "northbridge", name: "Northbridge EAF Steel", kind: "canadian", location: "Sault Ste. Marie, Ontario", country: "Canada", countryCode: "CA",
    match: "Comparable", unitPrice: 930, priceBasis: "ESTIMATE", freightPerT: 52, mode: "truck", distanceKm: 610,
    tariffPct: 0, tradeAgreement: "Domestic", insurancePct: 0.2, brokeragePerT: 0, fxRiskPct: 0,
    leadDays: 14, productionCO2ePerT: 0.6, capacityNote: "~5,000 t/yr — partial coverage only", certifications: ["CSA G40.21", "ISO 14001"],
    switchingCost: 240_000, geopolitics: "Domestic — low", evidenceQuality: "MEDIUM",
  },
  {
    id: "prairie", name: "Prairie Rolling Mills", kind: "canadian", location: "Regina, Saskatchewan", country: "Canada", countryCode: "CA",
    match: "Possible", unitPrice: 880, priceBasis: "ESTIMATE", freightPerT: 92, mode: "rail", distanceKm: 2_700,
    tariffPct: 0, tradeAgreement: "Domestic", insurancePct: 0.25, brokeragePerT: 0, fxRiskPct: 0,
    leadDays: 18, productionCO2ePerT: 0.5, capacityNote: "Unknown — grade fit not confirmed", certifications: ["CSA G40.21"],
    switchingCost: 260_000, geopolitics: "Domestic — low", evidenceQuality: "LOW",
  },
  {
    id: "quebec", name: "St-Laurent Flat Products", kind: "canadian", location: "Contrecœur, Québec", country: "Canada", countryCode: "CA",
    match: "Unverified", unitPrice: 0, priceBasis: "ESTIMATE", freightPerT: 48, mode: "truck", distanceKm: 640,
    tariffPct: 0, tradeAgreement: "Domestic", insurancePct: 0.2, brokeragePerT: 0, fxRiskPct: 0,
    leadDays: 0, productionCO2ePerT: 0, capacityNote: "DATA NOT AVAILABLE", certifications: [],
    switchingCost: 0, geopolitics: "Domestic — low", evidenceQuality: "UNKNOWN",
  },
  {
    id: "hanbit", name: "Hanbit Steel", kind: "global", location: "Pohang", country: "South Korea", countryCode: "KR",
    match: "Exact", unitPrice: 780, priceBasis: "ESTIMATE", freightPerT: 120, mode: "ocean+rail", distanceKm: 11_400,
    tariffPct: 0, tradeAgreement: "CKFTA", insurancePct: 0.5, brokeragePerT: 9, fxRiskPct: 3,
    leadDays: 48, productionCO2ePerT: 1.9, capacityNote: "Large", certifications: ["JIS G3131", "ISO 9001"],
    switchingCost: 210_000, geopolitics: "Pacific shipping lanes; KRW exposure", evidenceQuality: "MEDIUM",
  },
  {
    id: "rheinwerk", name: "Rheinwerk Stahl", kind: "global", location: "Duisburg", country: "Germany", countryCode: "DE",
    match: "Exact", unitPrice: 960, priceBasis: "ESTIMATE", freightPerT: 105, mode: "ocean+rail", distanceKm: 6_900,
    tariffPct: 0, tradeAgreement: "CETA", insurancePct: 0.45, brokeragePerT: 9, fxRiskPct: 2.5,
    leadDays: 38, productionCO2ePerT: 1.1, capacityNote: "Moderate", certifications: ["EN 10025", "ISO 9001"],
    switchingCost: 220_000, geopolitics: "EU CBAM & energy-price exposure; EUR exposure", evidenceQuality: "MEDIUM",
  },
  {
    id: "monterrey", name: "Acero Monterrey", kind: "global", location: "Monterrey, Nuevo León", country: "Mexico", countryCode: "MX",
    match: "Comparable", unitPrice: 820, priceBasis: "ESTIMATE", freightPerT: 130, mode: "rail", distanceKm: 3_400,
    tariffPct: 0, tradeAgreement: "CUSMA (if originating)", insurancePct: 0.35, brokeragePerT: 7, fxRiskPct: 2.5,
    leadDays: 26, productionCO2ePerT: 1.3, capacityNote: "Moderate", certifications: ["ASTM A1011"],
    switchingCost: 200_000, geopolitics: "Rail transits US; MXN exposure", evidenceQuality: "LOW",
  },
];

export const opt = (id: string) => steelOptions.find((o) => o.id === id)!;

// Province tile cartogram for the Canada map (DEMO DATA indices).
export interface ProvinceTile {
  code: string; name: string; r: number; c: number;
  usDependency: number; importValueB: number; topIndustry: string; tariffExposure: "High" | "Medium" | "Low";
  substitution: "High" | "Medium" | "Low"; topInputs: string[];
}
export const provinces: ProvinceTile[] = [
  { code: "YT", name: "Yukon", r: 0, c: 0, usDependency: 41, importValueB: 0.4, topIndustry: "Mining", tariffExposure: "Low", substitution: "Low", topInputs: ["Fuel", "Machinery"] },
  { code: "NT", name: "Northwest Territories", r: 0, c: 1, usDependency: 44, importValueB: 0.5, topIndustry: "Mining", tariffExposure: "Low", substitution: "Low", topInputs: ["Fuel", "Heavy equipment"] },
  { code: "NU", name: "Nunavut", r: 0, c: 2, usDependency: 38, importValueB: 0.3, topIndustry: "Mining", tariffExposure: "Low", substitution: "Low", topInputs: ["Fuel", "Food"] },
  { code: "NL", name: "Newfoundland and Labrador", r: 0, c: 6, usDependency: 39, importValueB: 3.1, topIndustry: "Energy", tariffExposure: "Medium", substitution: "Medium", topInputs: ["Machinery", "Steel"] },
  { code: "BC", name: "British Columbia", r: 1, c: 0, usDependency: 47, importValueB: 58, topIndustry: "Forestry & Ports", tariffExposure: "Medium", substitution: "Medium", topInputs: ["Machinery", "Electronics", "Vehicles"] },
  { code: "AB", name: "Alberta", r: 1, c: 1, usDependency: 66, importValueB: 34, topIndustry: "Energy", tariffExposure: "High", substitution: "Medium", topInputs: ["Steel pipe", "Machinery", "Chemicals"] },
  { code: "SK", name: "Saskatchewan", r: 1, c: 2, usDependency: 71, importValueB: 12, topIndustry: "Agriculture & Potash", tariffExposure: "High", substitution: "Low", topInputs: ["Farm machinery", "Fertilizer inputs"] },
  { code: "MB", name: "Manitoba", r: 1, c: 3, usDependency: 69, importValueB: 15, topIndustry: "Agri-food", tariffExposure: "Medium", substitution: "Medium", topInputs: ["Machinery", "Plastics", "Vehicles"] },
  { code: "ON", name: "Ontario", r: 1, c: 4, usDependency: 68, importValueB: 390, topIndustry: "Automotive & Manufacturing", tariffExposure: "High", substitution: "High", topInputs: ["Vehicle parts", "Steel", "Electronics"] },
  { code: "QC", name: "Québec", r: 1, c: 5, usDependency: 57, importValueB: 110, topIndustry: "Aerospace & Aluminum", tariffExposure: "High", substitution: "High", topInputs: ["Aircraft parts", "Machinery", "Chemicals"] },
  { code: "PE", name: "Prince Edward Island", r: 1, c: 6, usDependency: 52, importValueB: 0.8, topIndustry: "Agri-food", tariffExposure: "Low", substitution: "Low", topInputs: ["Packaging", "Machinery"] },
  { code: "NB", name: "New Brunswick", r: 2, c: 5, usDependency: 62, importValueB: 14, topIndustry: "Energy & Forestry", tariffExposure: "Medium", substitution: "Medium", topInputs: ["Crude oil", "Machinery"] },
  { code: "NS", name: "Nova Scotia", r: 2, c: 6, usDependency: 48, importValueB: 7, topIndustry: "Seafood & Defence", tariffExposure: "Medium", substitution: "Medium", topInputs: ["Machinery", "Vessels parts"] },
];

export const industries = [
  { name: "Automotive", provinces: "ON, QC", inputs: ["Engines & parts (HS 8708)", "Steel (HS 72)", "Electronics (HS 85)"], hs: "8703, 8708" },
  { name: "Steel & Aluminum", provinces: "ON, QC", inputs: ["Iron ore & scrap", "Alumina", "Electrodes"], hs: "72, 76" },
  { name: "Construction", provinces: "All", inputs: ["Structural steel", "Lumber", "HVAC equipment"], hs: "7308, 4407, 8415" },
  { name: "Agriculture", provinces: "SK, AB, MB", inputs: ["Farm machinery", "Fertilizer", "Seed"], hs: "8432, 31" },
  { name: "Agri-food", provinces: "ON, QC, MB", inputs: ["Packaging", "Fresh produce", "Ingredients"], hs: "07, 20, 3923" },
  { name: "Food Processing", provinces: "ON, QC", inputs: ["Processing machinery", "Packaging", "Sweeteners"], hs: "8438, 1701" },
  { name: "Energy", provinces: "AB, NL, SK", inputs: ["Steel pipe", "Pumps & valves", "Turbines"], hs: "7304, 8481" },
  { name: "Mining", provinces: "QC, ON, BC", inputs: ["Heavy equipment", "Explosives", "Tires"], hs: "8429, 3602" },
  { name: "Aerospace", provinces: "QC, ON, MB", inputs: ["Engines", "Titanium", "Avionics"], hs: "8411, 8108, 8526" },
  { name: "Electronics", provinces: "ON, QC, BC", inputs: ["Semiconductors", "PCBs", "Displays"], hs: "8542, 8534" },
  { name: "Machinery", provinces: "ON, QC", inputs: ["Steel", "Bearings", "Controls"], hs: "8482, 8537" },
  { name: "Retail", provinces: "All", inputs: ["Consumer goods", "Apparel", "Electronics"], hs: "61-62, 85" },
  { name: "Pulp & Paper", provinces: "QC, BC, ON", inputs: ["Chemicals", "Machinery", "Felts"], hs: "28, 8439" },
  { name: "Plastics", provinces: "ON, QC, AB", inputs: ["Resins", "Moulds", "Additives"], hs: "3901-3907" },
  { name: "Chemicals", provinces: "AB, ON", inputs: ["Feedstocks", "Catalysts", "Equipment"], hs: "29, 3815" },
  { name: "Pharmaceuticals", provinces: "ON, QC", inputs: ["APIs", "Excipients", "Packaging"], hs: "2941, 3004" },
];
