-- Keep sub-EUR50 candidates for audit; browse EUR50+ listings by default.
create or replace function public.axi_catalog_read(p_limit integer default 24,p_after bigint default 0,p_problem text default null,p_id text default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;used integer;
begin
 if p_limit not between 1 and 60 or p_after<0 or length(coalesce(p_problem,''))>50
  or (p_id is not null and p_id !~ '^[0-9]{8,20}$') then raise exception 'invalid catalog parameters';end if;
 -- Privileged only; no browser/user role may invoke this RPC.
 if current_setting('request.jwt.claims',true)::jsonb->>'role' is distinct from 'service_role' and session_user<>'postgres' then raise exception 'service only';end if;
 insert into axi.catalog_api_budget(bucket,requests) values(date_trunc('minute',now()),1)
 on conflict(bucket) do update set requests=axi.catalog_api_budget.requests+1 returning requests into used;
 if used>240 then return jsonb_build_object('error','rate_limited');end if;
 with rows as(select * from axi.catalog_projection_v), page as(
  select * from rows where id>p_after and (p_problem is null or p_problem=any(problem_keys))
  and (p_id is null or aliexpress_product_id=p_id) and (p_id is not null or listed_eur>=50) order by id limit p_limit
 ), clusters as(
  select k problem_key,count(distinct r.id) products,count(distinct r.id) filter(where r.listed_eur>=50) eligible
  from rows r cross join lateral unnest(r.problem_keys) k group by k
 )
 select jsonb_build_object('source','axi','country','GR','generated_at',now(),
  'summary',(select jsonb_build_object('products',count(*),'priced',count(*) filter(where listed_eur>0),'eligible',count(*) filter(where listed_eur>=50),
   'classified',count(*) filter(where taxonomy_version is not null),'affiliate_generated',count(*) filter(where affiliate_url is not null),
   'verified',(select count(distinct o.product_id) from axi.decisions d join axi.offers o on o.id=d.offer_id where d.status='VERIFIED'),'taxonomy_version','axi-problem-v1') from rows),
  'clusters',coalesce((select jsonb_agg(to_jsonb(c) order by products desc,problem_key) from clusters c),'[]'::jsonb),
  'items',coalesce((select jsonb_agg(to_jsonb(p) order by id) from page p),'[]'::jsonb),
  'next_cursor',(select max(id) from page),
  'has_more',exists(select 1 from rows where id>(select max(id) from page) and (p_problem is null or p_problem=any(problem_keys)) and (p_id is null or aliexpress_product_id=p_id) and (p_id is not null or listed_eur>=50))) into result;
 return result;
end $$;
revoke all on function public.axi_catalog_read(integer,bigint,text,text) from public,anon,authenticated;
grant execute on function public.axi_catalog_read(integer,bigint,text,text) to service_role;
