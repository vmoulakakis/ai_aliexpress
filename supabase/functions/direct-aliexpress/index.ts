import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import CryptoJS from "npm:crypto-js@4.2.0";

const API_URL=Deno.env.get("ALIEXPRESS_API_URL")||"https://gw.api.taobao.com/router/rest";
const APP_KEY=Deno.env.get("ALIEXPRESS_APP_KEY")||"";
const APP_SECRET=Deno.env.get("ALIEXPRESS_APP_SECRET")||"";
const TRACKING_ID=Deno.env.get("ALIEXPRESS_TRACKING_ID")||"";
const APP_SIGNATURE=Deno.env.get("ALIEXPRESS_APP_SIGNATURE")||"";
const SIGN_METHOD=(Deno.env.get("ALIEXPRESS_SIGN_METHOD")||"hmac").toLowerCase();

const json=(x:unknown,status=200)=>new Response(JSON.stringify(x),{
  status,headers:{"content-type":"application/json","cache-control":"no-store"}
});
function timestamp(){
  const d=new Date(),p=(n:number)=>String(n).padStart(2,"0");
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth()+1)}-${p(d.getUTCDate())} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())}`;
}
function sign(params:Record<string,string>){
  const joined=Object.keys(params).filter(k=>k!=="sign").sort().map(k=>k+params[k]).join("");
  return SIGN_METHOD==="md5"
    ?CryptoJS.MD5(APP_SECRET+joined+APP_SECRET).toString().toUpperCase()
    :CryptoJS.HmacMD5(joined,APP_SECRET).toString().toUpperCase();
}
function deepFind(node:any,key:string):any{
  if(!node||typeof node!=="object")return null;
  if(Object.prototype.hasOwnProperty.call(node,key))return node[key];
  for(const v of Object.values(node)){const h=deepFind(v,key);if(h!==null&&h!==undefined)return h}
  return null;
}
async function top(method:string,business:Record<string,unknown>){
  if(!APP_KEY||!APP_SECRET)throw new Error("aliexpress_credentials_missing");
  const params:Record<string,string>={app_key:APP_KEY,format:"json",method,sign_method:SIGN_METHOD==="md5"?"md5":"hmac",timestamp:timestamp(),v:"2.0"};
  for(const [k,v] of Object.entries(business)){if(v!==undefined&&v!==null&&String(v)!=="")params[k]=String(v)}
  params.sign=sign(params);
  const r=await fetch(API_URL,{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded;charset=utf-8"},body:new URLSearchParams(params)});
  const raw=await r.text(); let data:any;
  try{data=JSON.parse(raw)}catch{throw new Error(`aliexpress_non_json_${r.status}`)}
  const err=deepFind(data,"error_response");
  if(err)throw new Error(`aliexpress_api:${String(err?.sub_msg||err?.msg||err?.code||"unknown").slice(0,400)}`);
  return data;
}
function products(data:any):any[]{
  const p=deepFind(data,"products");
  if(Array.isArray(p))return p;
  if(p&&Array.isArray(p.product))return p.product;
  const one=deepFind(data,"product"); return one?[one]:[];
}
function n(v:any){const x=Number(String(v??"").replace("%","").replace(",","."));return Number.isFinite(x)?x:null}
function mapProduct(x:any){
  const id=String(x.product_id||x.productId||"").trim(),title=String(x.product_title||x.title||"").trim();
  if(!id||!title)return null;
  return {
    product_id:id,product_title:title,
    product_main_image_url:x.product_main_image_url||x.image_url||x.imageUrl||null,
    product_detail_url:x.product_detail_url||x.product_url||x.productUrl||null,
    promotion_link:x.promotion_link||x.promotionLink||null,
    sale_price:n(x.sale_price??x.target_sale_price??x.app_sale_price??x.price),
    original_price:n(x.original_price??x.originalPrice??x.app_original_price),
    commission_rate:x.commission_rate??x.hot_product_commission_rate??x.commissionRate??null,
    evaluate_rate:x.evaluate_rate??x.positive_feedback_rate??x.positiveFeedbackRate??null,
    lastest_volume:x.lastest_volume??x.latest_volume??x.sales??null,
    second_level_category_name:x.second_level_category_name||x.category_name||x.category||null,
    shop_id:x.shop_id??x.shopId??null,shop_url:x.shop_url??x.shopUrl??null,
    ship_to_days:x.ship_to_days??x.delivery_days??x.delivery??null,
    source_payload:x
  };
}
Deno.serve(async req=>{
  if(req.method==="GET")return json({ok:true,service:"direct-aliexpress",configured:Boolean(APP_KEY&&APP_SECRET)});
  if(req.method!=="POST")return json({ok:false,error:"method_not_allowed"},405);
  try{
    const b=await req.json(),action=String(b.action||"");
    if(action==="probe"){
      const checks:any[]=[];
      for(const [name,method,business] of [
        ["product_query","aliexpress.affiliate.product.query",{keywords:String(b.keywords||"thermal camera"),page_no:1,page_size:3,target_currency:"EUR",target_language:"EN",tracking_id:TRACKING_ID||undefined,ship_to_country:"GR",fields:"product_id,product_title,commission_rate,sale_price,target_sale_price,app_sale_price"}],
        ["hotproduct_query","aliexpress.affiliate.hotproduct.query",{keywords:String(b.keywords||"thermal camera"),page_no:1,page_size:3,target_currency:"EUR",target_language:"EN",tracking_id:TRACKING_ID||undefined,ship_to_country:"GR",fields:"product_id,product_title,commission_rate,hot_product_commission_rate,sale_price,target_sale_price,app_sale_price"}]
      ] as any[]){
        try{
          const data=await top(method,{app_signature:APP_SIGNATURE||undefined,...business});
          const mapped=products(data).map(mapProduct).filter(Boolean);
          checks.push({name,ok:true,count:mapped.length,sample:mapped.slice(0,2)});
        }catch(e){checks.push({name,ok:false,error:String(e instanceof Error?e.message:e).slice(0,300)})}
      }
      return json({ok:true,data:{configured:Boolean(APP_KEY&&APP_SECRET),api_url:API_URL,tracking_configured:Boolean(TRACKING_ID),checks}});
    }
    if(action==="search"||action==="hotproducts"){
      const q=String(b.keywords||b.query||"").trim(); if(!q)throw new Error("keywords_required");
      const method=action==="hotproducts"?"aliexpress.affiliate.hotproduct.query":"aliexpress.affiliate.product.query";
      const data=await top(method,{
        app_signature:APP_SIGNATURE||undefined,keywords:q,page_no:Number(b.page||1),
        page_size:Math.min(50,Number(b.page_size||20)),sort:action==="hotproducts"?"LAST_VOLUME_DESC":String(b.sort||"LAST_VOLUME_DESC"),
        target_currency:String(b.currency||"EUR"),target_language:String(b.language||"EN"),
        tracking_id:TRACKING_ID||undefined,ship_to_country:String(b.ship_to||"GR"),
        fields:String(b.fields||"product_id,product_title,product_main_image_url,product_detail_url,commission_rate,hot_product_commission_rate,sale_price,target_sale_price,app_sale_price,original_price,evaluate_rate,lastest_volume,first_level_category_name,second_level_category_name,shop_id,shop_url")
      });
      return json({ok:true,data:{products:products(data).map(mapProduct).filter(Boolean),source:"aliexpress-direct"}});
    }
    if(action==="details"){
      const ids=(Array.isArray(b.product_ids)?b.product_ids:String(b.product_ids||"").split(",")).map((x:any)=>String(x).trim()).filter(Boolean).slice(0,40);
      const data=await top("aliexpress.affiliate.productdetail.get",{product_ids:ids.join(","),target_currency:"EUR",target_language:"EN",tracking_id:TRACKING_ID||undefined,country:"GR"});
      return json({ok:true,data:{products:products(data).map(mapProduct).filter(Boolean),source:"aliexpress-direct"}});
    }
    if(action==="generate_link"){
      const url=String(b.url||"").trim(); if(!url)throw new Error("valid_url_required");
      const data=await top("aliexpress.affiliate.link.generate",{promotion_link_type:0,source_values:url,tracking_id:TRACKING_ID||undefined});
      return json({ok:true,data:{raw:data,source:"aliexpress-direct"}});
    }
    throw new Error("action_not_allowed");
  }catch(e){return json({ok:false,error:String(e instanceof Error?e.message:e)},400)}
});