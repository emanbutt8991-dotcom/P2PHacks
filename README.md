# Waymark 2.0

**Plan. Pivot. Grow.** A map-based supply-chain decision platform for Canadian small and medium-sized businesses.

Waymark answers one question: *how can my company make smarter supply-chain decisions while reducing financial risk, environmental impact and social harm?*

> Hackathon build. Both demo companies are fictional. Pricing is proposed, not validated. Nothing here is financial, legal, customs or compliance advice.

## Features

- **Command Center:** company metrics, risk alerts and activity on one screen.
- **Interactive map:** suppliers, warehouses, ports, airports and routes, with filters. Runs without a tile service or API key.
- **Shipments:** add, edit, delete, filter and sort, with an activity feed and real weather checks.
- **Risk Simulator:** ten scenario types run on your own suppliers, comparing responses by cost, timing and emissions.
- **Canadian and Global Alternatives:** compare the same product and annual quantity across suppliers and countries.
- **Recommendations:** an explainable scoring engine with five priorities, plus optional AI wording.
- **Sustainability:** transport emissions by mode, supplier, country, shipment and month, plus responsible-sourcing records.
- **Reports:** four report types with PDF and CSV export. Enterprise adds a custom builder.
- **Onboarding:** guided setup, HS code suggestions, dynamic supplier forms, CSV import, quick or exact financials.
- **Tiers:** Demo, Free, Pro and Enterprise, from one entitlement file enforced by the UI, the API and the database.

## Tech stack

| Layer | Choice |
| --- | --- |
| Front end | React 19, Vite 8, Tailwind 4, React Router 7 |
| Map | MapLibre GL 6 with a Natural Earth basemap (SVG fallback without WebGL) |
| Charts, PDF | Recharts, jsPDF |
| API | Node, Express 5 (holds all secrets) |
| Accounts and database | Supabase, optional, with row-level security |
| Emissions | Climatiq Intermodal Freight API v3.1, optional |
| Public data | Bank of Canada (FX), Open-Meteo (weather, geocoding), OpenSky (aircraft), Wikidata (company records) |
| AI wording | Claude API, optional |
| Tests | Vitest, PGlite (real Postgres for the schema), Playwright with system Edge or Chrome |

## Quick start

Needs Node 20.19+ or 22.12+. No keys or source edits are needed.

```bash
npm install
npm run dev        # front end on http://localhost:5173, API on http://localhost:8787
```

Production, as a single process:

```bash
npm run build
npm start          # serves the app and API on http://localhost:8787
```

To run the parts separately: `npm run dev:web` and `npm run dev:api`.

## Configuration

Copy `.env.example` to `.env`. Every value is optional, and `.env` is git-ignored.

### Climatiq

Add `CLIMATIQ_API_KEY=` to `.env` and restart the API. The key stays on the server. On Pro and Enterprise, shipments are then calculated through `POST /freight/v3.1/intermodal` and stored with their method, notices and timestamp.

The integration has been run against the real API with both demo companies' routes. Ports are sent as UN/LOCODEs, airports as IATA codes, and other places as coordinates. Sea and rail legs are split into separate calls, because Climatiq cannot always link them at one transfer point.

### Supabase (real accounts)

