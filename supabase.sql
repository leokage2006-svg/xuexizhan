-- ===== 学习站 · Cấu hình cơ sở dữ liệu Supabase =====
-- Cách dùng: Supabase → SQL Editor → New query → dán toàn bộ file này → Run.
-- Nhớ sửa 2 địa chỉ Gmail ở cuối file thành Gmail thật của bạn.

-- 1) Danh sách Gmail được phép dùng web
create table if not exists public.allowed_emails (
  email text primary key
);
alter table public.allowed_emails enable row level security;
-- (không tạo policy cho bảng này: chỉ bạn sửa được nó trong Supabase)

-- 2) Tiến độ học: mỗi Gmail một dòng
create table if not exists public.progress (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text,
  name text,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.progress enable row level security;

-- Hàm kiểm tra người đang đăng nhập có trong danh sách được phép không
create or replace function public.is_allowed()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.allowed_emails
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

-- Mỗi người chỉ đọc được tiến độ của chính mình
drop policy if exists "allowed users can read" on public.progress;
drop policy if exists "own row read" on public.progress;
create policy "own row read" on public.progress
  for select to authenticated using (auth.uid() = user_id and public.is_allowed());

-- Mỗi người chỉ tạo / sửa được dòng của chính mình
drop policy if exists "own row insert" on public.progress;
create policy "own row insert" on public.progress
  for insert to authenticated with check (auth.uid() = user_id and public.is_allowed());

drop policy if exists "own row update" on public.progress;
create policy "own row update" on public.progress
  for update to authenticated using (auth.uid() = user_id and public.is_allowed())
  with check (auth.uid() = user_id and public.is_allowed());

-- 3) Bảng xếp hạng tuần: chỉ chứa tên và điểm XP, các tài khoản được phép xem của nhau
create table if not exists public.leaderboard (
  user_id uuid primary key references auth.users (id) on delete cascade,
  name text,
  xp_week integer not null default 0,
  week text,
  updated_at timestamptz not null default now()
);
alter table public.leaderboard enable row level security;
drop policy if exists "allowed read board" on public.leaderboard;
create policy "allowed read board" on public.leaderboard
  for select to authenticated using (public.is_allowed());
drop policy if exists "own board insert" on public.leaderboard;
create policy "own board insert" on public.leaderboard
  for insert to authenticated with check (auth.uid() = user_id and public.is_allowed());
drop policy if exists "own board update" on public.leaderboard;
create policy "own board update" on public.leaderboard
  for update to authenticated using (auth.uid() = user_id and public.is_allowed())
  with check (auth.uid() = user_id and public.is_allowed());

-- Quyền truy cập qua API (dự án Supabase tạo sau 30/05/2026 bắt buộc phải có)
grant usage on schema public to authenticated;
grant select, insert, update on table public.progress to authenticated;
grant select, insert, update on table public.leaderboard to authenticated;
grant execute on function public.is_allowed() to authenticated;

-- 4) THÊM GMAIL CỦA BẠN Ở ĐÂY (sửa rồi chạy lại phần này bất cứ lúc nào)
insert into public.allowed_emails (email) values
  ('ban@gmail.com'),
  ('ban.thu.hai@gmail.com')
on conflict do nothing;
