import type {Product} from "./products";

export type SiteDirection={
  archetype:"INVISIBLE_PROBLEM_SOLVER"|"MONEY_SAVER"|"PROFESSIONAL_EDGE"|"REMOTE_CONTROL"|"NOVELTY_DISCOVERY"|"TRANSFORMATION_PRODUCT";
  theme:"cinematic-dark"|"data-art"|"neo-industrial"|"connected-calm"|"editorial-light";
  trigger:string;
  interaction:string;
  heroHook:string;
  heroSubhead:string;
  primaryCta:string;
  cardHook:string;
  funnel:string[];
};

const hay=(p:Product)=>[
  p.title,p.category,p.problem_title,p.problem_category,p.problem_subcategory,p.target_customer,
  p.primary_keyword,...(p.secondary_keywords||[]),...(p.long_tail_keywords||[])
].filter(Boolean).join(" ").toLowerCase();

const has=(s:string,words:string[])=>words.some(w=>s.includes(w));

export function directProduct(p:Product):SiteDirection{
  const s=hay(p);
  const pain=p.problem_title||"ένα πρόβλημα που κοστίζει χρόνο ή χρήμα";
  const price=Number(p.price_eur||0);

  if(has(s,["thermal","leak","moisture","detector","diagnostic","inspection","sensor","hotspot"])){
    return {
      archetype:"INVISIBLE_PROBLEM_SOLVER",theme:"cinematic-dark",trigger:"AVOID_DAMAGE",interaction:"problem_reveal_scan",
      heroHook:"Δες το πρόβλημα πριν γίνει ζημιά.",
      heroSubhead:`Το ${p.title} συνδέεται με το pain «${pain}». Δες πρώτα τι μπορεί να αποκαλύψει, μετά έλεγξε αν τα evidence και τα οικονομικά δικαιολογούν την αγορά.`,
      primaryCta:"Δες την τρέχουσα τιμή ↗",
      cardHook:"Κάνε ορατό αυτό που συνήθως μένει κρυφό.",
      funnel:["Problem reveal","Cost of inaction","How it works","Personal ROI","Proof","Counter-evidence","Current offer"]
    };
  }
  if(has(s,["energy","power","electricity","consumption","saving","efficiency","solar","metering"])){
    return {
      archetype:"MONEY_SAVER",theme:"data-art",trigger:"SAVE_MONEY",interaction:"live_roi_payback",
      heroHook:"Βρες πού φεύγουν τα χρήματα — και αν αυτή η λύση αποσβένεται.",
      heroSubhead:`Η αξία δεν είναι το gadget. Είναι αν μπορεί να μειώσει μετρήσιμα το κόστος πίσω από το «${pain}».`,
      primaryCta:"Έλεγξε την τρέχουσα προσφορά ↗",
      cardHook:"Μέτρα το κόστος πριν αγοράσεις τη λύση.",
      funnel:["Cost signal","Solution","ROI / payback","Greece comparison","Proof","Current offer"]
    };
  }
  if(has(s,["workshop","automotive","construction","industrial","professional","tester","scope","analyzer","scanner"])){
    return {
      archetype:"PROFESSIONAL_EDGE",theme:"neo-industrial",trigger:"PROFESSIONAL_ADVANTAGE",interaction:"annotated_product_explorer",
      heroHook:"Φέρε specialist capability στη δική σου δουλειά.",
      heroSubhead:`Για το «${pain}», το ζητούμενο είναι αν το εργαλείο προσθέτει πραγματική διαγνωστική ή παραγωγική ικανότητα — όχι αν απλώς έχει πολλά specs.`,
      primaryCta:"Δες listing & specs ↗",
      cardHook:"Professional capability, χωρίς περιττό showroom.",
      funnel:["Use case","Mechanism","Specs that matter","Workflow value","ROI","Proof","Current offer"]
    };
  }
  if(has(s,["remote","wifi","gps","tracking","alarm","property","monitoring"])){
    return {
      archetype:"REMOTE_CONTROL",theme:"connected-calm",trigger:"GAIN_CONTROL",interaction:"remote_status_simulation",
      heroHook:"Να ξέρεις τι συμβαίνει, ακόμη κι όταν δεν είσαι εκεί.",
      heroSubhead:`Η αξία αυτής της λύσης είναι ο έλεγχος γύρω από το «${pain}»: ειδοποίηση, παρακολούθηση ή επέμβαση από απόσταση.`,
      primaryCta:"Έλεγξε τιμή / διαθεσιμότητα ↗",
      cardHook:"Έλεγχος από απόσταση, χωρίς να μαντεύεις.",
      funnel:["Distance scenario","Control","Reliability","Proof","Current offer"]
    };
  }
  if(has(s,["clean","repair","upgrade","restore","lighting","home"])){
    return {
      archetype:"TRANSFORMATION_PRODUCT",theme:"editorial-light",trigger:"TRANSFORMATION",interaction:"before_after",
      heroHook:"Δες τη διαφορά πριν δεις τα χαρακτηριστικά.",
      heroSubhead:`Ξεκινάμε από το αποτέλεσμα που υπόσχεται να επηρεάσει στο «${pain}» και μετά ελέγχουμε αν το προϊόν, η τιμή και το evidence στέκουν.`,
      primaryCta:"Δες την τρέχουσα προσφορά ↗",
      cardHook:"Από το πρόβλημα στο ορατό αποτέλεσμα.",
      funnel:["Before","After","How it works","Proof","Greece comparison","Current offer"]
    };
  }
  return {
    archetype:"NOVELTY_DISCOVERY",theme:"editorial-light",trigger:"CURIOSITY",interaction:"product_theatre_reveal",
    heroHook:"Δεν ήξερες ότι υπάρχει λύση γι’ αυτό.",
    heroSubhead:`Το προϊόν μπαίνει εδώ επειδή συνδέεται με το «${pain}». Πρώτα βλέπεις τι αλλάζει για σένα και μετά την τεχνική λεπτομέρεια.`,
    primaryCta:price>0?"Δες την τρέχουσα τιμή ↗":"Δες το listing ↗",
    cardHook:"Μια λύση που πιθανόν δεν θα έψαχνες με το όνομά της.",
    funnel:["Surprise","Capability","Product","Proof","Price context","Current offer"]
  };
}

export function affiliateHref(p:Product){
  return p.promotion_url||p.product_url||"#";
}
