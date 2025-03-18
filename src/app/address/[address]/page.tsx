"use client";

import { DetailedTransactionHistory } from "@/components/DetailedTransactionHistory";
import { WalletBalances } from "@/components/WalletBalances";
import { Suspense, useState, useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { Navbar } from "@/components/Navbar";

interface AddressPageProps {
  params: {
    address: string;
  };
}

export default function AddressPage({ params }: AddressPageProps) {
  const { address } = params;
  const [error, setError] = useState<Error | null>(null);
  
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
      <div className="container mx-auto py-4 px-4 mt-10">
        <h1 className="text-2xl sm:text-2xl font-bold mb-2">Address Details</h1>
        <h2 className="text-sm sm:text-base md:text-xl font-medium text-muted-foreground mb-4 sm:mb-8 break-all">
          {address}
        </h2>
        
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