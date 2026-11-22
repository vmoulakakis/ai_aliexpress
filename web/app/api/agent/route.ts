import {NextRequest,NextResponse} from "next/server";
import {getMarketplaceData,type Product} from "../../../lib/products";

export const runtime="nodejs";
export const dynamic="force-dynamic";
const MAX_MESSAGES=6;
type Message={role:"user"|"assistant";content:string};
const normalize=(s:string)=>s.toLocaleLowerCase("el-GR").normalize("NFD").replace(/[\u0300-\u036f]/g,"");
const json=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{"cache-control":"no-store","x-content-type-options":"nosniff"}});
function safeMessages(input:unknown):Message[]|null{
  if(!Array.isArray(input)||input.length<1||input.length>MAX_MESSAGES)return null;
  if(!input.every(m=>m&&["user","assistant"].includes(m.role)&&typeof m.content==="string"&&m.content.trim().length>0&&m.content.length<=750))return null;
  if(input[input.length-1].role!=="user")return null;
  return input.map(m=>({role:m.role,content:m.content.trim()}));
}
function relevant(products:Product[],question:string){
 const tokens=normalize(question).split(/[^\p{L}\p{N}]+/u).filter(t=>t.length>=3).slice(0,18);
 const seen=new Set<string>();
 return products.map(p=>{
   const text=normalize([p.title,p.problem_title,p.problem_category,p.problem_subcategory,p.target_customer,p.primary_keyword].filter(Boolean).join(" "));
   const score=tokens.reduce((v,t)=>v+(text.includes(t)?1:0),0);
   return {p,score};
 }).filter(x=>x.p.source_product_id&&x.p.title).sort((a,b)=>b.score-a.score)
 .filter(x=>{if(seen.has(x.p.source_product_id))return false;seen.add(x.p.source_product_id);return true;}).slice(0,35);
}
export async function GET(){
 return json({service:"gap-hunter-agent",mode:process.env.GAP_AGENT_API_KEY?"configured":"not_configured",tools:["catalog_search","product_evidence"],status:"ready_for_configuration"});
}
export async function POST(req:NextRequest){
 const ct=req.headers.get("content-type")||"";
 if(!ct.includes("application/json"))return json({error:"invalid_content_type"},415);
 const size=Number(req.headers.get("content-length")||0);
 if(size>7000)return json({error:"payload_too_large"},413);
 let body:unknown;
 try{const raw=await req.text();if(raw.length>7000)return json({error:"payload_too_large"},413);body=JSON.parse(raw);}
 catch{return json({error:"invalid_json"},400);}
 const messages=safeMessages((body as {messages?:unknown})?.messages);
 if(!messages)return json({error:"invalid_messages"},400);
 const apiKey=process.env.GAP_AGENT_API_KEY;
 if(!apiKey){
  try{
   const edge=await fetch("https://gqpbskssrvpfjtujwezc.supabase.co/functions/v1/ai-gap-public-consultant",{
     method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({messages}),signal:AbortSignal.timeout(30000)
   });
   const output=await edge.json();
   if(!edge.ok)return json({error:output.error||"agent_unavailable",message:output.message||"Η υπηρεσία AI δεν είναι διαθέσιμη."},edge.status);
   return json(output);
  }catch{return json({error:"edge_agent_unavailable",message:"Ο AI agent δεν είναι διαθέσιμος αυτή τη στιγμή."},503);}
 }
 const endpoint=process.env.GAP_AGENT_BASE_URL||"https://api.deepseek.com";
 if(!["https://api.deepseek.com","https://api.openai.com"].includes(endpoint))return json({error:"provider_not_supported"},503);
 try{
  const source=await getMarketplaceData();
  const user=messages[messages.length-1].content;
  const candidates=relevant(source.products,user);
  const data=candidates.map(({p,score})=>({
    id:p.source_product_id,title:p.title,pain:p.problem_title||null,category:p.problem_category||p.category,
    price_eur:p.price_eur,shop_url:p.promotion_url||p.product_url||null,rank_score:score,
    availability_gr:"unverified",commission_eur:"unverified",greek_exclusivity:"unverified",eu_compliance:"unverified"
  }));
  const prompt=[
    "Είσαι πραγματικός AI problem-solving shopping consultant για την Ελλάδα, όχι απλή μηχανή αναζήτησης.",
    "Απάντησε στα Ελληνικά, εκτός εάν ο επισκέπτης γράφει στα Αγγλικά.",
    "Κάνε μία σύντομη ουσιαστική ερώτηση όταν το πρόβλημα είναι ασαφές. Αλλιώς σύγκρινε με ακρίβεια τις σχετικές λύσεις.",
    "Χρησιμοποίησε αποκλειστικά τα παρακάτω πραγματικά catalogue entries. Μην επινοείς SKUs, τιμές, reviews, commissions, στοιχεία συμμόρφωσης, ελληνική σπανιότητα ή ενεργή διαθεσιμότητα.",
    "Η κατάταξη/απόφαση δεν πρέπει να βασίζεται στην affiliate προμήθεια.",
    "Αν το catalogue δεν περιέχει κατάλληλη λύση, πες το ξεκάθαρα και ζήτησε μία συγκεκριμένη διευκρίνιση.",
    "Απόφυγε οριστική διατύπωση ότι κάποια λύση είναι ασφαλής, διαθέσιμη ή αποκλειστική χωρίς αποδείξεις.",
    "Επέστρεψε μόνο JSON object με answer (string <=1200 chars), follow_up (string <=170 chars ή null), product_ids (array έως 3, μόνο ids από τα δεδομένα), and reasoning_summary (short string).",
    "CATALOGUE_TOOL_RESULT:"+JSON.stringify(data).slice(0,18000)
  ].join("\n");
  const r=await fetch(endpoint+"/chat/completions",{
    method:"POST",headers:{"authorization":"Bearer "+apiKey,"content-type":"application/json"},
    body:JSON.stringify({model:process.env.GAP_AGENT_MODEL||"deepseek-chat",temperature:0.25,max_tokens:800,response_format:{type:"json_object"},
      messages:[{role:"system",content:prompt},...messages]}),signal:AbortSignal.timeout(22000)
  });
  if(!r.ok)return json({error:"model_unavailable",message:"Ο AI provider δεν απάντησε. Προσπάθησε ξανά."},503);
  const response=await r.json();
  const raw=response?.choices?.[0]?.message?.content;
  if(typeof raw!=="string")throw new Error("invalid_model_result");
  const parsed=JSON.parse(raw);
  if(typeof parsed.answer!=="string"||!parsed.answer.trim())throw new Error("invalid_answer");
  const allowed=new Map(candidates.map(x=>[x.p.source_product_id,x.p]));
  const ids=Array.isArray(parsed.product_ids)?parsed.product_ids.filter((id:unknown)=>typeof id==="string"&&allowed.has(id)).slice(0,3):[];
  const products=ids.map((id:string)=>{const p=allowed.get(id)!;return {id,title:p.title,image_url:p.image_url,price_eur:p.price_eur,category:p.problem_category||p.category,url:"/product/"+encodeURIComponent(id),verified:false};});
  return json({answer:parsed.answer.slice(0,1400),follow_up:typeof parsed.follow_up==="string"?parsed.follow_up.slice(0,200):null,
    products,mode:"llm_grounded_tool_search",evidence:{catalogue_examined:candidates.length,verification:"Product claims not independently verified"}});
 }catch{return json({error:"agent_temporarily_unavailable",message:"Δεν ήταν δυνατή η ασφαλής απάντηση του AI agent. Δοκίμασε ξανά."},503);}
}
