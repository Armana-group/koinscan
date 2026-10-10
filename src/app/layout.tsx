import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { WalletProvider } from "@/contexts/WalletContext";
import { ChromeProvider } from "@/components/chrome/ChromeProvider";
import { NamesProvider } from "@/components/chrome/NamesProvider";
import { Header } from "@/components/chrome/Header";
import { MenuCard } from "@/components/chrome/MenuCard";
import { SearchCard } from "@/components/chrome/SearchCard";
import { WalletSheet } from "@/components/chrome/WalletSheet";
import { Veil } from "@/components/chrome/Veil";
import { Glow } from "@/components/chrome/Glow";
import { pageMetadata, SITE_DESCRIPTION, SITE_TITLE } from "@/lib/social-metadata";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-poppins",
  display: "swap",
});

// One of the three logo colours, picked once per visit and kept for the whole
// session so it doesn't change on every page. Gold gets dark text for contrast.
const ACCENT_SCRIPT = `(function(){var p=[['#e05252','#fff'],['#e4b80c','#16121c'],['#522fe3','#fff']];var i;try{i=Number(sessionStorage.getItem('koinscan-accent'))}catch(e){}if(!(i>=0&&i<p.length)){i=Math.floor(Math.random()*p.length);try{sessionStorage.setItem('koinscan-accent',String(i))}catch(e){}}var s=document.documentElement.style;s.setProperty('--tint',p[i][0]);s.setProperty('--on-tint',p[i][1]);})();`;

// The default card image comes from src/app/opengraph-image.tsx.
export const metadata: Metadata = {
  metadataBase: new URL("https://koinscan.com"),
  ...pageMetadata(SITE_TITLE, SITE_DESCRIPTION),
  manifest: "/manifest.json",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${poppins.className} ${poppins.variable}`}>
        <Script id="koinscan-accent" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: ACCENT_SCRIPT }} />
        <WalletProvider>
          <NamesProvider>
            <ChromeProvider>
              <Glow />
              <Veil />
              <SearchCard />
              <MenuCard />
              <WalletSheet />
              <div className="ks-page">
                <Header />
                <main className="flex flex-1 flex-col">{children}</main>
              </div>
              <Toaster />
            </ChromeProvider>
          </NamesProvider>
        </WalletProvider>
      </body>
    </html>
  );
}
