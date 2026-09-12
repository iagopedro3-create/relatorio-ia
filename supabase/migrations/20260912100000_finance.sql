-- =============================================================================
-- Financeiro da escola: mensalidades e cobrança via Asaas.
--
-- A cobrança sai da conta Asaas DA ESCOLA (chave por escola, guardada em
-- `school_secrets`, que o front nunca lê). A plataforma só orquestra: gera a
-- cobrança, guarda o link e recebe o webhook. Dinheiro não passa por nós.
-- =============================================================================

create type public.invoice_status as enum ('draft', 'pending', 'paid', 'overdue', 'canceled', 'refunded');
create type public.billing_type   as enum ('UNDEFINED', 'BOLETO', 'PIX', 'CREDIT_CARD');

-- Segredos por escola. RLS ligada e SEM policies: só a service_role enxerga.
create table public.school_secrets (
  school_id           uuid primary key references public.schools (id) on delete cascade,
  asaas_api_key       text,
  asaas_env           text not null default 'sandbox' check (asaas_env in ('sandbox', 'production')),
  asaas_webhook_token text,
  updated_at          timestamptz not null default now()
);
alter table public.school_secrets enable row level security;

-- Configuração pública (não sensível) do financeiro:
-- {"due_day": 10, "fine_pct": 2, "interest_pct_month": 1, "asaas_connected": true, "asaas_env": "sandbox", "asaas_account": "Escola X"}
alter table public.schools add column finance_config jsonb not null default '{}'::jsonb;

-- Valor de referência por ano (ex.: "Mensalidade Infantil 2026").
create table public.tuition_plans (
  id             uuid primary key default gen_random_uuid(),
  school_id      uuid not null references public.schools (id) on delete cascade,
  year_id        uuid not null references public.school_years (id) on delete cascade,
  name           text not null,
  amount_cents   integer not null check (amount_cents > 0),
  due_day        integer not null default 10 check (due_day between 1 and 28),
  -- Desconto por pontualidade: X centavos até N dias antes do vencimento.
  discount_cents integer not null default 0 check (discount_cents >= 0),
  discount_days  integer not null default 0 check (discount_days >= 0),
  active         boolean not null default true,
  created_at     timestamptz not null default now()
);

-- Quem paga por cada aluno e com que ajuste.
create table public.student_billing (
  student_id          uuid primary key references public.students (id) on delete cascade,
  school_id           uuid not null references public.schools (id) on delete cascade,
  tuition_plan_id     uuid references public.tuition_plans (id) on delete set null,
  custom_amount_cents integer check (custom_amount_cents is null or custom_amount_cents > 0),
  discount_cents      integer not null default 0 check (discount_cents >= 0),
  scholarship_pct     numeric(5,2) not null default 0 check (scholarship_pct between 0 and 100),
  payer_name          text,
  payer_cpf_cnpj      text,
  payer_email         text,
  payer_phone         text,
  asaas_customer_id   text,
  notes               text,
  active              boolean not null default true,
  updated_at          timestamptz not null default now()
);

