-- =============================================================================
-- Realtime publication + RLS coverage for the four tables the initial schema
-- left unprotected.
--
-- Context: in Supabase, a table with RLS DISABLED is fully readable through
-- PostgREST by anyone holding the anon key - the default grants to `anon` and
-- `authenticated` are what expose it. The initial migration enabled RLS on the
-- six customer-facing tables but not on campaigns, campaign_skus, admin_users
-- or audit_log, which means admin rosters and the audit trail are currently
-- readable by any signed-in user.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Realtime: the receipt status screen subscribes to its own receipt rows.
-- Without the table being in this publication, Realtime silently delivers
-- nothing. Realtime still applies the RLS policies below, so a subscriber only
-- receives rows they could already select.
-- -----------------------------------------------------------------------------
alter publication supabase_realtime add table receipts;

-- -----------------------------------------------------------------------------
-- Campaigns: readable by signed-in users (the home screen shows active offers).
-- Writes stay service-role only - Phase I configures campaigns via direct SQL.
-- -----------------------------------------------------------------------------
alter table campaigns enable row level security;
alter table campaign_skus enable row level security;

create policy "campaigns_authenticated_select" on campaigns
  for select to authenticated using (active = true);

create policy "campaign_skus_authenticated_select" on campaign_skus
  for select to authenticated using (
    campaign_id in (select id from campaigns where active = true)
  );

-- -----------------------------------------------------------------------------
-- admin_users: a user may check whether THEY are ops. They may not enumerate
-- the admin roster. middleware.ts relies on this policy for its route gate.
-- -----------------------------------------------------------------------------
alter table admin_users enable row level security;

create policy "admin_users_self_select" on admin_users
  for select to authenticated using (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- audit_log: no policy at all. RLS enabled with zero policies means every
-- non-service-role client is denied, which is the intent - the audit trail is
-- written and read exclusively by server-side code holding the service role.
-- -----------------------------------------------------------------------------
alter table audit_log enable row level security;
