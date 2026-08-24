-- =============================================================================
-- Domain 8: Consent
--
-- doc/ARCHITECTURE listed lib/consent/ with no table behind it. Onboarding
-- captures platform consent, so it needs somewhere to land.
--
-- Append-only by intent: consent is a record of what someone agreed to at a
-- point in time, under a specific policy version. Withdrawing consent is a new
-- row with granted = false, never an edit - the history is the evidence.
-- =============================================================================

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

alter table consents enable row level security;

-- Customers may read their own consent history. Writes are service-role only,
-- like every other write in this app.
create policy "consents_owner_select" on consents
  for select to authenticated using (
    account_id in (select id from accounts where user_id = auth.uid())
  );
