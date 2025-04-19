import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import { WalletProvider } from "@/contexts/WalletContext";
import { SearchProvider } from "@/components/SearchProvider";
import { Footer } from "@/components/Footer";
import { BetaBanner } from "@/components/BetaBanner";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-poppins",
});

export const metadata: Metadata = {
  title: "KoinScan - Koinos Block Explorer",
  description: "Explore the Koinos blockchain - transactions, blocks, accounts, and smart contracts",
  manifest: "/manifest.json"
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${poppins.className} ${poppins.variable} h-[100dvh] flex flex-col overflow-hidden`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <WalletProvider>
            <SearchProvider>
              <main className="flex-1 overflow-auto">
                <div className="container mx-auto px-4 pt-4">
                  <BetaBanner />
                </div>
                {children}
              </main>
              <Footer />
              <Toaster />
            </SearchProvider>
          </WalletProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
