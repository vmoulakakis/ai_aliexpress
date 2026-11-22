import "./globals.css";
import type {Metadata,Viewport} from "next";
export const metadata:Metadata={
 title:"FOUND. EUROPE — AI discovery",
 description:"A country-aware AI discovery experience for specialist products and everyday solutions.",
 applicationName:"FOUND. EUROPE",
 manifest:"/manifest.webmanifest",
 appleWebApp:{capable:true,statusBarStyle:"default",title:"FOUND."},
 icons:{icon:"/icon.svg",apple:"/icon.svg"}
};
export const viewport:Viewport={width:"device-width",initialScale:1,themeColor:"#102037"};
export default function RootLayout({children}:{children:React.ReactNode}){
 return <html lang="en"><body>{children}</body></html>;
}
