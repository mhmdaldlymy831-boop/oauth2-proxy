create table if not exists notes (
  id text primary key,
  owner_id text not null,
  stage text not null default 'production',
  title text not null,
  body text not null default '',
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists notes_owner_stage_idx on notes (owner_id, stage);
create index if not exists notes_updated_idx on notes (updated_at desc);
