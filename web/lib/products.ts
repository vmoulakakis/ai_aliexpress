export const MARKETPLACE_API = "https://gqpbskssrvpfjtujwezc.supabase.co/functions/v1/marketplace-products";

export type Product = {
  selection_role?: "BEST_FIT"|"BEST_VALUE"|"PRO"|null;
  selection_rank?: number|null;
  selection_confidence?: string|number|null;
  selection_rationale?: any;
  product_candidate_id:string;
  source_product_id:string;
  title:string;
  category:string|null;
  product_url:string|null;
  image_url:string|null;
  price_eur:string|number|null;
  promotion_url:string|null;
  problem_cluster_id:string|null;
  problem_key:string|null;
  problem_title:string|null;
  target_customer:string|null;
  greek_gap_opportunity:string|null;
  greek_gap_confidence:string|number|null;
  sold_count:number|null;
  seller_source_id:string|null;
  product_identity:any;
  pain_feature_map:any[];
  winning_factors:any[];
  dealbreakers:any[];
  pros:any[];
  cons:any[];
  seller_quality:any;
  fulfillment_analysis:any;
  price_value_analysis:any;
  greek_fit_analysis:any;
  conversion_analysis:any;
  audience_personas:any[];
  who_not_for:any[];
  objection_handling:any[];
  evidence_gaps:any[];
  intelligence_confidence:string|number|null;
  primary_keyword:string|null;
  secondary_keywords:any[];
  long_tail_keywords:any[];
  faq_questions:any[];
  title_options:any[];
  meta_description_options:any[];
  content_brief:any;
  seo_confidence:string|number|null;
  fact_count:number;
  media_count:number;
  review_count:number;
  spec_count:number;
  data_completeness:string;
};

export async function getProducts():Promise<Product[]>{
  const r=await fetch(MARKETPLACE_API+"?limit=100",{next:{revalidate:300}});
  if(!r.ok) throw new Error("Marketplace API failed");
  const j=await r.json();
  return j.data||[];
}
export async function getProduct(id:string):Promise<Product|null>{
  const r=await fetch(MARKETPLACE_API+"?id="+encodeURIComponent(id),{next:{revalidate:300}});
  if(!r.ok) return null;
  const j=await r.json();
  return j.data||null;
}
export function n(v:any,f=0){const x=Number(v);return Number.isFinite(x)?x:f}
export function money(v:any){return new Intl.NumberFormat("el-GR",{style:"currency",currency:"EUR",maximumFractionDigits:0}).format(n(v))}
export function compactTitle(s:string,max=78){return s.length<=max?s:s.slice(0,max-1).trim()+"…"}
