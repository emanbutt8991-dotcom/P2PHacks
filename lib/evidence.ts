import type { Classification, Confidence, Evidence } from "./types";
import { DEMO_DATE } from "./demo-data";
import { DEMO_SOURCE } from "./sources";

/** Build an Evidence object for a demo-mode metric. */
export function ev(
  label: string,
  value: string,
  classification: Classification,
  opts: { methodology?: string; assumptions?: string[]; agent?: string; confidence?: Confidence; note?: string; source?: string } = {},
): Evidence {
  return {
    label, value, classification,
    confidence: opts.confidence ?? (classification === "CALCULATED" ? "HIGH" : classification === "ESTIMATED" ? "MEDIUM" : classification === "AI SCENARIO" ? "LOW" : "MEDIUM"),
    source: opts.source ?? DEMO_SOURCE,
    sourceDate: DEMO_DATE,
    retrievalDate: DEMO_DATE,
    methodology: opts.methodology,
    assumptions: opts.assumptions,
    agent: opts.agent,
    note: opts.note ?? "Demo mode: inputs are fictional and simulated. Connect real data sources to replace them.",
  };
}
