create schema if not exists archive_unused_20260625;

revoke all on schema archive_unused_20260625 from public;
revoke all on schema archive_unused_20260625 from anon;
revoke all on schema archive_unused_20260625 from authenticated;

create table if not exists archive_unused_20260625.archive_manifest (
  original_schema text not null,
  table_name text primary key,
  archived_at timestamptz not null default now(),
  reason text not null
);

comment on schema archive_unused_20260625 is
  'Schema reservado para respaldos explícitos antes de normalizaciones aprobadas.';
