import type {MetadataRoute} from "next";
export default function manifest():MetadataRoute.Manifest{
 return {id:"/",name:"FOUND. EUROPE — AI Discovery",short_name:"FOUND.",description:"Discover better solutions with AXI, your country-aware AI discovery assistant.",start_url:"/",scope:"/",display:"standalone",background_color:"#f5f5ee",theme_color:"#102037",lang:"en",icons:[{src:"/icon.svg",sizes:"any",type:"image/svg+xml",purpose:"any"},{src:"/icon-maskable.svg",sizes:"any",type:"image/svg+xml",purpose:"maskable"}]};
}