1. Create a project, then run `supabase/migrations/0001_waymark_schema.sql` with `supabase db push` or the SQL editor.
2. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env`, then rebuild.
3. To change a company's plan, update `companies.plan` with the service role. Billing is not implemented, and clients cannot change their own plan.

Never put the `service_role` key in a `VITE_` variable, because those are bundled into the browser.

### Other integrations

- **AI wording:** set `ANTHROPIC_API_KEY`. Claude only rewords computed facts. A reply containing any figure not in those facts is discarded, and the rule-based explanation stays.
- **Tracking:** `TRACKING_PROVIDER` and `TRACKING_API_KEY` are reserved. `/api/tracking/lookup` is an adapter seam only. No provider is implemented, so it returns 501.

## Demo companies and tiers

Open `/demo` or choose **Try Demo**, then pick a company.

- **Maple Trail Home Goods:** Ontario cookware importer sourcing from Vietnam and China by ocean and road, using exact financials.
- **Northern Leaf Apparel:** clothing retailer sourcing across several countries by air and ocean, using quick estimates, with one supplier known only at country level.

The switcher in the top bar previews Free, Pro and Enterprise instantly. It simulates access only and never touches billing. Switching down keeps your data and pauses new additions. Demo edits stay in your browser and can be reset in Company Settings, under Plan.

The original 3-minute calculator is still available at `/quick-estimate`.

### Sample accounts for each tier

On **Sign up**, use **Spawn Free**, **Spawn Pro** or **Spawn Enterprise** to fill the form, then **Create local workspace**. Every onboarding step is prefilled with fictional data sized for that tier, so you can click **Next** through the sections and finish. Each account also gets sample shipments and is labelled as sample data. Reopen them from **Sign in**, in the same browser. Onboarding also has a **Spawn demo details** button that fills everything and jumps to Review.

With real Supabase accounts the details still fill in, but a paid plan has to be set in the database with the service role.

## Live, estimated and simulated data

| Data | Status | Label in the app |
| --- | --- | --- |
| Demo companies, suppliers, leads, shipments, events | Fictional | Demo Data, Simulated |
| Exchange rates | Live from Bank of Canada, otherwise a dated snapshot | Source and date |
| Weather | Live from Open-Meteo | Potential disruption, with source and time |
| Aircraft positions | Live from OpenSky (Pro and up) | Never linked to cargo or a shipment |
| Company records | Live from Wikidata | Public listing, unvetted, Request Quote |
| Emissions | Climatiq when configured on Pro and up, otherwise a Waymark estimate | Climatiq, or Waymark estimate, not Climatiq |
| Shipment markers on the map | Computed from ETD and ETA | Estimated from schedule, not live tracking |
| Routes and distances | Schematic great-circle arcs through maritime gateways | Routes are schematic |
| Financial figures | Your inputs, supplier records or range midpoints | Actual input, Derived, Estimated midpoint |

## Data limitations

- **Emissions are transport-only.** They exclude production, packaging, warehousing and end-of-life, so a closer supplier is not automatically lower-carbon overall.
- **The Waymark estimate** uses rounded generic factors per tonne-kilometre (sea 0.015, road 0.1, rail 0.025, air 0.6 kg CO₂e). Use it for comparison, not disclosure.
- **Freight estimates** for alternatives use planning rates per tonne-kilometre until you have quotes.
- **HS suggestions** are a curated list of six-digit codes matched by keyword. They are not classifications. The Canadian ten-digit code must come from you or your broker.
- **Duty rates** are never assumed. They depend on classification, origin, agreements and proof of origin. The trade-agreement names are context, not a rate.
- **Labour indicators** are short by design. Only ITUC ratings verified during development are included (China, India, Bangladesh, Türkiye, Vietnam, Mexico). Others show "not on file", which does not mean low risk. Country indicators say nothing about any individual supplier.
- **Currencies** with no sourced rate are flagged and left out of CAD totals. This includes VND, because Bank of Canada ended that series in 2019.
- **Local workspaces** have no password and no real security. They live in one browser. Plan limits there are enforced by the client only. Real enforcement needs Supabase.
- **Enterprise integrations** (ERP, outbound API) are labelled integration points, not live connections.
- **Schema coverage:** `transport_legs`, `scenario_results` and `compliance_records` exist in the schema, but the app currently keeps that data inside the `details` of shipments, scenarios and suppliers.

## Security

- Secrets are read only by the Node API. `/api/health` reports booleans, never values.
- Bearer tokens are verified with Supabase, and plans are read from the database under row-level security.
- Plan limits are enforced by database triggers. The plan column cannot be changed by clients.
- The API validates inputs, rate-limits by IP, times out and retries upstream calls, and caps anonymous Climatiq usage per day with `DEMO_CLIMATIQ_DAILY`.
- Anonymous visitors can preview a plan with a header. This unlocks no private data, only demo-level access under that cap.

## Testing

```bash
npm test                          # unit, API and database tests
npm run build && npm run test:e2e # full journeys in headless Edge or Chrome
```

`npm test` runs the migration in a real embedded Postgres to check tenant isolation, roles and plan limits. `test:e2e` covers the demo journey, tier restrictions, onboarding, shipment editing, API failure, missing WebGL and Climatiq success and failure. Set `E2E_BROWSER` to a browser path if needed, and `E2E_SHOTS` to a folder to save screenshots.

## Project layout

```text
shared/       Entitlements, ports and airports, routing, emissions, country data
server/       Express API, Climatiq client, public data providers, access control
supabase/     Database migration
src/engine/   Company model, finance, simulator, alternatives, recommendations, reports
src/state/    Session and workspace provider
src/services/ API client, repositories, Supabase, PDF
src/pages/    Application pages
src/components/  map/, app/ (kit, forms, feeds), demo/ (original calculator), landing page
tests/, e2e/  Automated tests
```

## Where to edit

- **Plans and limits:** `shared/entitlements.js`, and keep `subscription_plans` in the migration in step.
- **Scenario types and sliders:** `src/engine/simulator.js`.
- **Original formulas:** `src/utils/calculations.js`.
- **Recommendation weights:** `src/engine/recommend.js`.
- **Emission factors:** `shared/emissions.js`. **Freight rates:** `src/engine/alternatives.js`.
- **Demo companies:** `src/data/demoCompanies.js`. **HS list:** `src/data/hsCodes.js`.
- **Landing copy:** `src/data/content.js`. **Colours:** `src/index.css`.
