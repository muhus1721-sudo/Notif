-- Run these in Supabase → SQL Editor AFTER the three migration files.
-- Edit the values in CAPITALS first. Each block can be run on its own.

-- 1) Make yourself admin. Sign up in the app first, then:
update public.profiles set role = 'admin' where email = 'YOUR_EMAIL@example.com';

-- 2) Open the current semester. ends_at is when everyone's paid access expires
--    (Pakistan time, +05). Needed before students can submit payments (Phase 3).
insert into public.semesters (name, ends_at, price_pkr, is_current)
values ('Fall 2026', '2027-01-31 23:59:59+05', 1000, true);

-- 3) Payment details shown on the "Unlock" screen (Phase 3).
update public.app_settings
   set payment_account_number = '03XX-XXXXXXX',
       payment_account_title  = 'ACCOUNT HOLDER NAME',
       payment_methods        = 'JazzCash / Easypaisa';

-- ─── Handy checks ─────────────────────────────────────────────────────────────────────
-- Every public table should say rowsecurity = true:
select tablename, rowsecurity from pg_tables where schemaname = 'public' order by tablename;

-- Who has signed up:
select email, full_name, cms_id, section, role, created_at from public.profiles order by created_at desc;
