import {
  BUFFERS,
  CONCENTRATION,
  FREIGHT_SPEND,
  IMPORT_SPEND,
  LEAD_TIMES,
  PRODUCT_CATEGORIES,
  REGIONS,
  REGION_SHARES,
  SAMPLE_COMPANY,
  labelOf,
} from '../../data/demoData.js'
import { suggestChapter } from '../../utils/classify.js'
import SourcingNetwork from '../trade-visuals/SourcingNetwork.jsx'
import { Badge, Button, Icon, LevelChip } from '../ui.jsx'
import { Panel, StepHeading, StepNav } from './DemoWorkspace.jsx'

export default function ProfileStep({ answers, model, isSample, headingRef, onBack, onNext, onEdit }) {
  const { profile, resolved } = model
  const classification = suggestChapter(answers.productDescription, answers.hsCode)

  return (
    <div>
      <StepHeading
        headingRef={headingRef}
        kicker="Step 2 · Preliminary company profile"
        title={isSample ? `${SAMPLE_COMPANY.name} (fictional)` : 'Your preliminary profile'}
      >
        A readable summary of your answers, with simple rule-based indicators. These are preliminary prompts for
        discussion — not a validated risk score.
      </StepHeading>

      <div className="grid gap-4 md:grid-cols-3">
        <SummaryCard
          icon="tag"
          title="Products"
          rows={[
            ['Category', labelOf(PRODUCT_CATEGORIES, answers.productCategory)],
            ['Description', answers.productDescription || 'Not provided'],
            ['HS code', answers.hsCode || 'Not provided'],
          ]}
        />
        <SummaryCard
          icon="globe"
          title="Sourcing"
          rows={[
            ['Main region', labelOf(REGIONS, answers.sourcingRegion)],
            ['Share from region', labelOf(REGION_SHARES, answers.regionShare)],
            ['Suppliers', labelOf(CONCENTRATION, answers.supplierConcentration)],
            ['Lead time', labelOf(LEAD_TIMES, answers.leadTime)],
            ['Inventory buffer', labelOf(BUFFERS, answers.inventoryBuffer, 'Not provided')],
          ]}
        />
        <SummaryCard
          icon="ship"
          title="Spending (annual, CAD)"
          rows={[
            ['Imports (goods)', labelOf(IMPORT_SPEND, answers.importSpend)],
            ['Freight', labelOf(FREIGHT_SPEND, answers.freightSpend)],
            ['Freight vs imports', `≈ ${Math.round(profile.freightRatio * 100)}% (from midpoints)`],
          ]}
        />
      </div>

      <Panel title="Sourcing network" aside={<Badge tone="slate">Schematic</Badge>} className="mt-4">
        <SourcingNetwork answers={answers} leadTimeDays={resolved.leadTimeDays} />
      </Panel>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Panel title="Preliminary indicators" aside={<Badge tone="slate">Rule-based</Badge>}>
          {profile.indicators.length === 0 ? (
            <p className="text-slate-600">No indicators triggered by these answers. That doesn't mean there's no risk.</p>
          ) : (
            <ul className="space-y-3">
              {profile.indicators.map((i, idx) => (
                <li
                  key={i.title}
                  style={{ animationDelay: `${idx * 70}ms` }}
                  className={`flex animate-fade-up items-start justify-between gap-3 rounded-xl border border-l-4 p-3.5 ${
                    i.level === 'review' ? 'border-rose-100 border-l-rose-400 bg-rose-50/40' : 'border-amber-100 border-l-sun bg-amber-50/30'
                  }`}
                >
                  <div>
                    <p className="font-semibold text-navy">{i.title}</p>
                    <p className="mt-0.5 text-sm text-slate-600">{i.detail}</p>
                  </div>
                  <LevelChip level={i.level} />
                </li>
              ))}
            </ul>
          )}
          <p className="mt-4 text-xs text-slate-500">
            “Review” and “Watch” come from simple thresholds on your answers (see src/utils/calculations.js). No
            disruption probabilities are estimated.
          </p>
        </Panel>

        <div className="space-y-4">
          <Panel title="Classification starting point" aside={<Badge tone="amber">Illustrative</Badge>}>
            {classification.hint ? (
              <p className="text-sm text-slate-700">
                From your description: <strong>HS Chapter {classification.hint.chapter}</strong> —{' '}
                {classification.hint.label}.
                {classification.userCode &&
                  (classification.matches
                    ? ' Your code’s chapter matches.'
                    : ' Your code’s chapter differs — worth reviewing.')}
              </p>
            ) : (
              <p className="text-sm text-slate-700">No illustrative hint for this description.</p>
            )}
            <p className="mt-2 text-xs text-slate-500">Requires verification with a licensed customs broker or CBSA guidance.</p>
          </Panel>

          <Panel title="Missing information">
            <ul className="space-y-2 text-sm text-slate-600">
              {profile.missing.map((m) => (
                <li key={m} className="flex gap-2">
                  <Icon name="info" className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                  {m}
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>

      <Panel title="Assumptions used in calculations" className="mt-4">
        <ul className="grid gap-x-6 gap-y-1.5 text-sm text-slate-600 md:grid-cols-2">
          {resolved.midpointNotes.map((n) => (
            <li key={n} className="flex gap-2">
              <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-slate-400" aria-hidden="true" />
              {n}
            </li>
          ))}
        </ul>
      </Panel>

      <StepNav
        onBack={onBack}
        onNext={onNext}
        nextLabel="Run a disruption scenario"
        extra={
          <Button variant="ghost" onClick={onEdit}>
            Edit answers
          </Button>
        }
      />
    </div>
  )
}

function SummaryCard({ icon, title, rows }) {
  return (
    <section className="rounded-3xl border border-mist bg-white p-5 shadow-[0_10px_30px_-14px_rgba(16,42,67,.14)]">
      <h2 className="flex items-center gap-2 font-bold text-navy">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-teal/15 to-ocean/15 text-ocean">
          <Icon name={icon} className="h-4 w-4" />
        </span>
        {title}
      </h2>
      <dl className="mt-4 space-y-2 text-sm">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-3">
            <dt className="shrink-0 text-slate-500">{k}</dt>
            <dd className={`text-right font-medium ${v === 'Not provided' ? 'text-slate-400 italic' : 'text-slate-800'}`}>{v}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
