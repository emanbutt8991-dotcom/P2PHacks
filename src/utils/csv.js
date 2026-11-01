// Minimal RFC 4180 CSV parsing for optional supplier imports.
import { COUNTRIES } from '../../shared/countries.js'
import { MODES } from '../engine/model.js'

export function parseCsv(text) {
  const rows = []
  let row = []
  let cell = ''
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"'
        i += 1
      } else if (ch === '"') quoted = false
      else cell += ch
    } else if (ch === '"') quoted = true
    else if (ch === ',') {
      row.push(cell)
      cell = ''
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i += 1
      row.push(cell)
      if (row.some((c) => c.trim())) rows.push(row)
      row = []
      cell = ''
    } else cell += ch
  }
  row.push(cell)
  if (row.some((c) => c.trim())) rows.push(row)
  return rows
}

const HEADERS = {
  name: ['name', 'supplier', 'supplier name'],
  country: ['country', 'country code'],
  city: ['city', 'region', 'city/region'],
  address: ['address'],
  annualSpend: ['annual spend', 'annual spending', 'spend'],
  currency: ['currency'],
  purchaseCost: ['unit price', 'purchase cost', 'unit cost'],
  quantity: ['quantity'],
  sharePct: ['share', 'share %', 'percentage of sourcing'],
  leadTimeDays: ['lead time', 'lead time days'],
  mode: ['mode', 'shipping mode'],
}

const countryCode = (value) => {
  const v = value.trim().toLowerCase()
  return COUNTRIES.find((c) => c.code.toLowerCase() === v || c.name.toLowerCase() === v)?.code ?? ''
}

const modeValue = (value) => {
  const v = value.trim().toLowerCase()
  return MODES.find((m) => m.value === v || m.label.toLowerCase() === v)?.value ?? ''
}

/** Convert CSV text into supplier drafts. Unknown values stay blank, with a warning. */
export function suppliersFromCsv(text) {
  const [header, ...rows] = parseCsv(text)
  if (!header) return { suppliers: [], warnings: ['The file is empty.'] }
  const index = {}
  header.forEach((h, i) => {
    const key = Object.keys(HEADERS).find((k) => HEADERS[k].includes(h.trim().toLowerCase()))
    if (key) index[key] = i
  })
  if (index.name === undefined) return { suppliers: [], warnings: ['No supplier name column found. Use a header such as "name".'] }

  const warnings = []
  const suppliers = rows.map((row, r) => {
    const read = (key) => (index[key] === undefined ? '' : (row[index[key]] ?? '').trim())
    const country = countryCode(read('country'))
    if (read('country') && !country) warnings.push(`Row ${r + 2}: country "${read('country')}" not recognised.`)
    return {
      name: read('name'), country, city: read('city'), address: read('address'), annualSpend: read('annualSpend'),
      currency: read('currency').toUpperCase() || 'CAD', purchaseCost: read('purchaseCost'), quantity: read('quantity'),
      sharePct: read('sharePct'), leadTimeDays: read('leadTimeDays'), mode: modeValue(read('mode')) || 'sea',
    }
  })
  return { suppliers: suppliers.filter((s) => s.name), warnings }
}
