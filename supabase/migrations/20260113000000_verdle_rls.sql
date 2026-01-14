-- Verdle: RLS policies for Verdle-specific tables.
-- This migration assumes tables are created via Drizzle (`npm run db:push`).

-- Ensure required extension for UUIDs exists (usually enabled in Supabase by default)
create extension if not exists pgcrypto;

-- Enable RLS
alter table if exists public.verdles enable row level security;
alter table if exists public.verdle_attempts enable row level security;
alter table if exists public.daily_words enable row level security;
alter table if exists public.daily_attempts enable row level security;

-- Prevent leaking encrypted secrets via public SELECT policies.
-- These REVOKEs ensure anon/authenticated can’t read the ciphertext columns even if they can SELECT rows.
revoke select(word_ciphertext) on table public.verdles from anon, authenticated;
revoke select(word_ciphertext) on table public.daily_words from anon, authenticated;

-- VERDLES
-- Anyone can read a verdle by id (needed for friend links)
drop policy if exists "verdles_select_public" on public.verdles;
create policy "verdles_select_public"
on public.verdles
for select
to anon, authenticated
using (true);

-- Only authenticated users can create verdles, and only as themselves
drop policy if exists "verdles_insert_creator_only" on public.verdles;
create policy "verdles_insert_creator_only"
on public.verdles
for insert
to authenticated
with check (creator_user_id = auth.uid()::text);

-- Only creators can update/delete their verdles (optional, but safe default)
drop policy if exists "verdles_update_creator_only" on public.verdles;
create policy "verdles_update_creator_only"
on public.verdles
for update
to authenticated
using (creator_user_id = auth.uid()::text)
with check (creator_user_id = auth.uid()::text);

drop policy if exists "verdles_delete_creator_only" on public.verdles;
create policy "verdles_delete_creator_only"
on public.verdles
for delete
to authenticated
using (creator_user_id = auth.uid()::text);

-- VERDLE ATTEMPTS (shared links)
-- Anyone can insert attempts for a verdle.
-- For authenticated users: must set player_user_id = auth.uid()
-- For anonymous users: player_user_id must be null (session-based)
drop policy if exists "verdle_attempts_insert_public" on public.verdle_attempts;
create policy "verdle_attempts_insert_public"
on public.verdle_attempts
for insert
to anon, authenticated
with check (
  (
    auth.role() = 'authenticated'
    and player_user_id = auth.uid()::text
  )
  or
  (
    auth.role() = 'anon'
    and player_user_id is null
  )
);

-- Allow reading attempts:
-- - creators can read all attempts for their verdles (dashboard stats)
-- - authenticated players can read their own attempts
-- - anonymous players cannot read attempts (prevents easy scraping)
drop policy if exists "verdle_attempts_select_creator_or_owner" on public.verdle_attempts;
create policy "verdle_attempts_select_creator_or_owner"
on public.verdle_attempts
for select
to authenticated
using (
  player_user_id = auth.uid()::text
  or exists (
    select 1
    from public.verdles v
    where v.id = verdle_attempts.verdle_id
      and v.creator_user_id = auth.uid()::text
  )
);

-- DAILY WORDS
-- Anyone can read today's daily word hash (game client still doesn't get raw word)
drop policy if exists "daily_words_select_public" on public.daily_words;
create policy "daily_words_select_public"
on public.daily_words
for select
to anon, authenticated
using (true);

-- Only service role should insert/update daily words (no policy for authenticated/anon)
-- Supabase service role bypasses RLS.

-- DAILY ATTEMPTS
-- Authenticated users can insert/select their own daily attempt.
drop policy if exists "daily_attempts_insert_own" on public.daily_attempts;
create policy "daily_attempts_insert_own"
on public.daily_attempts
for insert
to authenticated
with check (user_id = auth.uid()::text);

drop policy if exists "daily_attempts_select_own" on public.daily_attempts;
create policy "daily_attempts_select_own"
on public.daily_attempts
for select
to authenticated
using (user_id = auth.uid()::text);

-- No updates/deletes by clients (write-once)

