
-- Profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null default '',
  saldo numeric not null default 0,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "profile select own" on public.profiles for select using (auth.uid() = id);
create policy "profile insert own" on public.profiles for insert with check (auth.uid() = id);
create policy "profile update own" on public.profiles for update using (auth.uid() = id);

-- Cartoes
create table public.cartoes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  banco text not null,
  limite numeric not null default 0,
  gasto numeric not null default 0,
  created_at timestamptz not null default now()
);
alter table public.cartoes enable row level security;
create policy "cartao all own" on public.cartoes for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Transacoes
create table public.transacoes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tipo text not null check (tipo in ('entrada','saida')),
  descricao text not null,
  valor numeric not null check (valor > 0),
  cartao_id uuid references public.cartoes(id) on delete set null,
  data timestamptz not null default now()
);
alter table public.transacoes enable row level security;
create policy "tx all own" on public.transacoes for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, nome)
  values (new.id, coalesce(new.raw_user_meta_data->>'nome', ''));
  return new;
end;
$$;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
