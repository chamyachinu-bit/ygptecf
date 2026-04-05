-- ============================================================
-- Motivational quotes managed by admin, visible to all users
-- ============================================================

create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  text text not null,
  author text not null default '',
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

insert into public.quotes (text, author, sort_order) values
  ('The best way to find yourself is to lose yourself in the service of others.', 'Mahatma Gandhi', 0),
  ('Alone we can do so little; together we can do so much.', 'Helen Keller', 1),
  ('No one has ever become poor by giving.', 'Anne Frank', 2),
  ('Service to others is the rent you pay for your room here on earth.', 'Muhammad Ali', 3),
  ('We make a living by what we get, but we make a life by what we give.', 'Winston Churchill', 4),
  ('Never doubt that a small group of thoughtful, committed citizens can change the world.', 'Margaret Mead', 5),
  ('The meaning of life is to find your gift. The purpose of life is to give it away.', 'Pablo Picasso', 6),
  ('What you do makes a difference, and you have to decide what kind of difference you want to make.', 'Jane Goodall', 7),
  ('Volunteers do not necessarily have the time; they just have the heart.', 'Elizabeth Andrew', 8),
  ('Act as if what you do makes a difference. It does.', 'William James', 9)
on conflict do nothing;

alter table public.quotes enable row level security;

-- Anyone (including unauthenticated) can read active quotes
create policy "quotes_read_all"
  on public.quotes for select
  using (active = true);

-- Only admins can modify
create policy "quotes_admin_insert"
  on public.quotes for insert
  with check (public.get_my_role() = 'admin');

create policy "quotes_admin_update"
  on public.quotes for update
  using (public.get_my_role() = 'admin');

create policy "quotes_admin_delete"
  on public.quotes for delete
  using (public.get_my_role() = 'admin');
