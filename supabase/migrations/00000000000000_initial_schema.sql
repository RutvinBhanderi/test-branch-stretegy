-- =============================================================================
-- Greenback Cash - initial schema
--
-- 7 domains referenced in the TDD (section 9.2): identity & accounts, receipts,
-- ledger, campaigns/SKUs, wallet passes, payouts, ops/admin.
--
-- This is a working scaffold to unblock local development - reconcile it against
-- the finalized DDL from the architecture sessions before the first real migration
-- ships to staging. RLS policies below are minimal placeholders (owner-scoped
-- read/write on the customer-facing tables) and need a full security review.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Domain 1: Identity & accounts
-- -----------------------------------------------------------------------------
create table if not exists accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);

create unique index if not exists accounts_user_id_key on accounts(user_id);

-- -----------------------------------------------------------------------------
-- Domain 2: Receipts
-- -----------------------------------------------------------------------------
create table if not exists receipts (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  storage_path text not null,
  status text not null default 'pending' check (status in ('pending', 'processing', 'matched', 'rejected')),
  merchant text,
  purchased_at timestamptz,
  total numeric(10, 2),
  created_at timestamptz not null default now()
);

create table if not exists receipt_line_items (
  id uuid primary key default gen_random_uuid(),
  receipt_id uuid not null references receipts(id) on delete cascade,
  sku text,
  description text not null,
  quantity numeric(10, 2) not null,
  unit_price numeric(10, 2) not null,
  total_price numeric(10, 2) not null
);

-- -----------------------------------------------------------------------------
-- Domain 3: Ledger (append-only - see TDD section 9.1)
-- -----------------------------------------------------------------------------
create table if not exists ledger_entries (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  type text not null check (type in ('EARN', 'REDEEM', 'ADJUSTMENT', 'EXPIRY')),
  points integer not null,
  receipt_id uuid references receipts(id),
  created_at timestamptz not null default now()
);

-- Append-only enforcement: no UPDATE or DELETE on the ledger. Corrections must be
-- compensating entries (type = 'ADJUSTMENT'), never edits to history.
revoke update, delete on ledger_entries from authenticated;

create or replace function reject_ledger_mutation()
returns trigger as $$
begin
  raise exception 'ledger_entries is append-only - insert a compensating entry instead';
end;
$$ language plpgsql;

create trigger ledger_entries_no_update
  before update on ledger_entries
  for each row execute function reject_ledger_mutation();

create trigger ledger_entries_no_delete
  before delete on ledger_entries
  for each row execute function reject_ledger_mutation();

-- -----------------------------------------------------------------------------
-- Domain 4: Campaigns / SKUs
-- -----------------------------------------------------------------------------
create table if not exists campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  points_per_unit integer not null,
  active boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz
);

create table if not exists campaign_skus (
  campaign_id uuid not null references campaigns(id) on delete cascade,
  sku text not null,
  primary key (campaign_id, sku)
);

-- -----------------------------------------------------------------------------
-- Domain 5: Wallet passes
-- -----------------------------------------------------------------------------
create table if not exists wallet_passes (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  platform text not null check (platform in ('apple', 'google')),
  pass_serial text not null,
  last_pushed_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists wallet_passes_platform_serial_key
  on wallet_passes(platform, pass_serial);

-- -----------------------------------------------------------------------------
-- Domain 6: Payouts
-- -----------------------------------------------------------------------------
create table if not exists payouts (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  amount numeric(10, 2) not null,
  status text not null default 'pending' check (status in ('pending', 'processing', 'completed', 'failed')),
  provider_reference text,
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Domain 7: Ops / admin
-- -----------------------------------------------------------------------------
create table if not exists admin_users (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('ops', 'admin')),
  created_at timestamptz not null default now()
);

create table if not exists audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id),
  action text not null,
  target_table text,
  target_id uuid,
  metadata jsonb,
  created_at timestamptz not null default now()
);

-- =============================================================================
-- Row Level Security
-- =============================================================================
alter table accounts enable row level security;
alter table receipts enable row level security;
alter table receipt_line_items enable row level security;
alter table ledger_entries enable row level security;
alter table wallet_passes enable row level security;
alter table payouts enable row level security;

-- Customers can only see their own data. Ops-console access goes through the
-- service role in server-side code, which bypasses RLS by design (see TDD 9.2).
create policy "accounts_owner_select" on accounts
  for select using (auth.uid() = user_id);

create policy "receipts_owner_select" on receipts
  for select using (account_id in (select id from accounts where user_id = auth.uid()));

create policy "receipt_line_items_owner_select" on receipt_line_items
  for select using (
    receipt_id in (
      select r.id from receipts r
      join accounts a on a.id = r.account_id
      where a.user_id = auth.uid()
    )
  );

create policy "ledger_entries_owner_select" on ledger_entries
  for select using (account_id in (select id from accounts where user_id = auth.uid()));

create policy "wallet_passes_owner_select" on wallet_passes
  for select using (account_id in (select id from accounts where user_id = auth.uid()));

create policy "payouts_owner_select" on payouts
  for select using (account_id in (select id from accounts where user_id = auth.uid()));

-- No customer-facing INSERT/UPDATE policies are defined yet - all writes go through
-- Route Handlers/Server Actions using the service role. Add narrower policies here
-- only if a genuine client-side write path is introduced.
