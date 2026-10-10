import { cardSize, renderCard } from "@/lib/social-card";

export const alt = "KoinScan: explore, mine and trade on Koinos";
export const size = cardSize;
export const contentType = "image/png";

export default function OpengraphImage() {
  return renderCard({
    headline: "KoinScan",
    detail: "Explore, mine and trade on Koinos",
    footer: "Blocks · Accounts · Contracts · Mining pools",
  });
}
