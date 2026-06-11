-- =====================================================================
-- BLOOMIO — Schema Supabase (multi-estabelecimento + RLS)
-- Rode no Supabase: SQL Editor -> New query -> cole tudo -> Run.
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------- ESTABELECIMENTOS (tenants) ----------
create table if not exists public.tenants (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  cnpj        text,
  logo        text,
  plan        text default 'Trial',          -- Starter / Profissional / Premium / Trial
  price       numeric default 0,
  status      text default 'Trial',          -- Trial / Ativo / Cancelada / Expirado
  expires     date,
  auto_renew  boolean default false,
  whatsapp_active boolean default false,     -- add-on pago
  settings    jsonb default '{}'::jsonb,      -- guarda config do app (portal, integrações, etc.)
  stripe_customer_id      text,
  stripe_subscription_id  text,
  created_at  timestamptz default now()
);

-- ---------- PERFIS (liga auth.users -> tenant) ----------
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  tenant_id  uuid references public.tenants(id) on delete cascade,
  name       text,
  email      text,
  role       text default 'owner',           -- owner / admin / staff
  created_at timestamptz default now()
);

-- Função auxiliar: tenant do usuário logado
create or replace function public.app_tenant()
returns uuid language sql stable security definer set search_path = public as $$
  select tenant_id from public.profiles where id = auth.uid()
$$;

-- ---------- TABELAS DO NEGÓCIO ----------
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null, phone text, email text, cpf text,
  birthday date, notes text, tags text[],
  created_at timestamptz default now()
);

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null, category text, price numeric default 0,
  duration int default 30, active boolean default true,
  created_at timestamptz default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null, qty int default 0, min_qty int default 0,
  cost numeric default 0, price numeric default 0,
  created_at timestamptz default now()
);

create table if not exists public.professionals (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null, role text, phone text, email text,
  commission_value int default 0, schedule jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  professional_id uuid references public.professionals(id) on delete set null,
  service_id uuid references public.services(id) on delete set null,
  date date, "time" text, status text default 'agendado',
  details jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  professional_id uuid references public.professionals(id) on delete set null,
  items jsonb default '[]'::jsonb, subtotal numeric default 0,
  discount numeric default 0, total numeric default 0,
  payment text, date date default current_date,
  created_at timestamptz default now()
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  type text not null,                          -- receita / despesa
  description text, category text, method text,
  amount numeric default 0, paid boolean default true,
  date date default current_date, client text,
  created_at timestamptz default now()
);

create table if not exists public.commissions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  professional_id uuid references public.professionals(id) on delete set null,
  gross numeric default 0, rate numeric default 0, amount numeric default 0,
  status text default 'pendente', date date default current_date,
  created_at timestamptz default now()
);

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text, phone text, stage text, source text, notes text,
  created_at timestamptz default now()
);

create table if not exists public.anamneses (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  title text, fields jsonb default '[]'::jsonb, active boolean default true,
  created_at timestamptz default now()
);

create table if not exists public.contratos (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  title text, body text, client_name text, status text default 'rascunho',
  signature jsonb, created_at timestamptz default now()
);

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  num text, plan text, amount numeric default 0,
  status text default 'Pago', provider text default 'stripe',
  date date default current_date, created_at timestamptz default now()
);

create table if not exists public.waitlist (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text, phone text, note text, created_at timestamptz default now()
);

create table if not exists public.prontuario_notes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  client_id uuid references public.clients(id) on delete cascade,
  body text, created_at timestamptz default now()
);

-- ---------- RLS (isolamento por estabelecimento) ----------
alter table public.tenants  enable row level security;
alter table public.profiles enable row level security;

drop policy if exists tenant_self on public.tenants;
create policy tenant_self on public.tenants
  for all using (id = public.app_tenant()) with check (id = public.app_tenant());

drop policy if exists profile_self on public.profiles;
create policy profile_self on public.profiles
  for select using (id = auth.uid() or tenant_id = public.app_tenant());
drop policy if exists profile_upd on public.profiles;
create policy profile_upd on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- Aplica a mesma política (tenant_id = app_tenant) em todas as tabelas do negócio
do $$
declare t text;
begin
  foreach t in array array[
    'clients','services','products','professionals','appointments','sales',
    'transactions','commissions','leads','anamneses','contratos','invoices',
    'waitlist','prontuario_notes'
  ] loop
    execute format('alter table public.%I enable row level security;', t);
    execute format('drop policy if exists tenant_all on public.%I;', t);
    execute format($f$create policy tenant_all on public.%I for all
      using (tenant_id = public.app_tenant())
      with check (tenant_id = public.app_tenant());$f$, t);
  end loop;
end $$;

-- ---------- Criação automática de tenant + profile no signup ----------
-- Ao criar a conta, cria o estabelecimento (Trial 15 dias) e o perfil dono.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare new_tenant uuid;
begin
  insert into public.tenants (name, status, plan, expires, auto_renew)
  values (coalesce(new.raw_user_meta_data->>'business', 'Meu Estabelecimento'),
          'Trial', 'Trial', current_date + 15, false)
  returning id into new_tenant;

  insert into public.profiles (id, tenant_id, name, email, role)
  values (new.id, new_tenant,
          coalesce(new.raw_user_meta_data->>'name', new.email),
          new.email, 'owner');
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Storage (logos / ícones / selfies de assinatura) ----------
insert into storage.buckets (id, name, public)
values ('bloomio-public', 'bloomio-public', true)
on conflict (id) do nothing;
