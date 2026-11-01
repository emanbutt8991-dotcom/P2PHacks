/*
  Persistence behind one interface, so screens never know where data lives:
    load() -> workspace   saveCompany(company)
    put(collection, record)   remove(collection, id)   putEmission(key, result)

  Local repositories use localStorage and are for demos and single-browser
  workspaces. No passwords are ever stored there. The Supabase repository stores
  each record in its table, protected by row-level security.
*/

const EMPTY = { warehouses: [], products: [], suppliers: [], shipments: [], events: [], alternatives: [], scenarios: [], reports: [], comparisons: [], emissions: {} }

function readJson(key) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

/** Browser storage for one workspace. `seed` builds the initial state if none is stored. */
export function createLocalRepository(storageKey, seed) {
  let state = readJson(storageKey) ?? seed()
  const persist = () => writeJson(storageKey, state)

  return {
    kind: 'local',
    async load() {
      persist()
      return { ...EMPTY, ...state }
    },
    async saveCompany(company) {
      state = { ...state, company }
      persist()
      return company
    },
    async put(collection, record) {
      const list = state[collection] ?? []
      const exists = list.some((r) => r.id === record.id)
      state = { ...state, [collection]: exists ? list.map((r) => (r.id === record.id ? record : r)) : [...list, record] }
      persist()
      return record
    },
    async remove(collection, id) {
      state = { ...state, [collection]: (state[collection] ?? []).filter((r) => r.id !== id) }
      persist()
    },
    async putEmission(key, result) {
      state = { ...state, emissions: { ...(state.emissions ?? {}), [key]: result } }
      persist()
    },
    async reset() {
      state = seed()
      persist()
      return { ...EMPTY, ...state }
    },
  }
}

// Which fields become real columns. Everything else is kept in `details`.
const TABLES = {
  warehouses: { table: 'warehouses', columns: { name: 'name' } },
  products: { table: 'products', columns: { name: 'name', category: 'category', hsCode: 'hs_code' } },
  suppliers: { table: 'suppliers', columns: { name: 'name', country: 'country', annualSpend: 'annual_spend', currency: 'currency' } },
  shipments: {
    table: 'shipments',
    columns: { reference: 'reference', supplierId: 'supplier_id', productId: 'product_id', direction: 'direction', mode: 'mode', status: 'status', eta: 'eta' },
  },
  events: { table: 'shipment_events', columns: { shipmentId: 'shipment_id', at: 'occurred_at', type: 'event_type' } },
  alternatives: { table: 'supplier_alternatives', columns: { name: 'name', kind: 'kind' }, keep: (row) => row.kind !== 'comparison' },
  comparisons: { table: 'supplier_alternatives', columns: { name: 'name', kind: 'kind' }, keep: (row) => row.kind === 'comparison' },
  scenarios: { table: 'risk_scenarios', columns: { name: 'name' } },
  reports: { table: 'reports', columns: { title: 'title', typeId: 'report_type' } },
}

export function toRow(collection, record, companyId) {
  const { columns } = TABLES[collection]
  const row = { id: record.id, company_id: companyId }
  const details = {}
  for (const [key, value] of Object.entries(record)) {
    if (key === 'id') continue
    if (columns[key]) row[columns[key]] = value === '' ? null : value
    else details[key] = value
  }
  row.details = details
  return row
}

export function fromRow(collection, row) {
  const { columns } = TABLES[collection]
  const record = { ...(row.details ?? {}), id: row.id }
  for (const [key, column] of Object.entries(columns)) record[key] = row[column] ?? (record[key] ?? null)
  return record
}

const companyToRow = ({ id, name, industry, plan, onboardingComplete, ...details }) => ({
  id, name, industry, onboarding_complete: Boolean(onboardingComplete), details,
})

const companyFromRow = (row) => ({
  ...(row.details ?? {}), id: row.id, name: row.name, industry: row.industry, plan: row.plan, onboardingComplete: row.onboarding_complete,
})

export function createSupabaseRepository(client, companyId) {
  const must = ({ data, error }) => {
    if (error) {
      const planLimit = error.hint === 'plan_limit'
      throw Object.assign(new Error(planLimit ? 'Your plan limit has been reached.' : error.message), { planLimit })
    }
    return data
  }

  return {
    kind: 'supabase',
    async load() {
      const company = must(await client.from('companies').select('*').eq('id', companyId).single())
      const workspace = { ...EMPTY, company: companyFromRow(company) }
      await Promise.all(
        Object.entries(TABLES).map(async ([collection, { table, keep }]) => {
          const rows = must(await client.from(table).select('*').eq('company_id', companyId))
          workspace[collection] = rows.filter(keep ?? (() => true)).map((row) => fromRow(collection, row))
        }),
      )
      const estimates = must(await client.from('carbon_estimates').select('*').eq('company_id', companyId))
      workspace.emissions = Object.fromEntries(estimates.map((e) => [e.cache_key, e.details]))
      return workspace
    },
    async saveCompany(company) {
      must(await client.from('companies').update(companyToRow(company)).eq('id', companyId))
      return company
    },
    async put(collection, record) {
      const { table } = TABLES[collection]
      must(await client.from(table).upsert(toRow(collection, record, companyId)))
      if (collection === 'suppliers') await syncSupplierProducts(client, must, companyId, record)
      return record
    },
    async remove(collection, id) {
      must(await client.from(TABLES[collection].table).delete().eq('id', id).eq('company_id', companyId))
    },
    async putEmission(key, result) {
      must(
        await client.from('carbon_estimates').upsert(
          { company_id: companyId, cache_key: key, method: result.method, co2e_kg: result.co2eKg, details: result },
          { onConflict: 'company_id,cache_key' },
        ),
      )
    },
    async reset() {
      return this.load()
    },
  }
}

async function syncSupplierProducts(client, must, companyId, supplier) {
  must(await client.from('supplier_products').delete().eq('supplier_id', supplier.id))
  const rows = (supplier.productIds ?? []).map((productId) => ({ supplier_id: supplier.id, product_id: productId, company_id: companyId }))
  if (rows.length) must(await client.from('supplier_products').insert(rows))
}
