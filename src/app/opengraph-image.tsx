import { cardSize, renderCard } from "@/lib/social-card";

export const alt = "KoinScan, the Koinos block explorer";
export const size = cardSize;
export const contentType = "image/png";

export default function OpengraphImage() {
  return renderCard({
    headline: "KoinScan",
    detail: "The Koinos block explorer",
    footer: "Transactions · Blocks · Accounts · Contracts",
  });
}
