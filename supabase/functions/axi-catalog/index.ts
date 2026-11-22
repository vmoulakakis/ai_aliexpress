// Read-only AXI projection. Platform verifies caller JWT; service role stays here.
const json = (body: unknown, status=200) => new Response(JSON.stringify(body), {
 status, headers:{'content-type':'application/json','cache-control':status===200?'public, max-age=60':'no-store','x-content-type-options':'nosniff'}
});
Deno.serve(async (req: Request) => {
 if(req.method!=='GET') return json({error:'method_not_allowed'},405);
 const u=new URL(req.url);
 if([...u.searchParams.keys()].some(k=>!['limit','after','problem','id'].includes(k)))return json({error:'invalid_parameters'},400);
 const limit=Number(u.searchParams.get('limit')||24), after=Number(u.searchParams.get('after')||0);
 const problem=u.searchParams.get('problem'),id=u.searchParams.get('id');
 if(!Number.isInteger(limit)||limit<1||limit>60||!Number.isSafeInteger(after)||after<0||
  (problem!==null&&!/^[a-z-]{1,50}$/.test(problem))||(id!==null&&!/^\d{8,20}$/.test(id)))return json({error:'invalid_parameters'},400);
 try{
  const key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const r=await fetch(Deno.env.get('SUPABASE_URL')+'/rest/v1/rpc/axi_catalog_read',{
   method:'POST',headers:{authorization:'Bearer '+key,apikey:key,'content-type':'application/json'},
   body:JSON.stringify({p_limit:limit,p_after:after,p_problem:problem,p_id:id}),signal:AbortSignal.timeout(12000)
  });
  if(!r.ok)return json({error:'catalog_unavailable'},503);
  const data=await r.json();
  if(data?.error==='rate_limited')return json({error:'rate_limited'},429);
  return json(data);
 }catch{return json({error:'catalog_unavailable'},503);}
});
