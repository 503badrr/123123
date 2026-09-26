-- Record production deployment automation events from Pipedream.
-- This table is server-only: browser clients have no table grants and an
-- explicit deny policy documents the boundary for Supabase advisors.

create table if not exists public.deployments (
  id uuid primary key default gen_random_uuid(),
  repository text not null,
  repository_url text,
  environment text not null default 'production',
  branch text not null,
  commit_sha text not null,
  commit_message text,
  commit_url text,
  author_name text,
  github_actor text,
  github_delivery_id text,
  cloudflare_deployment_id text,
  cloudflare_deployment_url text,
  cloudflare_purge_id text,
  purge_mode text,
  status text not null default 'processing'
    check (status in ('processing', 'success', 'failed')),
  error_message text,
  started_at timestamptz not null default now(),
  deployed_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint deployments_repo_env_sha_unique
    unique (repository, environment, commit_sha)
);

create unique index if not exists deployments_github_delivery_id_unique
  on public.deployments (github_delivery_id)
  where github_delivery_id is not null;

create index if not exists deployments_status_started_at_idx
  on public.deployments (status, started_at desc);

alter table public.deployments enable row level security;

revoke all on table public.deployments from anon, authenticated;
grant usage on schema public to service_role;
grant select, insert, update on table public.deployments to service_role;

drop policy if exists "deployments_server_only" on public.deployments;
create policy "deployments_server_only"
  on public.deployments
  for all
  to anon, authenticated
  using (false)
  with check (false);
