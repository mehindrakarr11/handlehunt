begin;
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000001';
select public.record_verification('lume','REPORTED_UNAVAILABLE','Exact profile exists','instagram_profile_manual');
select public.record_verification('nova','RESERVED_OR_UNKNOWN','Login wall; no conclusion','instagram_profile_manual');
do $$begin
 if not exists(select 1 from public.handle_verifications where username='lume' and method='instagram_profile_manual' and status='REPORTED_UNAVAILABLE') then raise exception 'Profile source lost'; end if;
 if not exists(select 1 from public.verification_events where username='nova' and method='instagram_profile_manual' and status='RESERVED_OR_UNKNOWN') then raise exception 'Unknown event lost'; end if;
 begin perform public.record_verification('nova','REPORTED_AVAILABLE','','instagram_profile_manual');raise exception 'Profile accepted as availability evidence';exception when check_violation then null;end;
 begin perform public.record_verification('nova','CLAIMED','','instagram_profile_manual');raise exception 'Profile accepted as claim evidence';exception when check_violation then null;end;
 begin perform public.record_verification('nova','REPORTED_UNAVAILABLE','','automated_scrape');raise exception 'Unsupported method accepted';exception when check_violation then null;end;
 if (select count(*) from public.verification_events)<>2 then raise exception 'Invalid observations added events';end if;
 if (select status from public.handle_verifications where username='nova')<>'RESERVED_OR_UNKNOWN' then raise exception 'Invalid observation changed latest status';end if;
end$$;
-- Existing clients can still send three arguments. The current source must update too.
select public.record_verification('nova','REPORTED_AVAILABLE','Tested in username editor');
do $$begin
 if not exists(select 1 from public.handle_verifications where username='nova' and method='instagram_manual' and status='REPORTED_AVAILABLE') then raise exception 'Legacy RPC or method update broken';end if;
 if (select count(*) from public.verification_events where username='nova')<>2 then raise exception 'Previous profile event lost';end if;
end$$;
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000002';
do $$begin
 if exists(select 1 from public.handle_verifications) or exists(select 1 from public.verification_events) then raise exception 'Cross-user profile observation access';end if;
end$$;
set local request.jwt.claim.sub='';
do $$begin
 begin perform public.record_verification('lume','REPORTED_UNAVAILABLE','','instagram_profile_manual');raise exception 'Anonymous profile write accepted';exception when raise_exception then if SQLERRM<>'Authentication required' then raise;end if;end;
end$$;
reset role;
rollback;
select 'PASS: profile methods, honest status constraints, atomic history, legacy RPC and ownership' as result;
