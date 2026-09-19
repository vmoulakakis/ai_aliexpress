import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createRemoteJWKSet, jwtVerify } from "npm:jose@6.1.0";

const ISSUER="https://token.actions.githubusercontent.com";
const AUDIENCE="ai-aliexpress-vmdb-worker";
const REPOSITORY_ID="1377347382";
const REPOSITORY="vmoulakakis/ai_aliexpress";
const JWKS=createRemoteJWKSet(new URL(`${ISSUER}/.well-known/jwks`));

const ALLOWED_WORKFLOWS=new Set([
  "vmoulakakis/ai_aliexpress/.github/workflows/agentic-commerce-backend.yml@refs/heads/main",
  "vmoulakakis/ai_aliexpress/.github/workflows/direct-aliexpress-sourcing.yml@refs/heads/main",
]);

const ALLOWED_TABLES=new Set([
  "market_problem_clusters",
  "ai_source_queries","ai_product_candidates","ai_product_offers",
  "ai_demand_signals","ai_demand_forecasts","ai_product_evaluations","ai_promotion_candidates_v"
]);

function json(data:unknown,status=200){
  return new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json"}});
}
async function authorize(req:Request){
  const auth=req.headers.get("authorization")||"";
  if(!auth.startsWith("Bearer "))throw new Error("missing_bearer_token");
  const {payload}=await jwtVerify(auth.slice(7),JWKS,{issuer:ISSUER,audience:AUDIENCE});
  if(String(payload.repository_id||"")!==REPOSITORY_ID)throw new Error("repository_id_not_allowed");
  if(String(payload.repository||"")!==REPOSITORY)throw new Error("repository_not_allowed");
  if(String(payload.ref||"")!=="refs/heads/main")throw new Error("ref_not_allowed");
  if(!ALLOWED_WORKFLOWS.has(String(payload.workflow_ref||"")))throw new Error("workflow_not_allowed");
  return payload;
}
function validateResource(resource:string){
  if(!ALLOWED_TABLES.has(resource))throw new Error("table_not_allowed");
}
Deno.serve(async(req:Request)=>{
  if(req.method==="GET")return json({ok:true,service:"ai-aliexpress-vmdb-worker-gateway",repository:REPOSITORY});
  if(req.method!=="POST")return json({error:"method_not_allowed"},405);
  try{
    await authorize(req);
    const body=await req.json();
    const method=String(body.method||"GET").toUpperCase();
    if(!["GET","POST","PATCH"].includes(method))throw new Error("db_method_not_allowed");
    const resource=String(body.resource||""); validateResource(resource);

    const supabaseUrl=Deno.env.get("SUPABASE_URL");
    const serviceKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if(!supabaseUrl||!serviceKey)throw new Error("supabase_runtime_credentials_missing");

    const url=new URL(`${supabaseUrl}/rest/v1/${resource}`);
    for(const [k,v] of Object.entries(body.params||{})){
      if(v!==undefined&&v!==null)url.searchParams.set(k,String(v));
    }
    const headers:Record<string,string>={
      apikey:serviceKey,authorization:`Bearer ${serviceKey}`,"content-type":"application/json"
    };
    if(body.prefer)headers.prefer=String(body.prefer).slice(0,200);

    const up=await fetch(url,{method,headers,body:method==="GET"?undefined:JSON.stringify(body.data??{})});
    const raw=await up.text();
    let result:any=null;
    if(raw){try{result=JSON.parse(raw)}catch{result=raw}}
    if(!up.ok)return json({error:"upstream_error",status:up.status,detail:result},up.status);
    return json({ok:true,result},up.status);
  }catch(e){
    return json({error:String(e instanceof Error?e.message:e)},401);
  }
});