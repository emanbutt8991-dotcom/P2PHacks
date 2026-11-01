import { useMemo, useState } from 'react'
import { formatCo2e } from '../../../shared/emissions.js'
import { Card, ConfirmModal, DemoTag, Empty, Gate, Notice, PageHeader, downloadFile, formatDate, useToast } from '../../components/app/kit.jsx'
import { Badge, Button, Icon } from '../../components/ui.jsx'
import { REPORT_TYPES, buildReport, reportToCsv } from '../../engine/reports.js'
import { reportToPdf } from '../../services/pdf.js'
import { useWorkspace } from '../../state/WorkspaceContext.jsx'
import { money } from '../../utils/format.js'

const slug = (text) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60)

function ReportView({ report }) {
  return (
    <article className="min-w-0" data-testid="report-view">
      <h2 className="text-xl font-bold text-navy">{report.title}</h2>
      <p className="text-xs text-slate-500">Generated {new Date(report.generatedAt).toLocaleString('en-CA')}</p>
      {report.isDemo && <div className="mt-1"><DemoTag>Demo Data: fictional company</DemoTag></div>}
      {report.sections.map((section) => (
        <section key={section.heading} className="mt-5">
          <h3 className="font-bold text-navy">{section.heading}</h3>
          {section.paragraphs?.map((p) => <p key={p} className="mt-1 text-sm text-slate-700">{p}</p>)}
          {section.bullets && <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-slate-700">{section.bullets.map((b) => <li key={b}>{b}</li>)}</ul>}
          {section.table && (
            <div className="mt-2 overflow-x-auto">
              <table className="w-full min-w-[30rem] text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                    {section.table.head.map((h) => <th key={h} scope="col" className="py-1.5 pr-3 font-semibold">{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {section.table.rows.map((row, i) => (
                    <tr key={i} className="border-b border-slate-100 align-top">
                      {row.map((cell, j) => <td key={j} className="py-1.5 pr-3 text-slate-700">{cell}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ))}
      <section className="mt-5 border-t border-slate-200 pt-3">
        <h3 className="font-bold text-navy">Sources and data timestamps</h3>
        <ul className="mt-1 text-sm text-slate-700">{report.sources.map((s) => <li key={s.label}><strong>{s.label}:</strong> {s.detail}</li>)}</ul>
        <p className="mt-2 text-xs text-slate-500">{report.disclaimer}</p>
      </section>
    </article>
  )
}

export default function Reports() {
  const { model, ws, fx, health, isDemo, can, saveRecord, deleteRecord, counts, limit } = useWorkspace()
  const toast = useToast()
  const [report, setReport] = useState(null)
  const [busy, setBusy] = useState(false)
  const [deleting, setDeleting] = useState(null)
  const [customType, setCustomType] = useState('executive')
  const [customSections, setCustomSections] = useState(null)

  const generate = (typeId, sectionFilter = null) => {
    setReport(buildReport(typeId, { model, ws, fx, scenarios: ws.scenarios ?? [], health: health?.integrations, sectionFilter }))
    window.scrollTo({ top: 0 })
  }

  const allHeadings = useMemo(() => buildReport(customType, { model, ws, fx, scenarios: ws.scenarios ?? [] }).sections.map((s) => s.heading), [customType, model, ws, fx])
  const chosen = customSections ?? allHeadings

  const exportPdf = async () => {
    setBusy(true)
    try {
      const blob = await reportToPdf(report)
      downloadFile(`${slug(report.title)}.pdf`, blob, 'application/pdf')
    } catch (err) {
      toast(`PDF export failed: ${err.message}`, 'error')
    } finally {
      setBusy(false)
    }
  }

  const save = async () => {
    try {
      await saveRecord('reports', { ...report, id: ws.reports?.some((r) => r.id === report.id) ? report.id : crypto.randomUUID() })
      toast('Report saved')
    } catch (err) {
      toast(err.message, 'error')
    }
  }

  return (
    <div>
      <PageHeader title="Reports" badge={isDemo && <DemoTag />}>
        Generated from your current records, with sources and timestamps. {counts.reports} of {limit('reports').toLocaleString('en-CA')} saved.
      </PageHeader>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {REPORT_TYPES.map((t) => {
          const allowed = !t.feature || can(t.feature)
          return (
            <Card key={t.id} className="flex flex-col">
              <h2 className="font-bold text-navy">{t.name}</h2>
              <p className="mt-1 flex-1 text-sm text-slate-600">{t.summary}</p>
              <Button className="mt-3 w-full" variant={allowed ? 'primary' : 'secondary'} disabled={!allowed} onClick={() => generate(t.id)}>
                {allowed ? 'Generate' : <><Icon name="lock" className="h-4 w-4" /> Pro plan</>}
              </Button>
            </Card>
          )
        })}
      </div>

      {report && (
        <Card
          className="mt-4"
          aside={
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={exportPdf} disabled={busy}><Icon name="download" className="h-4 w-4" /> {busy ? 'Preparing…' : 'Export PDF'}</Button>
              <Button size="sm" variant="secondary" onClick={() => downloadFile(`${slug(report.title)}.csv`, reportToCsv(report), 'text/csv;charset=utf-8')}><Icon name="download" className="h-4 w-4" /> Export CSV</Button>
              <Button size="sm" variant="secondary" onClick={save} disabled={counts.reports >= limit('reports')}>Save report</Button>
              <Button size="sm" variant="ghost" onClick={() => setReport(null)}>Close</Button>
            </div>
          }
        >
          <ReportView report={report} />
        </Card>
      )}

      <Card title="Custom report builder" className="mt-4" subtitle="Choose exactly which sections to include">
        <Gate feature="reports.custom">
          <div className="flex flex-wrap gap-1.5">
            {REPORT_TYPES.map((t) => (
              <button key={t.id} type="button" aria-pressed={customType === t.id} onClick={() => { setCustomType(t.id); setCustomSections(null) }} className={`rounded-lg border px-2.5 py-1 text-sm ${customType === t.id ? 'border-brand-700 bg-brand-50 font-semibold text-brand-800' : 'border-slate-200'}`}>{t.name}</button>
            ))}
          </div>
          <div className="mt-2 grid gap-1 sm:grid-cols-2">
            {allHeadings.map((h) => (
              <label key={h} className="inline-flex items-center gap-1.5 text-sm text-slate-700">
                <input type="checkbox" checked={chosen.includes(h)} onChange={() => setCustomSections(chosen.includes(h) ? chosen.filter((x) => x !== h) : [...chosen, h])} />
                {h}
              </label>
            ))}
          </div>
          <Button className="mt-3" size="sm" disabled={!chosen.length} onClick={() => generate(customType, chosen)}>Build custom report</Button>
        </Gate>
      </Card>

      <Card title="Saved reports" className="mt-4">
        {ws.reports?.length ? (
          <ul className="divide-y divide-slate-100">
            {ws.reports.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                <button type="button" className="min-w-0 truncate text-left font-medium text-brand-800 hover:underline" onClick={() => setReport(r)}>{r.title}</button>
                <span className="flex shrink-0 items-center gap-2">
                  <span className="text-xs text-slate-500">{formatDate(r.generatedAt)}</span>
                  <button type="button" aria-label={`Delete ${r.title}`} onClick={() => setDeleting(r)} className="rounded p-1 text-slate-500 hover:text-rose-700"><Icon name="trash" className="h-4 w-4" /></button>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <Empty icon="file" title="No saved reports yet">Generate a report above, then save it to keep a dated copy.</Empty>
        )}
      </Card>

      <Card title="Saved comparisons" className="mt-4" subtitle="Snapshots saved from Canadian and Global Alternatives">
        <Gate feature="alternatives.saved">
          {ws.comparisons?.length ? (
            <ul className="divide-y divide-slate-100">
              {ws.comparisons.map((c) => (
                <li key={c.id} className="py-2 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-navy">{c.name}</span>
                    <span className="flex shrink-0 items-center gap-2">
                      <span className="text-xs text-slate-500">{formatDate(c.savedAt)}</span>
                      <button type="button" aria-label={`Delete ${c.name}`} onClick={() => deleteRecord('comparisons', c.id)} className="rounded p-1 text-slate-500 hover:text-rose-700"><Icon name="trash" className="h-4 w-4" /></button>
                    </span>
                  </div>
                  <ul className="mt-1 text-slate-600">
                    {c.options.map((o) => (
                      <li key={o.name}>{o.name}: {o.landed == null ? 'Request Quote' : money(o.landed)}, {o.leadDays ? `${o.leadDays} days` : 'lead time unknown'}, {o.co2eKg == null ? 'emissions unknown' : formatCo2e(o.co2eKg)}</li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-600">No saved comparisons yet.</p>
          )}
        </Gate>
      </Card>

      {!can('reports.advanced') && <div className="mt-4"><Notice tone="info">Free reports cover supply-chain risk. <Badge tone="slate">Pro</Badge> adds alternatives, sustainability and executive reports.</Notice></div>}

      <ConfirmModal
        open={Boolean(deleting)}
        title="Delete report"
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          await deleteRecord('reports', deleting.id)
          setDeleting(null)
        }}
      >
        Delete this saved report?
      </ConfirmModal>
    </div>
  )
}