-- Uma cobrança por aluno por mês de referência (ou avulsa, com outra descrição).
create table public.invoices (
  id                uuid primary key default gen_random_uuid(),
  school_id         uuid not null references public.schools (id) on delete cascade,
  student_id        uuid not null references public.students (id) on delete cascade,
  year_id           uuid references public.school_years (id) on delete set null,
  reference_month   date not null,                     -- sempre dia 1
  description       text not null,
  amount_cents      integer not null check (amount_cents > 0),
  discount_cents    integer not null default 0 check (discount_cents >= 0),
  due_date          date not null,
  status            public.invoice_status not null default 'pending',
  billing_type      public.billing_type not null default 'UNDEFINED',
  paid_at           timestamptz,
  paid_amount_cents integer,
  payment_method    text,                              -- BOLETO | PIX | CREDIT_CARD | manual
  asaas_payment_id  text unique,
  invoice_url       text,
  bank_slip_url     text,
  pix_payload       text,
  pix_qr_code       text,                              -- base64 PNG
  notes             text,
  created_by        uuid references public.profiles (id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (student_id, reference_month, description)
);
create index invoices_school_month_idx on public.invoices (school_id, reference_month);
create index invoices_school_status_idx on public.invoices (school_id, status, due_date);

-- Eventos do webhook já processados (idempotência: o Asaas reenvia).
create table public.finance_webhook_events (
  id          text primary key,                        -- evt_...
  school_id   uuid not null references public.schools (id) on delete cascade,
  event       text not null,
  payment_id  text,
  payload     jsonb not null,
  received_at timestamptz not null default now()
);

-- updated_at automático (mesmo trigger das outras tabelas).
create trigger student_billing_touch before update on public.student_billing for each row execute function public.touch_updated_at();
create trigger invoices_touch        before update on public.invoices        for each row execute function public.touch_updated_at();
create trigger school_secrets_touch  before update on public.school_secrets  for each row execute function public.touch_updated_at();

-- -----------------------------------------------------------------------------
-- RLS: direção administra; família vê as cobranças dos filhos; mais ninguém.
-- -----------------------------------------------------------------------------
alter table public.tuition_plans          enable row level security;
alter table public.student_billing        enable row level security;
alter table public.invoices               enable row level security;
alter table public.finance_webhook_events enable row level security;

create policy tuition_plans_admin on public.tuition_plans
  for all to authenticated
  using (school_id = app.current_school_id() and app.is_admin())
  with check (school_id = app.current_school_id() and app.is_admin());

create policy student_billing_admin on public.student_billing
  for all to authenticated
  using (school_id = app.current_school_id() and app.is_admin())
  with check (school_id = app.current_school_id() and app.is_admin());

create policy invoices_admin on public.invoices
  for all to authenticated
  using (school_id = app.current_school_id() and app.is_admin())
  with check (school_id = app.current_school_id() and app.is_admin());

-- Família: só leitura, só dos filhos, nunca rascunho.
create policy invoices_guardian on public.invoices
  for select to authenticated
  using (
    school_id = app.current_school_id()
    and student_id in (select app.my_students())
    and status <> 'draft'
  );

-- finance_webhook_events: sem policy — só service_role.

-- -----------------------------------------------------------------------------
-- Feature flag `finance` nos planos.
-- -----------------------------------------------------------------------------
update public.plans set features = features || '{"finance": true}'::jsonb  where id in ('trial', 'completo', 'rede');
update public.plans set features = features || '{"finance": false}'::jsonb where id = 'essencial';

-- Resumo mensal para o painel (uma query em vez de baixar todas as cobranças).
create or replace function public.finance_month_summary(p_year_id uuid, p_month date)
returns table (
  invoices_count bigint, total_cents bigint, paid_cents bigint,
  pending_cents bigint, overdue_cents bigint, overdue_count bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    count(*)                                                                     as invoices_count,
    coalesce(sum(amount_cents - discount_cents), 0)                              as total_cents,
    coalesce(sum(coalesce(paid_amount_cents, amount_cents - discount_cents)) filter (where status = 'paid'), 0) as paid_cents,
    coalesce(sum(amount_cents - discount_cents) filter (where status = 'pending' and due_date >= current_date), 0) as pending_cents,
    coalesce(sum(amount_cents - discount_cents) filter (where status = 'overdue' or (status = 'pending' and due_date < current_date)), 0) as overdue_cents,
    count(*) filter (where status = 'overdue' or (status = 'pending' and due_date < current_date)) as overdue_count
  from public.invoices
  where school_id = app.current_school_id()
    and year_id = p_year_id
    and reference_month = date_trunc('month', p_month)::date
    and status <> 'canceled';
$$;
grant execute on function public.finance_month_summary(uuid, date) to authenticated;
