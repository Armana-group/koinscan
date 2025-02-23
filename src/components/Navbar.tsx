import { Navigation } from "./navigation";
import { Logo } from "./Logo";
import { WalletButton } from "./WalletButton";

export function Navbar() {
  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border">
      <div className="container max-w-[980px] mx-auto flex items-center justify-between px-4 h-16">
        <Logo />
        <div className="flex items-center gap-4">
          <Navigation />
          <WalletButton />
        </div>
      </div>
    </div>
  );
} 