-- Local dev seed data. Run via `supabase db reset` (applies migrations then this file).
-- Keep this free of anything resembling real customer or financial data.

insert into campaigns (id, name, points_per_unit, active)
values ('00000000-0000-0000-0000-000000000001', 'Launch campaign', 5, true)
on conflict (id) do nothing;

insert into campaign_skus (campaign_id, sku)
values ('00000000-0000-0000-0000-000000000001', 'SKU-DEMO-1')
on conflict do nothing;
