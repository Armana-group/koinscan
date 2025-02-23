import { Navigation } from "./navigation";
import { Logo } from "./Logo";
import { WalletButton } from "./WalletButton";
import { ThemeToggle } from "./theme-toggle";

export function Navbar() {
  return (
    <div className="bg-background/80 backdrop-blur-sm">
      <div className="container max-w-[980px] mx-auto flex items-center justify-between px-4 h-16">
        <Logo />
        <div className="flex items-center gap-4">
          <Navigation />
          <ThemeToggle />
          <WalletButton />
        </div>
      </div>
    </div>
  );
} 