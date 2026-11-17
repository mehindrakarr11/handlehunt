begin;
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000001';
insert into public.saved_handles(user_id,username,candidate) values(auth.uid(), 'lume','{"username":"lume","length":4,"score":80,"label":"Coined name","origin":"balanced"}' );
select public.record_verification('lume','REPORTED_AVAILABLE','manual observation');
select public.record_verification('lume','CLAIMED','claimed by user');
do $$begin
 if (select count(*) from public.saved_handles)<>1 then raise exception 'Own saved data inaccessible';end if;
 if (select count(*) from public.verification_events)<>2 then raise exception 'History not appended';end if;
 begin perform public.record_verification('lume','REPORTED_UNAVAILABLE','');raise exception 'Claimed transition accepted';exception when raise_exception then if SQLERRM not like '%transition%' then raise;end if;end;
 begin insert into public.saved_handles(user_id,username,candidate)values('00000000-0000-0000-0000-000000000002', 'nova','{"username":"nova","length":4,"score":80,"label":"Coined name","origin":"balanced"}' );raise exception 'Cross-owner insert accepted';exception when insufficient_privilege then null;when raise_exception then if SQLERRM<>'Ownership denied' then raise;end if;end;
 begin insert into public.saved_handles(user_id,username,candidate)values(auth.uid(), 'lume','{"username":"lume","length":4,"score":80,"label":"Coined name","origin":"balanced"}' );raise exception 'Duplicate accepted';exception when unique_violation then null;end;
 begin update public.verification_events set note='tampered';raise exception 'History mutable';exception when insufficient_privilege then null;end;
end$$;
select public.record_verification('lume','NEEDS_RECHECK','');
select public.record_verification('lume','RESERVED_OR_UNKNOWN','');
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000002';
do $$declare n integer;begin
 if (select count(*) from public.saved_handles)<>0 then raise exception 'Another user can read handles';end if;
 if (select count(*) from public.handle_verifications)<>0 then raise exception 'Another user can read checks';end if;
 if (select count(*) from public.verification_events)<>0 then raise exception 'Another user can read history';end if;
 delete from public.saved_handles where username='lume';get diagnostics n=row_count;if n<>0 then raise exception 'Another user can delete handles';end if;
 if not public.consume_rate_limit('generate') then raise exception 'Initial generation limited';end if;
 for i in 2..30 loop if not public.consume_rate_limit('generate') then raise exception 'Early limit';end if;end loop;
 if public.consume_rate_limit('generate') then raise exception 'Rate limit not enforced';end if;
end$$;
set local request.jwt.claim.sub='';
do $$begin
 if public.consume_rate_limit('write') then raise exception 'Anonymous rate limit accepted';end if;
 begin perform public.record_verification('nova','CLAIMED','');raise exception 'Anonymous write accepted';exception when raise_exception then if SQLERRM<>'Authentication required' then raise;end if;end;
end$$;
reset role;
rollback;
select 'PASS: ownership, history, duplicates, transitions and atomic rate limits' as result;
