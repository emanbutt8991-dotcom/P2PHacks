"use client";
import Link from "next/link";
import { useState } from "react";
import { fmtMoney, fmtPct } from "@/lib/calc";

interface Row { product: string; supplier: string; country: string; annualSpend: number; hs: string }

const SAMPLE = `product,description,supplier,supplier_location,country,annual_volume,unit_price,annual_spend,hs_code
Steel coil,Hot-rolled,Gulf Coast Steel Co.,Houston TX,United States,9800,857,8398600,7208
Control panels,PLC cabinets,Great Lakes Controls,Detroit MI,United States,14500,359,5200000,8537
Machined shafts,CNC,Grand River Machining,Kitchener ON,Canada,38000,134,5100000,8483
Bearings,Roller,Bavaria Lager,Schweinfurt,Germany,52000,38,1980000,8482`;

const MAX_BYTES = 2 * 1024 * 1024;

function parseCSV(text: string): Row[] {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) throw new Error("No data rows found.");
  const head = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/[^a-z_]/g, ""));
  const idx = (k: string) => head.indexOf(k);
  if (idx("product") < 0 || idx("country") < 0 || idx("annual_spend") < 0) throw new Error("Required columns: product, country, annual_spend.");
  return lines.slice(1, 5001).map((l) => {
    const c = l.split(",").map((x) => x.trim().replace(/[<>]/g, "")); // basic sanitising
    const spend = Number(c[idx("annual_spend")]);
    return { product: c[idx("product")] ?? "", supplier: c[idx("supplier")] ?? "", country: c[idx("country")] ?? "", annualSpend: Number.isFinite(spend) ? spend : 0, hs: idx("hs_code") >= 0 ? c[idx("hs_code")] : "" };
  });
}

export default function Upload() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [err, setErr] = useState("");

  const onFile = async (f: File) => {
    setErr(""); setRows(null);
    if (f.size > MAX_BYTES) return setErr("File exceeds 2 MB limit.");
    const ext = f.name.split(".").pop()?.toLowerCase();
    if (ext !== "csv") return setErr(`.${ext} files (Excel, PDF invoices, purchase orders) are extracted by the AI agents once providers are configured. In demo mode, upload a CSV.`);
    try { setRows(parseCSV(await f.text())); } catch (e) { setErr(e instanceof Error ? e.message : "Could not parse file."); }
  };

  const total = rows?.reduce((s, r) => s + r.annualSpend, 0) ?? 0;
  const by = (pred: (r: Row) => boolean) => rows?.filter(pred).reduce((s, r) => s + r.annualSpend, 0) ?? 0;
  const us = by((r) => /united states|usa|^us$/i.test(r.country));
  const ca = by((r) => /canada|^ca$/i.test(r.country));

  return (
    <div className="stack">
      <div>
        <div className="eyebrow">Procurement upload</div>
        <h1 className="h-page">Upload procurement data</h1>
        <div className="sub">CSV is parsed in your browser — nothing is sent anywhere. Expected fields: product, description, supplier, supplier_location, country, annual_volume, unit_price, annual_spend, hs_code.</div>
      </div>
      <div className="card">
        <div className="row">
          <label className="btn primary">Choose file<input type="file" accept=".csv,.xlsx,.xls,.pdf" hidden onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} /></label>
          <button className="btn" onClick={() => setRows(parseCSV(SAMPLE))}>Load sample data</button>
          <button className="btn ghost" onClick={() => { const u = URL.createObjectURL(new Blob([SAMPLE], { type: "text/csv" })); const a = document.createElement("a"); a.href = u; a.download = "procurement-sample.csv"; a.click(); }}>Download template</button>
        </div>
        {err && <div className="callout" style={{ marginTop: 12 }}>{err}</div>}
      </div>
      {rows && (
        <>
          <div className="card" style={{ borderTop: "6px solid var(--red)" }}>
            <h2 className="h-sec" style={{ fontSize: 22 }}>YOUR FOREIGN DEPENDENCY</h2>
            <div className="grid g3" style={{ marginTop: 12 }}>
              <div className="metric"><div className="lbl">U.S. procurement</div><div className="val red">{fmtPct((us / total) * 100)}</div><div className="muted">{fmtMoney(us)}</div></div>
              <div className="metric"><div className="lbl">Canadian procurement</div><div className="val">{fmtPct((ca / total) * 100)}</div><div className="muted">{fmtMoney(ca)}</div></div>
              <div className="metric"><div className="lbl">Other countries</div><div className="val">{fmtPct(((total - us - ca) / total) * 100)}</div><div className="muted">{fmtMoney(total - us - ca)}</div></div>
            </div>
            <table className="tbl" style={{ marginTop: 14 }}>
              <thead><tr><th>Top components by spend</th><th>Supplier</th><th>Country</th><th>HS</th><th className="num">Spend</th></tr></thead>
              <tbody>{[...rows].sort((a, b) => b.annualSpend - a.annualSpend).slice(0, 10).map((r, i) => <tr key={i}><td>{r.product}</td><td>{r.supplier}</td><td>{r.country}</td><td className="mono">{r.hs || <span className="muted">suggest via Trade Agent</span>}</td><td className="num">{fmtMoney(r.annualSpend)}</td></tr>)}</tbody>
            </table>
            <div className="muted" style={{ fontSize: 12, marginTop: 8 }}>Tariff exposure requires HS-level tariff lookup (CBSA connector) — DATA NOT AVAILABLE in demo mode.</div>
          </div>
          <Link href="/companies/canfirst-industrial" className="btn primary xl" style={{ alignSelf: "center" }}>SEARCH CANADA FIRST →</Link>
        </>
      )}
    </div>
  );
}
