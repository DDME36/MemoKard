-- MemoKard schema bootstrap. Apply with `supabase db push` or paste into SQL Editor.
create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (username ~ '^[A-Za-z0-9_]{3,20}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, username)
  values (new.id, coalesce(new.raw_user_meta_data->>'username', 'user_' || left(new.id::text, 8)))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.get_email_by_username(p_username text)
returns text language sql security definer stable set search_path = public, auth as $$
  select u.email from auth.users u
  join public.profiles p on p.id = u.id
  where lower(p.username) = lower(trim(p_username)) limit 1;
$$;
revoke all on function public.get_email_by_username(text) from public;
grant execute on function public.get_email_by_username(text) to anon, authenticated;

create table if not exists public.decks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  color text not null default 'violet',
  is_synced boolean not null default false,
  linked_public_deck_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists decks_user_id_idx on public.decks(user_id);

create table if not exists public.cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  deck_id uuid not null references public.decks(id) on delete cascade,
  question text not null,
  answer text not null,
  ease_factor double precision not null default 2.5,
  interval integer not null default 0,
  repetition integer not null default 0,
  next_review timestamptz not null default now(),
  fsrs_state jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists cards_user_id_idx on public.cards(user_id);
create index if not exists cards_deck_id_idx on public.cards(deck_id);
create index if not exists cards_next_review_idx on public.cards(user_id, next_review);

create table if not exists public.user_stats (
  user_id uuid primary key references auth.users(id) on delete cascade,
  last_review_date date,
  streak integer not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.review_logs (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  card_id uuid references public.cards(id) on delete set null,
  quality smallint not null check (quality between 0 and 4),
  reviewed_at timestamptz not null default now()
);
create index if not exists review_logs_user_date_idx on public.review_logs(user_id, reviewed_at desc);

create table if not exists public.user_achievements (
  user_id uuid primary key references auth.users(id) on delete cascade,
  unlocked_achievements text[] not null default '{}',
  perfect_reviews integer not null default 0,
  total_study_time integer not null default 0,
  decks_shared integer not null default 0,
  decks_imported integer not null default 0,
  max_streak integer not null default 0,
  updated_at timestamptz not null default now()
);

create or replace function public.increment_study_time(p_user_id uuid, p_minutes integer)
returns void language plpgsql security invoker as $$
begin
  if p_user_id <> auth.uid() then raise exception 'not allowed'; end if;
  insert into public.user_achievements(user_id, total_study_time)
  values (p_user_id, greatest(p_minutes, 0))
  on conflict (user_id) do update
  set total_study_time = public.user_achievements.total_study_time + greatest(excluded.total_study_time, 0),
      updated_at = now();
end;
$$;

create table if not exists public.public_decks (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references auth.users(id) on delete cascade,
  source_deck_id uuid references public.decks(id) on delete set null,
  name text not null,
  description text,
  color text not null default 'violet',
  category text not null default 'อื่นๆ',
  tags text[] not null default '{}',
  import_count integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.public_deck_cards (
  id uuid primary key default gen_random_uuid(),
  public_deck_id uuid not null references public.public_decks(id) on delete cascade,
  question text not null,
  answer text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.deck_imports (
  id uuid primary key default gen_random_uuid(),
  public_deck_id uuid not null references public.public_decks(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  imported_deck_id uuid references public.decks(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (public_deck_id, user_id)
);

create table if not exists public.deck_ratings (
  id uuid primary key default gen_random_uuid(),
  public_deck_id uuid not null references public.public_decks(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (public_deck_id, user_id)
);

create table if not exists public.deck_reports (
  id uuid primary key default gen_random_uuid(),
  public_deck_id uuid not null references public.public_decks(id) on delete cascade,
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reason text not null check (reason in ('spam', 'inappropriate', 'copyright', 'other')),
  details text,
  created_at timestamptz not null default now(),
  unique (public_deck_id, reporter_id)
);

create or replace view public.public_decks_with_stats
with (security_invoker = true) as
select pd.*,
       coalesce(p.username, 'Unknown') as creator_username,
       count(distinct pdc.id)::integer as card_count,
       coalesce(round(avg(dr.rating)::numeric, 1), 0) as avg_rating,
       count(distinct dr.id)::integer as rating_count
from public.public_decks pd
left join public.profiles p on p.id = pd.creator_id
left join public.public_deck_cards pdc on pdc.public_deck_id = pd.id
left join public.deck_ratings dr on dr.public_deck_id = pd.id
group by pd.id, p.username;

do $$ begin
  alter table public.decks add constraint decks_linked_public_deck_fk
    foreign key (linked_public_deck_id) references public.public_decks(id) on delete set null;
exception when duplicate_object then null; end $$;

do $$
declare table_name text;
begin
  foreach table_name in array array['profiles','decks','cards','user_stats','review_logs','user_achievements','public_decks','public_deck_cards','deck_imports','deck_ratings','deck_reports']
  loop execute format('alter table public.%I enable row level security', table_name); end loop;
end $$;

create policy "profiles readable" on public.profiles for select using (true);
create policy "profile owner writes" on public.profiles for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "deck owner access" on public.decks for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "card owner access" on public.cards for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "stats owner access" on public.user_stats for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "review owner access" on public.review_logs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "achievement owner access" on public.user_achievements for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "active public decks readable" on public.public_decks for select using (is_active or auth.uid() = creator_id);
create policy "creator manages public decks" on public.public_decks for all using (auth.uid() = creator_id) with check (auth.uid() = creator_id);
create policy "public cards readable" on public.public_deck_cards for select using (exists (select 1 from public.public_decks d where d.id = public_deck_id and d.is_active));
create policy "creator manages public cards" on public.public_deck_cards for all using (exists (select 1 from public.public_decks d where d.id = public_deck_id and d.creator_id = auth.uid())) with check (exists (select 1 from public.public_decks d where d.id = public_deck_id and d.creator_id = auth.uid()));
create policy "imports owner access" on public.deck_imports for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "ratings readable" on public.deck_ratings for select using (true);
create policy "ratings owner writes" on public.deck_ratings for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "reports owner inserts" on public.deck_reports for insert with check (auth.uid() = reporter_id);
create policy "reports owner reads" on public.deck_reports for select using (auth.uid() = reporter_id or (auth.jwt()->'app_metadata'->>'role') = 'admin');
create policy "admin manages reports" on public.deck_reports for all using ((auth.jwt()->'app_metadata'->>'role') = 'admin');

drop trigger if exists decks_updated_at on public.decks;
create trigger decks_updated_at before update on public.decks for each row execute function public.set_updated_at();
drop trigger if exists cards_updated_at on public.cards;
create trigger cards_updated_at before update on public.cards for each row execute function public.set_updated_at();
drop trigger if exists public_decks_updated_at on public.public_decks;
create trigger public_decks_updated_at before update on public.public_decks for each row execute function public.set_updated_at();
drop trigger if exists deck_ratings_updated_at on public.deck_ratings;
create trigger deck_ratings_updated_at before update on public.deck_ratings for each row execute function public.set_updated_at();
