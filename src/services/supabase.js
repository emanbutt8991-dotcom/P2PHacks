/*
  Supabase is optional. Without VITE_SUPABASE_* the client is null and the app
  runs in clearly labelled local mode. Nothing here claims real accounts exist
  unless a project is actually configured.
*/
import { createClient } from '@supabase/supabase-js'

const url = import.meta.env?.VITE_SUPABASE_URL
const anonKey = import.meta.env?.VITE_SUPABASE_ANON_KEY

export const supabase = url && anonKey ? createClient(url, anonKey) : null
export const authConfigured = Boolean(supabase)

export async function currentCompanyId() {
  if (!supabase) return null
  const { data, error } = await supabase.from('company_memberships').select('company_id').limit(1).maybeSingle()
  if (error) throw error
  return data?.company_id ?? null
}

export async function createCompanyRecord(name) {
  const { data, error } = await supabase.from('companies').insert({ name }).select('id').single()
  if (error) throw error
  return data.id
}
