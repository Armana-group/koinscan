import { Navigation } from "./navigation";
import { Logo } from "./Logo";
import { WalletButton } from "./WalletButton";
import { ThemeToggle } from "./theme-toggle";

export function Navbar() {
  return (
    <div className="bg-background/80 backdrop-blur-sm mt-4">
      <div className="container max-w-[980px] mx-auto flex items-center justify-between px-4 h-16">
        {/* Left side */}
        <div className="w-[120px]">
          <Logo />
        </div>

        {/* Center */}
        <div className="flex-1 flex justify-center">
          <Navigation />
        </div>

        {/* Right side - match width with logo side for symmetry */}
        <div className="w-[120px] flex items-center justify-end gap-2">
          <WalletButton />
          <ThemeToggle />
        </div>
      </div>
    </div>
  );
} 