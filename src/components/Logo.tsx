import { useRouter } from "next/navigation";

export function Logo() {
  const router = useRouter();

  return (
    <div
      className="flex items-center cursor-pointer"
      onClick={() => {
        router.push("/");
      }}
    >
      <div className="w-8 h-6 mr-1 bg-[hsl(var(--logo-color-1))]"></div>
      <div className="w-4 h-6 mr-1 bg-[hsl(var(--logo-color-2))]"></div>
      <div className="w-2 h-6 mr-6 bg-[hsl(var(--logo-color-3))]"></div>
    </div>
  );
} 