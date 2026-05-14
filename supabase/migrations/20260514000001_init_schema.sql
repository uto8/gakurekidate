-- =============================================================
-- gakureki-date — 初期スキーマ
-- =============================================================

-- ---------------------------------------------------------------
-- profiles テーブル
-- ---------------------------------------------------------------
create table public.profiles (
  id          uuid        primary key references auth.users(id) on delete cascade,
  name        text        not null,
  birth_date  date        not null check (birth_date <= current_date - interval '18 years'),
  gender      text        not null check (gender in ('male', 'female')),
  bio         text,
  photo_url   text,
  deleted_at  timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select"
  on public.profiles for select
  using (deleted_at is null or auth.uid() = id);

create policy "profiles_insert"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "profiles_update"
  on public.profiles for update
  using (auth.uid() = id);

-- ---------------------------------------------------------------
-- educations テーブル（プロフィールと 1:1）
-- ---------------------------------------------------------------
create table public.educations (
  id              uuid        primary key default gen_random_uuid(),
  user_id         uuid        not null unique references public.profiles(id) on delete cascade,
  university      text        not null,
  faculty         text        not null,
  graduation_year integer     not null check (graduation_year between 1950 and 2100),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table public.educations enable row level security;

-- 学歴は公開情報（全員が参照可）
create policy "educations_select"
  on public.educations for select
  using (true);

-- 書き込みは本人のみ
create policy "educations_insert_update"
  on public.educations for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------
-- likes テーブル
-- ---------------------------------------------------------------
create table public.likes (
  id           uuid        primary key default gen_random_uuid(),
  from_user_id uuid        not null references public.profiles(id) on delete cascade,
  to_user_id   uuid        not null references public.profiles(id) on delete cascade,
  created_at   timestamptz not null default now(),
  unique (from_user_id, to_user_id),
  check (from_user_id <> to_user_id)
);

alter table public.likes enable row level security;

create policy "likes_select"
  on public.likes for select
  using (auth.uid() = from_user_id or auth.uid() = to_user_id);

create policy "likes_insert"
  on public.likes for insert
  with check (auth.uid() = from_user_id);

-- ---------------------------------------------------------------
-- matches テーブル
-- user1_id < user2_id を強制して UNIQUE 制約の抜け漏れを防ぐ
-- ---------------------------------------------------------------
create table public.matches (
  id         uuid        primary key default gen_random_uuid(),
  user1_id   uuid        not null references public.profiles(id) on delete cascade,
  user2_id   uuid        not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user1_id, user2_id),
  check (user1_id < user2_id)
);

alter table public.matches enable row level security;

create policy "matches_select"
  on public.matches for select
  using (auth.uid() = user1_id or auth.uid() = user2_id);

-- ---------------------------------------------------------------
-- messages テーブル
-- sender_id は退会後 SET NULL（メッセージ履歴は保持）
-- ---------------------------------------------------------------
create table public.messages (
  id         uuid        primary key default gen_random_uuid(),
  match_id   uuid        not null references public.matches(id) on delete cascade,
  sender_id  uuid        references public.profiles(id) on delete set null,
  content    text        not null check (length(content) between 1 and 1000),
  created_at timestamptz not null default now()
);

alter table public.messages enable row level security;

create policy "messages_select"
  on public.messages for select
  using (
    exists (
      select 1 from public.matches m
      where m.id = match_id
        and (m.user1_id = auth.uid() or m.user2_id = auth.uid())
    )
  );

create policy "messages_insert"
  on public.messages for insert
  with check (
    auth.uid() = sender_id
    and exists (
      select 1 from public.matches m
      where m.id = match_id
        and (m.user1_id = auth.uid() or m.user2_id = auth.uid())
    )
  );

-- ---------------------------------------------------------------
-- profiles_with_age ビュー
-- birth_date から年齢を動的計算（ビューに SELECT するだけで age が取れる）
-- ---------------------------------------------------------------
create or replace view public.profiles_with_age as
select
  p.*,
  e.university,
  e.faculty,
  e.graduation_year,
  date_part('year', age(p.birth_date))::integer as age
from public.profiles p
left join public.educations e on e.user_id = p.id;

-- ---------------------------------------------------------------
-- インデックス（7本）
-- ---------------------------------------------------------------
-- 探索フィルター（異性・年齢範囲）
create index idx_profiles_gender_birth
  on public.profiles(gender, birth_date)
  where deleted_at is null;

-- 大学名キーワード検索（ILIKE / LIKE 対応）
create index idx_educations_university
  on public.educations(university text_pattern_ops);

-- いいね一覧取得
create index idx_likes_to_user   on public.likes(to_user_id);
create index idx_likes_from_user on public.likes(from_user_id);

-- マッチング検索（user1 / user2 どちらでも引ける）
create index idx_matches_user1 on public.matches(user1_id);
create index idx_matches_user2 on public.matches(user2_id);

-- チャット時系列表示
create index idx_messages_match_created on public.messages(match_id, created_at);
