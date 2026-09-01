-- =============================================================================
-- Initial schema - starter slice
--
-- Two tables, because that is what the onboarding slice actually uses. Add one
-- migration per domain as you build it. Never edit a migration that has already
-- been applied anywhere - write a new one.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Accounts: the app's own record of a user.
--
-- auth.users belongs to Supabase; this is ours. Keeping a separate table means
-- app data foreign-keys to something we control, and Supabase auth stays
-- swappable. Every other domain table references accounts(id), not auth.users.
-- -----------------------------------------------------------------------------
create table if not exists accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);

create unique index if not exists accounts_user_id_key on accounts(user_id);

-- -----------------------------------------------------------------------------
-- Consents: what someone agreed to, when, under which policy version.
--
-- Append-only by intent. Withdrawing consent is a new row with granted = false,
-- never an edit - the history is the evidence.
-- -----------------------------------------------------------------------------
create table if not exists consents (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  kind text not null check (kind in ('terms', 'privacy', 'marketing')),
  granted boolean not null,
  policy_version text not null,
  created_at timestamptz not null default now()
);

create index if not exists consents_account_kind_idx
  on consents(account_id, kind, created_at desc);

-- =============================================================================
-- Row Level Security
--
-- Enable RLS on every table you add, without exception. In Supabase a table
-- with RLS DISABLED is fully readable through PostgREST by anyone holding the
-- anon key - the default grants to `anon` and `authenticated` are what expose
-- it. Forgetting this is the single most common way a Supabase app leaks data.
--
-- Note that "no policy" is not the same as "no access": RLS enabled with zero
-- policies denies every client except the service role, which is exactly what
-- you want for internal tables.
-- =============================================================================
alter table accounts enable row level security;
alter table consents enable row level security;

create policy "accounts_owner_select" on accounts
  for select to authenticated using (auth.uid() = user_id);

create policy "consents_owner_select" on consents
  for select to authenticated using (
    account_id in (select id from accounts where user_id = auth.uid())
  );

-- No customer-facing INSERT or UPDATE policies. Every write goes through a
-- Server Action or Route Handler using the service-role client - see
-- lib/supabase/admin.ts. Add a narrower policy here only if a genuine
-- client-side write path appears.
