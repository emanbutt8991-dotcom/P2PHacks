// ─────────────────────────────────────────────────────────────────────────────
// Server-side API key store. A key is found, in order, in:
//   1. the environment (.env.local / .env, loaded by Next.js at startup)
//   2. keys saved from the app (.canfirst-keys.json in the project folder)
//   3. a mis-named ".env.local.txt" (Windows Notepad adds .txt silently)
// Keys are read fresh on every request, so saving one needs no restart.
// The keys file is git-ignored and never sent to the browser.
// ─────────────────────────────────────────────────────────────────────────────
import fs from "node:fs";
import path from "node:path";

const KEYS_FILE = path.join(process.cwd(), ".canfirst-keys.json");
const TXT_FILES = [".env.local.txt", ".env.txt"].map((f) => path.join(process.cwd(), f));

export type KeySource = "env" | "app" | "txt" | "none";

function readSaved(): Record<string, string> {
  try {
    const j = JSON.parse(fs.readFileSync(KEYS_FILE, "utf8"));
    return j && typeof j === "object" ? j : {};
  } catch { return {}; }
}

function parseEnv(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const raw of text.replace(/^﻿/, "").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const m = line.match(/^(?:export\s+)?([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (!m) continue;
    const v = m[2].trim().replace(/^["']|["']$/g, "").trim();
    if (v) out[m[1]] = v;
  }
  return out;
}

function readTxt(): Record<string, string> {
  for (const f of TXT_FILES) {
    try { return parseEnv(fs.readFileSync(f, "utf8")); } catch { /* not there */ }
  }
  return {};
}

/** Clean a pasted key: strip quotes, spaces, a leading "NAME=" someone pasted along with it. */
export function cleanKey(v: string): string {
  return v.trim().replace(/^[A-Z0-9_]+\s*=\s*/, "").replace(/^["']|["']$/g, "").trim();
}

export function getKey(name: string): { value: string; source: KeySource } {
  const env = process.env[name]?.trim();
  if (env) return { value: cleanKey(env), source: "env" };
  const saved = readSaved()[name];
  if (saved) return { value: saved, source: "app" };
  const txt = readTxt()[name];
  if (txt) return { value: cleanKey(txt), source: "txt" };
  return { value: "", source: "none" };
}

export function getSetting(name: string): string {
  return process.env[name]?.trim() || readSaved()[name] || readTxt()[name] || "";
}

export function saveKey(name: string, value: string) {
  const all = readSaved();
  all[name] = value;
  fs.writeFileSync(KEYS_FILE, JSON.stringify(all, null, 2), { encoding: "utf8", mode: 0o600 });
}

export function removeKey(name: string) {
  const all = readSaved();
  delete all[name];
  fs.writeFileSync(KEYS_FILE, JSON.stringify(all, null, 2), { encoding: "utf8", mode: 0o600 });
}

export function mask(k: string): string {
  if (!k) return "";
  return k.length <= 10 ? "•".repeat(k.length) : `${k.slice(0, 4)}••••••${k.slice(-4)}`;
}

/** Saving keys from the browser is allowed only when the app is opened on this computer. */
export function isLocalRequest(req: Request): boolean {
  if (process.env.CANFIRST_ALLOW_KEY_SAVE === "1") return true;
  const host = (req.headers.get("host") ?? "").toLowerCase().replace(/:\d+$/, "");
  return host === "localhost" || host === "127.0.0.1" || host === "[::1]" || host === "::1";
}
