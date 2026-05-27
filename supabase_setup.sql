-- Run this in Supabase → SQL Editor

create table if not exists savings (
  id      int primary key,
  saved   numeric default 0,
  target  numeric default 0,
  log     jsonb   default '[]'::jsonb
);

-- Insert the first row
insert into savings (id, saved, target, log)
values (1, 0, 0, '[]')
on conflict (id) do nothing;
