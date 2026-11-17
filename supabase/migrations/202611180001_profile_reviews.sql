begin;

alter table public.handle_verifications drop constraint handle_verifications_method_check;
alter table public.handle_verifications add constraint handle_verifications_method_check
 check (method in ('instagram_manual', 'instagram_profile_manual'));
alter table public.verification_events drop constraint verification_events_method_check;
alter table public.verification_events add constraint verification_events_method_check
 check (method in ('instagram_manual', 'instagram_profile_manual'));

-- Looking at a public profile cannot establish claimability or a successful claim.
alter table public.handle_verifications add constraint profile_observation_status_check
 check (method <> 'instagram_profile_manual' or status in ('REPORTED_UNAVAILABLE', 'RESERVED_OR_UNKNOWN'));
alter table public.verification_events add constraint profile_event_status_check
 check (method <> 'instagram_profile_manual' or status in ('REPORTED_UNAVAILABLE', 'RESERVED_OR_UNKNOWN'));

create function public.record_verification(p_username text, p_status text, p_note text, p_method text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare previous text; entry public.handle_verifications; event_id uuid;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 if not public.consume_rate_limit('write') then raise exception 'Rate limit exceeded'; end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text || ':' || p_username, 0));
 select status into previous from public.handle_verifications where user_id=auth.uid() and username=p_username;
 if previous='CLAIMED' and p_status not in ('CLAIMED','NEEDS_RECHECK','UNVERIFIED') then
  raise exception 'Invalid status transition';
 end if;
 insert into public.handle_verifications(user_id,username,status,note,method)
 values(auth.uid(),p_username,p_status,p_note,p_method)
 on conflict(user_id,username) do update set status=excluded.status,note=excluded.note,method=excluded.method,checked_at=now()
 returning * into entry;
 insert into public.verification_events(user_id,username,status,method,note)
 values(auth.uid(),p_username,p_status,p_method,p_note) returning id into event_id;
 return to_jsonb(entry) || jsonb_build_object('event_id',event_id);
end; $$;
revoke all on function public.record_verification(text,text,text,text) from public,anon;
grant execute on function public.record_verification(text,text,text,text) to authenticated;

-- Preserve the existing three-argument API for older clients and tests.
create or replace function public.record_verification(p_username text,p_status text,p_note text default '')
returns jsonb language sql security invoker set search_path='' as $$
 select public.record_verification(p_username,p_status,p_note,'instagram_manual');
$$;

commit;
