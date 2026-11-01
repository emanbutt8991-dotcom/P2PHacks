-- Waymark 2.0 schema. Run with `supabase db push` or paste into the SQL editor.
-- Every business table carries company_id and is protected by row-level security.
-- Promoted columns hold what is queried or enforced; `details` holds the rest of
-- each record so the shape can grow without a migration for every optional field.

-- Mirrors shared/entitlements.js. Plans change only through the service role.
create table public.subscription_plans (
  id text primary key,
  name text not null,
  max_suppliers int not null,
  max_shipments int not null,
  max_scenarios int not null,
  max_reports int not null,
  max_seats int not null
);

insert into public.subscription_plans values
  ('free', 'Free', 3, 5, 1, 3, 1),
  ('pro', 'Pro', 25, 100, 500, 200, 5),
  ('enterprise', 'Enterprise', 1000, 10000, 5000, 5000, 250);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  display_name text,
  created_at timestamptz not null default now()
);

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  industry text,
  plan text not null default 'free' references public.subscription_plans (id),
  onboarding_complete boolean not null default false,
  details jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.company_memberships (
  company_id uuid not null references public.companies (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member', 'viewer')),
  created_at timestamptz not null default now(),
  primary key (company_id, user_id)
);
create index company_memberships_user_idx on public.company_memberships (user_id);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  name text not null,
  category text,
  hs_code text,
  details jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table public.warehouses (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  name text not null,
  details jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  name text not null,
  country text,
  annual_spend numeric,
  currency text not null default 'CAD',
  details jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table public.supplier_products (
  supplier_id uuid not null references public.suppliers (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  company_id uuid not null references public.companies (id) on delete cascade,
  primary key (supplier_id, product_id)
);

create table public.shipments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  reference text,
  supplier_id uuid references public.suppliers (id) on delete set null,
  product_id uuid references public.products (id) on delete set null,
  direction text not null default 'import' check (direction in ('import', 'export')),
  mode text not null,
  status text not null default 'booked',
  eta date,
  details jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table public.transport_legs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  shipment_id uuid not null references public.shipments (id) on delete cascade,
  sequence int not null,
  mode text not null,
  distance_km numeric,
  details jsonb not null default '{}'::jsonb
);

create table public.shipment_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  shipment_id uuid references public.shipments (id) on delete cascade,
  occurred_at timestamptz not null default now(),
  event_type text not null,
  details jsonb not null default '{}'::jsonb
);

create table public.risk_scenarios (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  name text not null,
  details jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table public.scenario_results (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  scenario_id uuid not null references public.risk_scenarios (id) on delete cascade,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.supplier_alternatives (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  name text not null,
  kind text not null default 'canadian',
  details jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table public.carbon_estimates (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  cache_key text not null,
  method text not null check (method in ('climatiq', 'waymark-estimate')),
  co2e_kg numeric not null,
  details jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  unique (company_id, cache_key)
);

create table public.compliance_records (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  supplier_id uuid not null references public.suppliers (id) on delete cascade,
  details jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  title text not null,
  report_type text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Membership test used by every policy. SECURITY DEFINER keeps policies on
-- company_memberships from recursing into themselves.
create function public.is_company_member(target uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.company_memberships m
    where m.company_id = target and m.user_id = auth.uid()
  );
$$;

create function public.company_role(target uuid) returns text
language sql stable security definer set search_path = '' as $$
  select m.role from public.company_memberships m
  where m.company_id = target and m.user_id = auth.uid();
$$;

alter table public.subscription_plans enable row level security;
alter table public.profiles enable row level security;
alter table public.companies enable row level security;
alter table public.company_memberships enable row level security;

create policy plans_read on public.subscription_plans for select to authenticated using (true);

create policy profiles_self on public.profiles for all to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

create policy companies_read on public.companies for select to authenticated
  using (public.is_company_member(id) or created_by = auth.uid());
create policy companies_insert on public.companies for insert to authenticated
  with check (created_by = auth.uid() and plan = 'free');
create policy companies_update on public.companies for update to authenticated
  using (public.company_role(id) in ('owner', 'admin'))
  with check (public.company_role(id) in ('owner', 'admin'));
create policy companies_delete on public.companies for delete to authenticated
  using (public.company_role(id) = 'owner');

create policy memberships_read on public.company_memberships for select to authenticated
  using (public.is_company_member(company_id));
create policy memberships_admin on public.company_memberships for update to authenticated
  using (public.company_role(company_id) in ('owner', 'admin'))
  with check (public.company_role(company_id) in ('owner', 'admin'));
create policy memberships_remove on public.company_memberships for delete to authenticated
  using (public.company_role(company_id) in ('owner', 'admin'));

-- The same four policies on each company-scoped table. Viewers can read only.
do $$
declare t text;
begin
  foreach t in array array[
    'products', 'warehouses', 'suppliers', 'supplier_products', 'shipments', 'transport_legs',
    'shipment_events', 'risk_scenarios', 'scenario_results', 'supplier_alternatives',
    'carbon_estimates', 'compliance_records', 'reports'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create index %I on public.%I (company_id)', t || '_company_idx', t);
    execute format($p$create policy %I on public.%I for select to authenticated
      using (public.is_company_member(company_id))$p$, t || '_read', t);
    execute format($p$create policy %I on public.%I for insert to authenticated
      with check (public.company_role(company_id) in ('owner', 'admin', 'member'))$p$, t || '_insert', t);
    execute format($p$create policy %I on public.%I for update to authenticated
      using (public.company_role(company_id) in ('owner', 'admin', 'member'))
      with check (public.company_role(company_id) in ('owner', 'admin', 'member'))$p$, t || '_update', t);
    execute format($p$create policy %I on public.%I for delete to authenticated
      using (public.company_role(company_id) in ('owner', 'admin', 'member'))$p$, t || '_delete', t);
  end loop;
end $$;

-- The creator becomes owner. Runs as definer because members cannot add themselves.
create function public.handle_new_company() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.company_memberships (company_id, user_id, role)
  values (new.id, coalesce(new.created_by, auth.uid()), 'owner');
  return new;
end $$;

create trigger companies_add_owner after insert on public.companies
  for each row execute function public.handle_new_company();

-- Users may edit company details, but the plan changes only with the service role.
create function public.protect_company_plan() returns trigger
language plpgsql as $$
begin
  if new.plan is distinct from old.plan and auth.role() = 'authenticated' then
    raise exception 'plan changes are not permitted from the client' using errcode = '42501';
  end if;
  new.updated_at := now();
  return new;
end $$;

create trigger companies_protect_plan before update on public.companies
  for each row execute function public.protect_company_plan();

-- Plan limits enforced in the database, so a modified client cannot exceed them.
-- Inserts past the limit fail; existing rows survive a downgrade untouched.
create function public.enforce_plan_limit() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  allowed int;
  current_count int;
begin
  select case tg_table_name
      when 'suppliers' then p.max_suppliers
      when 'shipments' then p.max_shipments
      when 'risk_scenarios' then p.max_scenarios
      when 'reports' then p.max_reports
    end
    into allowed
  from public.companies c join public.subscription_plans p on p.id = c.plan
  where c.id = new.company_id;

  execute format('select count(*) from public.%I where company_id = $1', tg_table_name)
    into current_count using new.company_id;

  if current_count >= allowed then
    raise exception 'plan limit reached for %', tg_table_name using errcode = 'P0001', hint = 'plan_limit';
  end if;
  return new;
end $$;

create trigger suppliers_limit before insert on public.suppliers
  for each row execute function public.enforce_plan_limit();
create trigger shipments_limit before insert on public.shipments
  for each row execute function public.enforce_plan_limit();
create trigger scenarios_limit before insert on public.risk_scenarios
  for each row execute function public.enforce_plan_limit();
create trigger reports_limit before insert on public.reports
  for each row execute function public.enforce_plan_limit();

-- Private bucket for due-diligence documents, foldered by company id.
insert into storage.buckets (id, name, public) values ('compliance-documents', 'compliance-documents', false)
  on conflict (id) do nothing;

create policy compliance_docs_read on storage.objects for select to authenticated
  using (bucket_id = 'compliance-documents' and public.is_company_member(((storage.foldername(name))[1])::uuid));
create policy compliance_docs_write on storage.objects for insert to authenticated
  with check (
    bucket_id = 'compliance-documents'
    and public.company_role(((storage.foldername(name))[1])::uuid) in ('owner', 'admin', 'member')
  );
