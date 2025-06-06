-- Create the sales table for POS transactions
create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  created_at timestamp with time zone default timezone('utc', now()),
  created_by uuid references public.users(id) not null,
  items jsonb not null,
  payment_method text not null,
  shift_id uuid references public.shifts(id) not null,
  total numeric not null
);

-- Index for faster queries by shift
create index if not exists sales_shift_id_idx on public.sales(shift_id);

-- Index for faster queries by created_by
create index if not exists sales_created_by_idx on public.sales(created_by); 