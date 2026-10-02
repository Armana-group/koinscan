import { cardSize, renderFogataCard } from "@/lib/social-card";

export const alt = "Fogata mining pools on KoinScan";
export const size = cardSize;
export const contentType = "image/png";

export default function FogataImage() {
  return renderFogataCard({
    headline: "Fogata",
    detail: "Stake KOIN and earn block rewards.",
    footer: "Koinos mining pools · No node needed",
  });
}
