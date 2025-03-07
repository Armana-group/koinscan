import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import { WalletProvider } from "@/contexts/WalletContext";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-poppins",
});

export const metadata: Metadata = {
  title: "KoinScan - Koinos Block Explorer",
  description: "Explore the Koinos blockchain - transactions, blocks, accounts, and smart contracts",
  icons: {
    icon: [
      { url: '/koinscan-logo.png', sizes: '32x32', type: 'image/png' },
      { url: '/koinscan-logo.svg', type: 'image/svg+xml' }
    ],
    apple: {
      url: '/koinscan-logo.png',
      sizes: '180x180',
      type: 'image/png',
    },
    shortcut: '/koinscan-logo.png',
  }
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${poppins.className} ${poppins.variable}`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <WalletProvider>
            {children}
            <Toaster />
          </WalletProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
