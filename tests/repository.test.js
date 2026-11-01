// Covers the persistence layer, including the Supabase mapping against an in-memory fake.
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createLocalRepository, createSupabaseRepository, fromRow, toRow } from '../src/services/repository.js'
import { parseCsv, suppliersFromCsv } from '../src/utils/csv.js'

const store = new Map()
vi.stubGlobal('localStorage', {
  getItem: (k) => store.get(k) ?? null,
  setItem: (k, v) => store.set(k, v),
  removeItem: (k) => store.delete(k),
})

/** A small stand-in for the supabase-js query builder, keyed by table. */
function fakeClient(tables) {
  const from = (table) => {
    const filters = []
    const run = () => (tables[table] ?? []).filter((row) => filters.every(([k, v]) => row[k] === v))
    const builder = {
      select: () => builder,
      eq: (k, v) => (filters.push([k, v]), builder),
      single: async () => ({ data: run()[0], error: null }),
      upsert: async (row) => {
        tables[table] = [...(tables[table] ?? []).filter((r) => r.id !== row.id), row]
        return { data: null, error: null }
      },
      insert: async (rows) => {
        tables[table] = [...(tables[table] ?? []), ...rows]
        return { data: null, error: null }
      },
      update: (patch) => ({ eq: async (k, v) => {
        tables[table] = tables[table].map((r) => (r[k] === v ? { ...r, ...patch } : r))
        return { data: null, error: null }
      } }),
      delete: () => {
        const del = {
          eq: (k, v) => (filters.push([k, v]), del),
          then: (resolve) => {
            tables[table] = (tables[table] ?? []).filter((row) => !filters.every(([k, v]) => row[k] === v))
            resolve({ data: null, error: null })
          },
        }
        return del
      },
      then: (resolve) => resolve({ data: run(), error: null }),
    }
    return builder
  }
  return { from }
}

describe('local repository', () => {
  beforeEach(() => store.clear())

  const seed = () => ({ company: { id: 'c', name: 'Co' }, suppliers: [] })

  it('persists across instances, separated by key', async () => {
    const a = createLocalRepository('k1', seed)
    await a.load()
    await a.put('suppliers', { id: 's1', name: 'One' })
    expect((await createLocalRepository('k1', seed).load()).suppliers).toHaveLength(1)
    expect((await createLocalRepository('k2', seed).load()).suppliers).toHaveLength(0)
  })
  it('updates in place and removes', async () => {
    const r = createLocalRepository('k1', seed)
    await r.put('suppliers', { id: 's1', name: 'One' })
    await r.put('suppliers', { id: 's1', name: 'Renamed' })
    expect((await r.load()).suppliers).toEqual([{ id: 's1', name: 'Renamed' }])
    await r.remove('suppliers', 's1')
    expect((await r.load()).suppliers).toEqual([])
  })
  it('resets a demo to its seed', async () => {
    const r = createLocalRepository('k1', seed)
    await r.put('suppliers', { id: 's1', name: 'One' })
    expect((await r.reset()).suppliers).toEqual([])
  })
  it('never stores a password field', async () => {
    const r = createLocalRepository('k1', seed)
    await r.load()
    expect([...store.values()].join()).not.toMatch(/password/i)
  })
})

describe('Supabase mapping', () => {
  it('splits promoted columns from details, and round-trips', () => {
    const supplier = { id: 'a', name: 'Mill', country: 'BD', annualSpend: 10, currency: 'USD', city: 'Gazipur', compliance: { audit: { status: 'verified' } } }
    const row = toRow('suppliers', supplier, 'co')
    expect(row).toMatchObject({ id: 'a', company_id: 'co', name: 'Mill', country: 'BD', annual_spend: 10 })
    expect(row.details.city).toBe('Gazipur')
    expect(row.details.name).toBeUndefined()
    expect(fromRow('suppliers', row)).toEqual(supplier)
  })
  it('sends blanks as null so foreign keys and dates stay valid', () => {
    const row = toRow('shipments', { id: 'a', reference: 'R', supplierId: '', eta: '' }, 'co')
    expect(row.supplier_id).toBeNull()
    expect(row.eta).toBeNull()
  })
  it('loads, stores and scopes records through the client', async () => {
    const tables = { companies: [{ id: 'co', name: 'Co', plan: 'pro', onboarding_complete: true, details: { hq: { city: 'Toronto' } } }] }
    const repo = createSupabaseRepository(fakeClient(tables), 'co')
    await repo.put('suppliers', { id: 's1', name: 'Mill', country: 'VN', currency: 'CAD', productIds: ['p1'] })
    expect(tables.supplier_products).toEqual([{ supplier_id: 's1', product_id: 'p1', company_id: 'co' }])
    await repo.put('comparisons', { id: 'x1', kind: 'comparison', name: 'Saved', options: [] })
    await repo.put('alternatives', { id: 'x2', kind: 'canadian', name: 'Lead' })
    const ws = await repo.load()
    expect(ws.company).toMatchObject({ name: 'Co', plan: 'pro', onboardingComplete: true, hq: { city: 'Toronto' } })
    expect(ws.suppliers[0].name).toBe('Mill')
    expect(ws.comparisons.map((c) => c.id)).toEqual(['x1'])
    expect(ws.alternatives.map((a) => a.id)).toEqual(['x2'])
  })
  it('does not let a client write its plan', async () => {
    const tables = { companies: [{ id: 'co', name: 'Co', plan: 'free', details: {} }] }
    const repo = createSupabaseRepository(fakeClient(tables), 'co')
    await repo.saveCompany({ id: 'co', name: 'Renamed', plan: 'enterprise', onboardingComplete: true })
    expect(tables.companies[0]).toMatchObject({ name: 'Renamed', plan: 'free' })
  })
  it('turns the database limit error into a readable plan message', async () => {
    const client = { from: () => ({ upsert: async () => ({ error: { message: 'plan limit reached', hint: 'plan_limit' } }) }) }
    await expect(createSupabaseRepository(client, 'co').put('reports', { id: 'r', title: 't', typeId: 'risk' })).rejects.toMatchObject({ planLimit: true })
  })
})

describe('CSV import', () => {
  it('handles quotes, commas and CRLF', () => {
    expect(parseCsv('a,"b, c"\r\n"d ""e""",f\n')).toEqual([['a', 'b, c'], ['d "e"', 'f']])
  })
  it('maps headers and country names', () => {
    const { suppliers, warnings } = suppliersFromCsv('Supplier Name,Country,City,Annual Spend,Currency,Mode\nMill One,Bangladesh,Gazipur,1000.50,usd,Ocean')
    expect(suppliers[0]).toMatchObject({ name: 'Mill One', country: 'BD', city: 'Gazipur', annualSpend: '1000.50', currency: 'USD', mode: 'sea' })
    expect(warnings).toEqual([])
  })
  it('warns rather than guessing an unknown country', () => {
    const { suppliers, warnings } = suppliersFromCsv('name,country\nMill,Atlantis')
    expect(suppliers[0].country).toBe('')
    expect(warnings[0]).toContain('Atlantis')
  })
  it('rejects a file with no name column', () => {
    expect(suppliersFromCsv('foo,bar\n1,2').suppliers).toEqual([])
  })
})
