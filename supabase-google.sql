-- ===== 学习站 · Chuyển sang đăng nhập Google, không cần danh sách Gmail =====
-- Chạy 1 lần trong Supabase → SQL Editor → New query → Run.
-- Sau khi chạy: ai đăng nhập bằng Google cũng dùng được, mỗi người chỉ đọc/sửa tiến độ của chính mình.

-- Tiến độ: mỗi người chỉ đọc / tạo / sửa dòng của chính mình
drop policy if exists "own row read" on public.progress;
drop policy if exists "own row insert" on public.progress;
drop policy if exists "own row update" on public.progress;
create policy "own row read" on public.progress
  for select to authenticated using (auth.uid() = user_id);
create policy "own row insert" on public.progress
  for insert to authenticated with check (auth.uid() = user_id);
create policy "own row update" on public.progress
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Bảng xếp hạng: người đã đăng nhập xem được tên + XP của nhau, chỉ sửa được dòng của mình
drop policy if exists "allowed read board" on public.leaderboard;
drop policy if exists "own board insert" on public.leaderboard;
drop policy if exists "own board update" on public.leaderboard;
create policy "signed in read board" on public.leaderboard
  for select to authenticated using (true);
create policy "own board insert" on public.leaderboard
  for insert to authenticated with check (auth.uid() = user_id);
create policy "own board update" on public.leaderboard
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
