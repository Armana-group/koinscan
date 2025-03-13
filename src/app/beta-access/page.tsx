"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useWallet } from "@/contexts/WalletContext";
import * as toast from "@/lib/toast";
import { ALLOWED_WALLETS, getNicknameForWallet } from "@/config/beta-access";
import { Logo } from "@/components/Logo";
import { hasWalletAccess, saveBetaAccess } from "@/lib/beta-access";
import { WalletButton } from "@/components/WalletButton";
import { AuroraText } from "@/components/magicui/aurora-text";

export default function BetaAccess() {
  const router = useRouter();
  const { signer } = useWallet();
  const [checking, setChecking] = useState(false);
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const walletAddress = signer?.getAddress();

  // Check if the connected wallet is in the allowlist
  useEffect(() => {
    if (walletAddress) {
      const isAllowed = hasWalletAccess(walletAddress);
      setHasAccess(isAllowed);
      
      if (isAllowed) {
        // Save access state to localStorage and cookie
        saveBetaAccess(walletAddress);
      }
    } else {
      setHasAccess(null);
    }
  }, [walletAddress]);

  // If we have access, redirect to home
  useEffect(() => {
    if (hasAccess) {
      router.push("/");
    }
  }, [hasAccess, router]);

  // When user checks access
  const checkAccess = async () => {
    setChecking(true);
    
    try {
      if (!walletAddress) {
        toast.error("Please connect your wallet first");
        return;
      }
      
      if (hasWalletAccess(walletAddress)) {
        toast.success("Your wallet has beta access!");
        saveBetaAccess(walletAddress);
        setHasAccess(true);
        
        // Redirect after a short delay
        setTimeout(() => {
          router.push("/");
        }, 1500);
      } else {
        toast.error("Your wallet is not on the beta access list");
        setHasAccess(false);
      }
    } catch (error) {
      console.error("Error checking access:", error);
      toast.error("There was an error checking your access");
    } finally {
      setChecking(false);
    }
  };

  return (
    <>
      <div className="flex min-h-screen flex-col bg-background">
        <header className="bg-background/80 backdrop-blur-sm">
          <div className="container mx-auto flex h-16 items-center justify-between px-4">
            <Logo />
            <WalletButton />
          </div>
        </header>
        
        <main className="flex-1 flex items-center justify-center px-4 py-12 -mt-24">
          <div className="w-full max-w-2xl">
            <div className="text-center mb-8">
              <h1 className="text-5xl font-bold tracking-tight text-foreground">
                <AuroraText>Explore the Koinos blockchain</AuroraText>
              </h1>
              <p className="text-xl text-muted-foreground mt-2">
                Search for transactions, blocks, accounts, and smart contracts
              </p>
            </div>

            <Card className="border-none">
              <CardHeader className="text-center">
                <CardTitle className="text-3xl">Early Access</CardTitle>
                <CardDescription className="text-center">
                  This application is currently in closed beta and available by invitation only
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-6 text-center px-6">
                <p className="text-center mx-auto max-w-md">
                  Thank you for your interest in our Koinos Block Explorer! We&apos;re currently in an 
                  early beta phase, and access is limited to invited wallet addresses only.
                </p>
                
                <div className="flex flex-col items-center justify-center mt-8 mb-8">
                  {walletAddress ? (
                    <div className="bg-muted p-4 rounded-md break-all max-w-md mb-4">
                      <p className="text-sm text-muted-foreground mb-1">Connected Wallet:</p>
                      <p className="font-mono">{walletAddress}</p>
                      {getNicknameForWallet(walletAddress) && (
                        <p className="text-sm text-muted-foreground mt-1">
                          <span className="font-medium">{getNicknameForWallet(walletAddress)}</span>
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center mb-4">
                      Connect your wallet to check if you have access
                    </p>
                  )}
                
                  {walletAddress && (
                    <Button 
                      onClick={checkAccess} 
                      disabled={checking || hasAccess === true}
                      className="min-w-[200px]"
                    >
                      {checking ? "Checking..." : hasAccess === true ? "Access Granted!" : "Check Access"}
                    </Button>
                  )}
                </div>
              </CardContent>
              
              <CardFooter className="justify-center text-sm text-muted-foreground">
                <p>Public beta coming soon</p>
              </CardFooter>
            </Card>
          </div>
        </main>
      </div>
    </>
  );
} 