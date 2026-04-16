-- ============ ENUMS ============
create type public.message_role as enum ('user', 'assistant', 'system');
create type public.chat_mode as enum ('neural', 'chat', 'code', 'image');
create type public.accent_color as enum ('cyan', 'violet', 'magenta');
create type public.reasoning_effort as enum ('low', 'medium', 'high');

-- ============ TIMESTAMP TRIGGER FN ============
create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============ PROFILES ============
create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  github_username text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create policy "Profiles are viewable by everyone"
  on public.profiles for select using (true);
create policy "Users insert own profile"
  on public.profiles for insert with check (auth.uid() = user_id);
create policy "Users update own profile"
  on public.profiles for update using (auth.uid() = user_id);
create policy "Users delete own profile"
  on public.profiles for delete using (auth.uid() = user_id);

create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.update_updated_at_column();

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)));
  insert into public.user_settings (user_id) values (new.id);
  return new;
end;
$$;

-- ============ USER SETTINGS ============
create table public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  accent public.accent_color not null default 'cyan',
  compact_mode boolean not null default false,
  reasoning_effort public.reasoning_effort not null default 'medium',
  preferred_model text not null default 'google/gemini-3-flash-preview',
  updated_at timestamptz not null default now()
);
alter table public.user_settings enable row level security;

create policy "Users view own settings"
  on public.user_settings for select using (auth.uid() = user_id);
create policy "Users insert own settings"
  on public.user_settings for insert with check (auth.uid() = user_id);
create policy "Users update own settings"
  on public.user_settings for update using (auth.uid() = user_id);

create trigger trg_user_settings_updated_at
  before update on public.user_settings
  for each row execute function public.update_updated_at_column();

-- ============ CONVERSATIONS ============
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'New session',
  mode public.chat_mode not null default 'neural',
  model text,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.conversations enable row level security;
create index idx_conversations_user_updated on public.conversations(user_id, updated_at desc);

create policy "Users view own conversations"
  on public.conversations for select using (auth.uid() = user_id);
create policy "Users insert own conversations"
  on public.conversations for insert with check (auth.uid() = user_id);
create policy "Users update own conversations"
  on public.conversations for update using (auth.uid() = user_id);
create policy "Users delete own conversations"
  on public.conversations for delete using (auth.uid() = user_id);

create trigger trg_conversations_updated_at
  before update on public.conversations
  for each row execute function public.update_updated_at_column();

-- ============ MESSAGES ============
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.message_role not null,
  content text not null default '',
  image_url text,
  model text,
  created_at timestamptz not null default now()
);
alter table public.messages enable row level security;
create index idx_messages_conv_created on public.messages(conversation_id, created_at);

create policy "Users view own messages"
  on public.messages for select using (auth.uid() = user_id);
create policy "Users insert own messages"
  on public.messages for insert with check (auth.uid() = user_id);
create policy "Users update own messages"
  on public.messages for update using (auth.uid() = user_id);
create policy "Users delete own messages"
  on public.messages for delete using (auth.uid() = user_id);

-- ============ NEW USER TRIGGER (after user_settings exists) ============
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============ AVATARS BUCKET ============
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true);

create policy "Avatars publicly readable"
  on storage.objects for select using (bucket_id = 'avatars');
create policy "Users upload own avatar"
  on storage.objects for insert
  with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "Users update own avatar"
  on storage.objects for update
  using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "Users delete own avatar"
  on storage.objects for delete
  using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);