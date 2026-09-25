create table if not exists public.push_device_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  fcm_token text not null unique,
  platform text not null default 'android',
  app_id text not null default 'com.ddworld.marketing.app',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists push_device_tokens_user_id_idx on public.push_device_tokens(user_id);
create index if not exists push_device_tokens_active_idx on public.push_device_tokens(active);
alter table public.push_device_tokens enable row level security;

drop policy if exists "push_device_tokens_select_own" on public.push_device_tokens;
create policy "push_device_tokens_select_own" on public.push_device_tokens for select using (exists (select 1 from public.users u where u.id = push_device_tokens.user_id and u.auth_user_id = auth.uid()));
drop policy if exists "push_device_tokens_insert_own" on public.push_device_tokens;
create policy "push_device_tokens_insert_own" on public.push_device_tokens for insert with check (exists (select 1 from public.users u where u.id = push_device_tokens.user_id and u.auth_user_id = auth.uid()));
drop policy if exists "push_device_tokens_update_own" on public.push_device_tokens;
create policy "push_device_tokens_update_own" on public.push_device_tokens for update using (exists (select 1 from public.users u where u.id = push_device_tokens.user_id and u.auth_user_id = auth.uid())) with check (exists (select 1 from public.users u where u.id = push_device_tokens.user_id and u.auth_user_id = auth.uid()));
drop policy if exists "push_device_tokens_delete_own" on public.push_device_tokens;
create policy "push_device_tokens_delete_own" on public.push_device_tokens for delete using (exists (select 1 from public.users u where u.id = push_device_tokens.user_id and u.auth_user_id = auth.uid()));
