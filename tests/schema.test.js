/*
  Runs the real migration in an embedded Postgres (PGlite) and checks tenant
  isolation and plan limits as the `authenticated` role. Supabase's auth and
  storage schemas are stubbed with the minimum the migration needs.
*/
import { readFileSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'
import { beforeAll, describe, expect, it } from 'vitest'

const ALICE = '00000000-0000-4000-8000-00000000000a'
const BOB = '00000000-0000-4000-8000-00000000000b'
const migration = readFileSync('supabase/migrations/0001_waymark_schema.sql', 'utf8')

const STUBS = `
  create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
  create schema auth; create schema storage;
  create table auth.users (id uuid primary key, email text);
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
  create function auth.role() returns text language sql stable as $$ select coalesce(nullif(current_setting('test.role', true), ''), 'authenticated') $$;
  create table storage.buckets (id text primary key, name text, public boolean);
  create table storage.objects (id uuid default gen_random_uuid(), bucket_id text, name text);
  alter table storage.objects enable row level security;
  create function storage.foldername(name text) returns text[] language sql immutable as $$ select string_to_array(name, '/') $$;
  grant usage on schema public, auth, storage to authenticated;
  grant execute on all functions in schema auth to authenticated;
`

const GRANTS = `
  grant all on all tables in schema public to authenticated;
  grant all on all sequences in schema public to authenticated;
`

let db

async function as(uid, fn) {
  await db.exec(`set test.uid = '${uid}'; set test.role = 'authenticated'; set role authenticated;`)
  try {
    return await fn()
  } finally {
    await db.exec(`reset role; set test.uid = '';`)
  }
}

const expectDenied = async (promise) => {
  await expect(promise).rejects.toThrow()
}

beforeAll(async () => {
  db = new PGlite()
  await db.exec(STUBS)
  await db.exec(migration)
  await db.exec(GRANTS)
  await db.query(`insert into auth.users values ($1, 'a@example.com'), ($2, 'b@example.com')`, [ALICE, BOB])
})

async function createCompany(uid, name) {
  return as(uid, async () => {
    const { rows } = await db.query(`insert into public.companies (name) values ($1) returning id`, [name])
    return rows[0].id
  })
}

describe('migration', () => {
  it('creates every required entity', async () => {
    const { rows } = await db.query(`select table_name from information_schema.tables where table_schema = 'public'`)
    const names = rows.map((r) => r.table_name)
    for (const t of ['profiles', 'companies', 'company_memberships', 'products', 'suppliers', 'supplier_products', 'warehouses', 'shipments', 'shipment_events', 'transport_legs', 'risk_scenarios', 'scenario_results', 'supplier_alternatives', 'carbon_estimates', 'compliance_records', 'reports', 'subscription_plans']) {
      expect(names).toContain(t)
    }
  })
  it('enables row-level security on every table', async () => {
    const { rows } = await db.query(`select relname from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity`)
    expect(rows).toEqual([])
  })
})

describe('tenant isolation', () => {
  let aliceCo
  let bobCo

  beforeAll(async () => {
    aliceCo = await createCompany(ALICE, 'Alice Co')
    bobCo = await createCompany(BOB, 'Bob Co')
    await as(BOB, () => db.query(`insert into public.suppliers (company_id, name) values ($1, 'Bob secret supplier')`, [bobCo]))
  })

  it('makes the creator an owner automatically', async () => {
    const { rows } = await as(ALICE, () => db.query(`select role from public.company_memberships where company_id = $1`, [aliceCo]))
    expect(rows).toEqual([{ role: 'owner' }])
  })
  it('hides other companies', async () => {
    const { rows } = await as(ALICE, () => db.query(`select name from public.companies`))
    expect(rows.map((r) => r.name)).toEqual(['Alice Co'])
  })
  it('hides other companies’ suppliers', async () => {
    const { rows } = await as(ALICE, () => db.query(`select * from public.suppliers`))
    expect(rows).toEqual([])
  })
  it('blocks writing into another company', async () => {
    await expectDenied(as(ALICE, () => db.query(`insert into public.suppliers (company_id, name) values ($1, 'planted')`, [bobCo])))
  })
  it('blocks changing or deleting another company’s rows', async () => {
    const updated = await as(ALICE, () => db.query(`update public.suppliers set name = 'hacked' where company_id = $1`, [bobCo]))
    const deleted = await as(ALICE, () => db.query(`delete from public.suppliers where company_id = $1`, [bobCo]))
    expect(updated.affectedRows).toBe(0)
    expect(deleted.affectedRows).toBe(0)
  })
  it('blocks granting yourself membership', async () => {
    await expectDenied(as(ALICE, () => db.query(`insert into public.company_memberships (company_id, user_id, role) values ($1, $2, 'owner')`, [bobCo, ALICE])))
  })
  it('stops read-only viewers writing', async () => {
    await db.query(`insert into public.company_memberships (company_id, user_id, role) values ($1, $2, 'viewer')`, [aliceCo, BOB])
    await expectDenied(as(BOB, () => db.query(`insert into public.products (company_id, name) values ($1, 'x')`, [aliceCo])))
    const { rows } = await as(BOB, () => db.query(`select id from public.companies where id = $1`, [aliceCo]))
    expect(rows.length).toBe(1)
    await db.query(`delete from public.company_memberships where company_id = $1 and user_id = $2`, [aliceCo, BOB])
  })
})

describe('plan rules in the database', () => {
  let company

  beforeAll(async () => {
    company = await createCompany(ALICE, 'Limit Co')
  })

  it('stops a Free company at three suppliers', async () => {
    for (const name of ['one', 'two', 'three']) {
      await as(ALICE, () => db.query(`insert into public.suppliers (company_id, name) values ($1, $2)`, [company, name]))
    }
    await expect(as(ALICE, () => db.query(`insert into public.suppliers (company_id, name) values ($1, 'four')`, [company]))).rejects.toThrow(/plan limit/)
  })
  it('does not let a user upgrade themselves', async () => {
    await expect(as(ALICE, () => db.query(`update public.companies set plan = 'enterprise' where id = $1`, [company]))).rejects.toThrow(/not permitted/)
  })
  it('does not let a new company start on a paid plan', async () => {
    await expectDenied(as(ALICE, () => db.query(`insert into public.companies (name, plan) values ('x', 'pro')`)))
  })
  it('keeps existing data after a downgrade and only blocks new rows', async () => {
    await db.exec(`set test.role = 'service_role'`)
    await db.query(`update public.companies set plan = 'pro' where id = $1`, [company])
    await db.exec(`set test.role = ''`)
    await as(ALICE, () => db.query(`insert into public.suppliers (company_id, name) values ($1, 'four')`, [company]))
    await db.exec(`set test.role = 'service_role'`)
    await db.query(`update public.companies set plan = 'free' where id = $1`, [company])
    await db.exec(`set test.role = ''`)
    const { rows } = await as(ALICE, () => db.query(`select count(*)::int as n from public.suppliers where company_id = $1`, [company]))
    expect(rows[0].n).toBe(4)
    await expect(as(ALICE, () => db.query(`insert into public.suppliers (company_id, name) values ($1, 'five')`, [company]))).rejects.toThrow(/plan limit/)
  })
})
