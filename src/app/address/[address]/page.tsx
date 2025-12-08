"use client";

import { DetailedTransactionHistory } from "@/components/DetailedTransactionHistory";
import { WalletBalances } from "@/components/WalletBalances";
import { Suspense, useState, useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Copy, Check, ExternalLink, Wallet } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useParams } from "next/navigation";

export default function AddressPage() {
  const params = useParams();
  const address = params.address as string;
  const [error, setError] = useState<Error | null>(null);
  const [copied, setCopied] = useState(false);

  const copyAddress = () => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Global error handling
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      // Ignore WalletConnect errors
      if (event.error?.message?.includes('WalletConnect') ||
          event.error?.stack?.includes('walletconnect-koinos-sdk-js')) {
        console.warn('Ignoring WalletConnect error:', event.error);
        event.preventDefault();
        return;
      }

      setError(event.error);
    };

    window.addEventListener('error', handleError);

    return () => {
      window.removeEventListener('error', handleError);
    };
  }, []);

  return (
    <>
      <Navbar />
      <div className="container mx-auto py-6 px-4 mt-6">
        {/* Header Section */}
        <Card className="mb-6 p-6 bg-gradient-to-br from-primary/5 via-transparent to-transparent">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-primary/10 text-primary">
              <Wallet className="h-8 w-8" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold mb-2">Address Details</h1>
              <div className="flex items-center gap-2 flex-wrap">
                <code className="text-sm sm:text-base font-mono text-muted-foreground break-all bg-muted/50 px-2 py-1 rounded">
                  {address}
                </code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={copyAddress}
                  className="h-8 px-2"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* Wallet Balances */}
        <div className="mb-6">
          <Suspense fallback={<Skeleton className="h-36 w-full mb-6" />}>
            <WalletBalances address={address} />
          </Suspense>
        </div>

        {error ? (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              An error occurred while loading transaction history: {error.message}
            </AlertDescription>
          </Alert>
        ) : (
          <Suspense fallback={<AddressPageSkeleton />}>
            <DetailedTransactionHistory address={address} />
          </Suspense>
        )}
      </div>
    </>
  );
}

function AddressPageSkeleton() {
  return (
    <div>
      <Skeleton className="h-12 w-full mb-4" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
} 