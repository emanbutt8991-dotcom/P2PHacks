# Waymark — Hackathon Prototype

**Plan. Pivot. Grow.** A landing page and an interactive demo for Waymark, a proposed supply-chain risk and cost intelligence platform for Canadian importing SMEs.

> Hackathon prototype · all companies, suppliers, rates and results are fictional or illustrative. No AI service, tariff feed, backend or account system is connected.

## Requirements

- **Node.js 20.19+ or 22.12+** (built and tested with Node 24)
- npm (bundled with Node)

## Setup & commands

```bash
npm install        # install dependencies (uses package-lock.json)
npm run dev        # start the dev server → http://localhost:5173
npm run build      # production build → dist/
npm run preview    # serve the production build locally
```

No API keys, environment variables or external accounts are needed. After `npm install` the app runs fully offline.

## Demo walkthrough (about 7 minutes)

1. **Landing page.** Click **Get a Demo** to open a pre-filled questionnaire for *Maple Trail Home Goods*, a fictional company. Click **Get started for free** to start with a blank one.
2. **Questionnaire** (3 short steps). Show the approximate ranges and the optional fields. Click **Next** through the steps. **Try sample company** and **Reset answers** are in the sidebar.
3. **Company profile.** Walk through the summary cards, the rule-based *Review/Watch* indicators, the missing information, and the midpoint assumptions.
4. **Scenario.** Move the **freight-cost** slider (default +30%) and the **supplier delay** slider (default 45 days). The formula table updates live.
5. **Compare responses.** This is the strongest moment. With the default settings, *expedited shipping* has the lowest estimated cost. Turn on **Add a hypothetical tariff** (10%), and the *alternative supplier* becomes the lowest-cost option. Explain that trade-off: cost, timing and feasibility.
6. **Report.** Show inputs, impacts, assumptions, limitations and next actions. Click **Print / Save as PDF** to export.
7. To run it again, use **Reset scenario** (keeps the answers) or **Reset demo** (clears everything) in the header.

## How the numbers work

All amounts are in CAD over one **12-month scenario period**. The formulas live in `src/utils/calculations.js`.

| Item | Formula |
| --- | --- |
| Baseline landed cost | import spend + freight spend (range midpoints) |
| Additional freight | freight spend × freight increase % |
| Hypothetical tariff | import spend × share from main region × hypothetical rate |
| Uncovered days | max(0, delay days − inventory buffer days); an unknown buffer counts as 0 |
| Delay shortfall | uncovered days × *your* cost per shortfall day. If you enter nothing, the delay is not costed. |
| Alternative supplier | moves X% of main-region volume: price premium + onboarding + adjusted freight. Tariff and delay apply only to the volume that isn't moved. |
| Expedited shipping | (main-region freight ÷ 365) × uncovered days × (cost multiplier − 1); removes the shortfall |

A supplier delay on its own is never treated as lost revenue.

## Folder structure

```text
waymark-demo/
  public/favicon.svg
  src/
    components/
      ui.jsx                 Icons, buttons, badges, logo, headings
      Navbar.jsx, Hero.jsx, Features.jsx, LandingSections.jsx, Footer.jsx
      InfoDialog.jsx         Native <dialog> for nav/footer info popups
      globe/                 Hero globe
        GlobeStage.jsx       Lazy loader, error boundary, static fallback
        TradeGlobe.jsx       d3-geo canvas globe with animated routes
        routes.js            Illustrative trade lanes and hubs (not real data)
      trade-visuals/         SVG storytelling and data visuals
        StorySection.jsx     Scroll-driven homepage story
        StoryVisual.jsx      Ocean / network / uncertainty scenes
        SourcingNetwork.jsx  Profile-step schematic (built from answers only)
        SupplyTimeline.jsx   Scenario-step lead time vs. delay visual
      motion/Motion.jsx      <Reveal> and <AnimatedNumber>
      demo/
        DemoWorkspace.jsx    Demo shell, stepper, shared session state
        Questionnaire.jsx    3-step form + field components
        ProfileStep.jsx, ScenarioStep.jsx, ScenarioControls.jsx
        StrategyStep.jsx, StrategyChart.jsx, ReportStep.jsx
    config/motion.js         Cinematic-effects switch and globe tuning
    hooks/useMotion.js       Reveal, count-up, scroll-step and motion hooks
    data/
      content.js             Landing copy, story scenes, FAQ, personas, dialogs
      demoData.js            Questionnaire options, midpoints, sample company,
                             scenario defaults, fictional strategy assumptions
    utils/
      calculations.js        All demo formulas (deterministic)
      validation.js, classify.js, format.js
    App.jsx, main.jsx, index.css
```

## Visual design & animation

The look is "The Living Global Supply Chain": dark ocean sections for storytelling, bright surfaces for the analytical demo.

**Added packages (all small, no API keys):**

| Package | Why | Licence |
| --- | --- | --- |
| `d3-geo` | Orthographic globe projection for the hero | ISC |
| `topojson-client` | Decodes the land shapes | ISC |
| `world-atlas` | Natural Earth 1:110m land data (public-domain source data) | ISC |
| `@fontsource-variable/manrope`, `@fontsource-variable/inter` | Self-hosted display/body fonts (no Google Fonts request) | SIL OFL 1.1 |

No images, videos or 3D models are used. All illustrations are hand-written SVG, and the globe is drawn on a `<canvas>`. Three.js and GSAP were deliberately not added: native IntersectionObserver plus CSS covers the scroll story at a fraction of the size.

**Performance & reliability**
- The globe is code-split (≈34 KB gzipped) and loads after the page. While it loads, or if it fails, a static CSS globe is shown, and the rest of the site is unaffected.
- The globe's animation pauses when it is off-screen or the tab is hidden. The demo steps have no continuous animation loops.
- Number count-ups last about 0.3 s and are display-only. Screen readers and the page text get the exact calculated value immediately.

**Turning cinematic effects off**
- For one session, add `?lite` to the URL (e.g. `http://localhost:5173/?lite`).
- Permanently, set `CINEMATIC_EFFECTS = false` in `src/config/motion.js`.
- Users with "reduce motion" enabled in their operating system automatically get the static versions.

## Where to edit

- **Copy, FAQ, personas, dialogs, footer:** `src/data/content.js`
- **Sample company, ranges/midpoints, scenario defaults, Supplier B and expedite assumptions:** `src/data/demoData.js`
- **Formulas and indicator thresholds:** `src/utils/calculations.js`
- **Colour palette, fonts and motion utilities:** the `@theme` block and components layer in `src/index.css`
- **Story scenes text:** `STORY_SCENES` in `src/data/content.js`; **globe routes:** `src/components/globe/routes.js`; **globe speed:** `src/config/motion.js`

## Limitations

- All results are preliminary estimates based on questionnaire ranges. They are not validated, company-specific forecasts.
- Tariff rates are hypothetical. Classification hints come from a simple keyword lookup and must be verified with a customs broker or CBSA guidance.
- Supplier B, its prices and lead times, and the expedite multiplier are fictional.
- Accounts, the discovery call, the newsletter, tariff audits, the API and automated monitoring are not implemented. The UI labels them as unavailable or planned.
- Answers are kept in memory only. They are cleared on reset or when the tab is closed, and they are never sent anywhere.
