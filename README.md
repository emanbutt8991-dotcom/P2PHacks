# CanFirst-AI 🍁

**Can Canada supply it first?**
Canadian options first. Global alternatives always. Evidence decides.

A hackathon-ready Next.js + TypeScript app that maps a Canadian company's supply-chain dependencies, searches for Canadian suppliers first, compares global Plan B options, and simulates the financial, climate, economic and community ripple effects of switching. Styled in a red-and-white Canadian flag palette.

---

## Run it in VS Code

1. Open the `canfirst-ai` folder in VS Code (**File → Open Folder…**).
2. Open the terminal (**Terminal → New Terminal**) and run:

   ```bash
   npm install
   npm run dev
   ```

3. Open **http://localhost:3000**.

Requires Node.js 18.18+ (Node 20 or 22 recommended). No API keys are needed — the flagship demo runs entirely on labelled **DEMO DATA**.

Production build: `npm run build && npm start`.

---

Full product guide: open `docs/CanFirst-AI-Guide.html` in a browser.

## Live Research (real companies, real sources)

The **● Live Research** page (`/live`) researches any real company, industry, product or HS code on the web: dependencies, Canadian suppliers first, Plan B suppliers, tariffs, unknowns and a source list.

**Easiest:** open **Live Research** (or **Agent Settings**), paste a key under **AI keys** and press **Save**. It is saved on your computer in `.canfirst-keys.json`, works straight away and survives restarts.

**Or with a file:**

1. Copy `.env.example` → `.env.local` (on Windows, check it isn't saved as `.env.local.txt`; the app reads that too, just in case).
2. Add at least one API key (these come from developer sites and are billed separately from ChatGPT/Claude/Grok subscriptions):
   - Claude → console.anthropic.com → `ANTHROPIC_API_KEY`
   - ChatGPT → platform.openai.com → `OPENAI_API_KEY`
   - Gemini (free tier) → aistudio.google.com → `GEMINI_API_KEY`
   - Perplexity → `PERPLEXITY_API_KEY` · Grok → console.x.ai → `XAI_API_KEY` (no web search, so results are labelled INFERRED)
3. Restart `npm run dev`, open **Live Research**, search.

A search takes ~20–60 seconds and costs a few cents. If a provider says the model was not found, edit the model box next to the provider.

**Red Team verification (deterministic):** every claim must cite a source. Claims with no source, or whose source URL was not actually retrieved by the web search, are automatically downgraded, and suppliers without evidence become *Unverified*. The page shows how many claims were checked and downgraded.

**Demo tip:** pre-run one live search before presenting and keep the tab open. If Wi-Fi or the API fails on stage, switch to the demo company, which needs no internet.

## The 3-minute demo path

1. **Overview** (`/`) — hero, search, Canada dependency map.
2. Search **CanFirst Industrial Systems** (or click *Open company intelligence*).
3. Supply-chain graph → **U.S. dependency 68%** (calculated, not hard-coded).
4. Click **Steel — Texas, USA** → spend, tariff, transport, carbon, lead time.
5. **CAN CANADA SUPPLY IT?** → Canadian candidates graded Exact / Comparable / Possible / Unverified.
6. **PLAN B — GLOBAL DIVERSIFICATION** → South Korea, Germany, Mexico.
7. Landed-cost engine with visible formulas.
8. Adjust the mix → **SIMULATE SWITCH** → animated graph, Before → After metrics.
9. **RIPPLE EFFECT**, **3-YEAR OUTLOOK** (base / upside / downside), **RECOMMENDATION MATRIX**.
10. Finish on **Agent Room** (`/agents`) and **Reports** (`/reports`, export PDF/CSV/JSON).

Click any metric to open **“Why am I seeing this?”** — classification, confidence, method, assumptions and responsible agent.

---

## Colour palette

All colours are CSS tokens at the top of `app/globals.css`:

| Token | Hex | Use |
|---|---|---|
| `--red` | `#d52b1e` | Flag red — primary actions, Canada nodes, highlights |
| `--red-deep` | `#a3171c` | Hover, emphasis text |
| `--red-ink` | `#6e0e12` | Text on red tints |
| `--red-tint` | `#fdeceb` | Selected rows, callouts |
| `--white` | `#ffffff` | Cards, hero centre (the flag's white square) |
| `--paper` | `#faf7f6` | Page background |
| `--ink` | `#1c1718` | Body text, U.S. nodes |

The header carries a thin red-white-red flag band, and the hero uses red side bars around a white centre with a maple leaf.

---

## Project structure

```
app/                    Pages (App Router)
  page.tsx              Overview / hero
  map/                  Canada economic map (tile cartogram)
  companies/canfirst-industrial/   ★ Flagship flow
  scenario/             Scenario Lab + strategy modes + resilience dashboard
  agents/               Multi-agent Analysis Room
  reports/              CanFirst Intelligence Report (PDF/CSV/JSON)
  settings/             Agent Control Center
  upload/               Procurement CSV upload
  api/agents/test/      Server-side TEST CONNECTION route
components/             UI (graph, map, drawer, badges, flagship sections)
lib/
  live.ts               ★ Live research: provider calls, JSON parsing, source verification
  calc.ts               ★ Deterministic engine: landed cost, scenarios, carbon, strategies
  demo-data.ts          Fictional company, suppliers, province indices
  agents.ts             12-agent registry & providers
  sources.ts            Data-source adapter interface & source tiers
  types.ts              Domain types (Evidence, SupplierOption, …)
```

## Design principles kept in code

- **No LLM arithmetic.** Every percentage, tariff, landed cost, CO2e and scenario number comes from `lib/calc.ts`.
- **Every value is classified**: VERIFIED FACT · CALCULATED · ESTIMATED · INFERRED · AI SCENARIO · UNKNOWN · DEMO DATA.
- **No fabrication.** Missing data shows `DATA NOT AVAILABLE`, `PRICE NOT PUBLICLY AVAILABLE` or `UNVERIFIED SUPPLIER MATCH`.
- **No single "best" answer** — the recommendation matrix shows lowest-cost, highest-Canadian, lowest-carbon, most-diversified and balanced scenarios side by side.

## API keys (optional)

Copy `.env.example` to `.env.local` and add any provider keys. Keys are read only on the server. Session-only keys typed in **Agent Settings** live in browser memory, are masked, are sent to this app's own server only for the connection test, and disappear on reload.

## Disclaimer

All companies, suppliers, prices and province indices in demo mode are **fictional**. The 25% tariff on U.S. steel/aluminum is a demo assumption — verify current rates against the CBSA Customs Tariff before any real decision.
