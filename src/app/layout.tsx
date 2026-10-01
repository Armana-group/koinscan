import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import { WalletProvider } from "@/contexts/WalletContext";
import { SearchProvider } from "@/components/SearchProvider";
import { Footer } from "@/components/Footer";
import { pageMetadata, SITE_DESCRIPTION, SITE_TITLE } from "@/lib/social-metadata";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-poppins",
});

// The default card image comes from src/app/opengraph-image.tsx.
export const metadata: Metadata = {
  metadataBase: new URL("https://koinscan.com"),
  ...pageMetadata(SITE_TITLE, SITE_DESCRIPTION),
  manifest: "/manifest.json",
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
