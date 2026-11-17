begin;
create table public.user_profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 display_name text not null default '' check (length(display_name)<=80),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.generated_batches (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 options jsonb not null, candidate_count integer not null check(candidate_count between 0 and 100), created_at timestamptz not null default now()
);
create table public.saved_handles (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 username text not null check(username ~ '^[a-z0-9._]{2,10}$' and username !~ '(^\.|\.$|\.\.)'),
 candidate jsonb not null check (
  jsonb_typeof(candidate)='object'
  and candidate ?& array['username','score','length','label','origin']
  and jsonb_typeof(candidate->'username')='string'
  and jsonb_typeof(candidate->'score')='number'
  and jsonb_typeof(candidate->'length')='number'
  and jsonb_typeof(candidate->'label')='string'
  and jsonb_typeof(candidate->'origin')='string'
  and candidate->>'username'=username
  and candidate->>'length'=length(username)::text
  and candidate->>'score' ~ '^[0-9]+$'
  and (candidate->>'score')::integer between 10 and 99
  and candidate->>'label' in ('Dictionary word','Coined name')
  and candidate->>'origin' in ('balanced','words','invented','minimal','aesthetic','brand','random','og')
 ), created_at timestamptz not null default now(), unique(user_id,username)
);
create table public.handle_verifications (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 username text not null check(username ~ '^[a-z0-9._]{2,10}$' and username !~ '(^\.|\.$|\.\.)'),
 status text not null check(status in ('UNVERIFIED','NEEDS_RECHECK','REPORTED_AVAILABLE','REPORTED_UNAVAILABLE','RESERVED_OR_UNKNOWN','CLAIMED')),
 method text not null default 'instagram_manual' check(method='instagram_manual'),
 note text not null default '' check(length(note)<=280), checked_at timestamptz not null default now(), unique(user_id,username)
);
create table public.verification_events (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 username text not null, status text not null check(status in ('UNVERIFIED','NEEDS_RECHECK','REPORTED_AVAILABLE','REPORTED_UNAVAILABLE','RESERVED_OR_UNKNOWN','CLAIMED')),
 method text not null check(method='instagram_manual'), note text not null check(length(note)<=280), created_at timestamptz not null default now()
);
create table public.rate_limit_buckets (
 user_id uuid not null references auth.users(id) on delete cascade, kind text not null, window_start timestamptz not null, count integer not null,
 primary key(user_id,kind)
);
create index batches_owner_time on public.generated_batches(user_id,created_at desc);
create index handles_owner_time on public.saved_handles(user_id,created_at desc);
create index verifications_owner_time on public.handle_verifications(user_id,checked_at desc);
create index events_owner_time on public.verification_events(user_id,created_at desc);
alter table public.user_profiles enable row level security;
alter table public.generated_batches enable row level security;
alter table public.saved_handles enable row level security;
alter table public.handle_verifications enable row level security;
alter table public.verification_events enable row level security;
alter table public.rate_limit_buckets enable row level security;
create policy profile_read on public.user_profiles for select to authenticated using (id=(select auth.uid()));
create policy profile_insert on public.user_profiles for insert to authenticated with check (id=(select auth.uid()));
create policy profile_update on public.user_profiles for update to authenticated using (id=(select auth.uid())) with check(id=(select auth.uid()));
create policy batch_read on public.generated_batches for select to authenticated using(user_id=(select auth.uid()));
create policy handles_read on public.saved_handles for select to authenticated using(user_id=(select auth.uid()));
create policy verification_read on public.handle_verifications for select to authenticated using(user_id=(select auth.uid()));
create policy events_read on public.verification_events for select to authenticated using(user_id=(select auth.uid()));
-- Writes flow through security-definer functions/triggers with explicit ownership and atomic rate limits.
create or replace function public.consume_rate_limit(p_kind text) returns boolean language plpgsql security definer set search_path='' as $$
declare n integer; boundary timestamptz:=date_trunc('minute',clock_timestamp());
begin
 if auth.uid() is null or p_kind not in ('generate','write','auth_profile') then return false; end if;
 insert into public.rate_limit_buckets(user_id,kind,window_start,count) values(auth.uid(),p_kind,boundary,1)
 on conflict(user_id,kind) do update set count=case when public.rate_limit_buckets.window_start=boundary then public.rate_limit_buckets.count+1 else 1 end,window_start=boundary
 returning count into n;
 return n <= case when p_kind='generate' then 30 else 60 end;
end; $$;
create or replace function public.enforce_write() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or (case when TG_OP='DELETE' then old.user_id else new.user_id end)<>auth.uid() then raise exception 'Ownership denied'; end if;
 if not public.consume_rate_limit(case when TG_TABLE_NAME='generated_batches' then 'generate' else 'write' end) then raise exception 'Rate limit exceeded';end if;
 if TG_OP='DELETE' then return old;end if;return new;
end; $$;
create policy batch_insert on public.generated_batches for insert to authenticated with check(user_id=(select auth.uid()));
create policy handles_insert on public.saved_handles for insert to authenticated with check(user_id=(select auth.uid()));
create policy handles_update on public.saved_handles for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy handles_delete on public.saved_handles for delete to authenticated using(user_id=(select auth.uid()));
create trigger batch_write before insert on public.generated_batches for each row execute function public.enforce_write();
create trigger handle_write before insert or update or delete on public.saved_handles for each row execute function public.enforce_write();
create or replace function public.record_verification(p_username text,p_status text,p_note text default '') returns jsonb language plpgsql security definer set search_path='' as $$
declare previous text; entry public.handle_verifications; event_id uuid;
begin
 if auth.uid() is null then raise exception 'Authentication required';end if;
 if not public.consume_rate_limit('write') then raise exception 'Rate limit exceeded';end if;
 -- Serialize observations per user/name, including the first insert.
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text||':'||p_username,0));
 select status into previous from public.handle_verifications where user_id=auth.uid() and username=p_username;
 if previous='CLAIMED' and p_status not in ('CLAIMED','NEEDS_RECHECK','UNVERIFIED') then raise exception 'Invalid status transition';end if;
 insert into public.handle_verifications(user_id,username,status,note) values(auth.uid(),p_username,p_status,p_note)
 on conflict(user_id,username) do update set status=excluded.status,note=excluded.note,checked_at=now() returning * into entry;
 insert into public.verification_events(user_id,username,status,method,note) values(auth.uid(),p_username,p_status,'instagram_manual',p_note) returning id into event_id;
 return to_jsonb(entry)||jsonb_build_object('event_id',event_id);
end; $$;
revoke all on function public.consume_rate_limit(text) from public,anon;
revoke all on function public.record_verification(text,text,text) from public,anon;
revoke all on function public.enforce_write() from public,anon,authenticated;
grant execute on function public.consume_rate_limit(text),public.record_verification(text,text,text) to authenticated;
revoke all on public.rate_limit_buckets from anon,authenticated;
revoke all on public.handle_verifications,public.verification_events from anon,authenticated;
grant select on public.handle_verifications,public.verification_events to authenticated;
grant select,insert,update on public.user_profiles to authenticated;
grant select,insert on public.generated_batches to authenticated;
grant select,insert,update,delete on public.saved_handles to authenticated;
commit;
