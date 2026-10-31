"use client";
import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { defaultAssumptions, type Allocation, type Assumptions } from "@/lib/calc";
import type { Evidence } from "@/lib/types";

interface Split { current: number; canadian: number; global: number } // integer %s summing to 100

interface Store {
  canadianId: string; setCanadianId: (id: string) => void;
  globalId: string; setGlobalId: (id: string) => void;
  split: Split; setSplit: (s: Split) => void;
  assumptions: Assumptions; setAssumptions: (a: Assumptions) => void;
  switched: boolean; setSwitched: (b: boolean) => void;
  alloc: Allocation;
  evidence: Evidence | null; openEvidence: (e: Evidence) => void; closeEvidence: () => void;
}

const Ctx = createContext<Store | null>(null);

export const DEFAULT_SPLIT: Split = { current: 15, canadian: 70, global: 15 };

export function StoreProvider({ children }: { children: ReactNode }) {
  const [canadianId, setCanadianId] = useState("lakeshore");
  const [globalId, setGlobalId] = useState("hanbit");
  const [split, setSplit] = useState<Split>(DEFAULT_SPLIT);
  const [assumptions, setAssumptions] = useState<Assumptions>(defaultAssumptions);
  const [switched, setSwitched] = useState(false);
  const [evidence, setEvidence] = useState<Evidence | null>(null);

  const alloc = useMemo<Allocation>(() => {
    const a: Allocation = { gulf: split.current / 100 };
    a[canadianId] = (a[canadianId] ?? 0) + split.canadian / 100;
    a[globalId] = (a[globalId] ?? 0) + split.global / 100;
    return a;
  }, [split, canadianId, globalId]);

  const value: Store = {
    canadianId, setCanadianId, globalId, setGlobalId, split, setSplit,
    assumptions, setAssumptions, switched, setSwitched, alloc,
    evidence, openEvidence: setEvidence, closeEvidence: () => setEvidence(null),
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error("useStore must be used inside StoreProvider");
  return s;
}

/** Rebalance a 3-way split when one slider moves, keeping the total at 100. */
export function rebalance(split: Split, key: keyof Split, value: number): Split {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  const others = (Object.keys(split) as (keyof Split)[]).filter((k) => k !== key);
  const rest = 100 - v;
  const otherTotal = others.reduce((s, k) => s + split[k], 0);
  const next = { ...split, [key]: v } as Split;
  if (otherTotal === 0) { next[others[0]] = rest; next[others[1]] = 0; return next; }
  const first = Math.round((split[others[0]] / otherTotal) * rest);
  next[others[0]] = first;
  next[others[1]] = rest - first;
  return next;
}
