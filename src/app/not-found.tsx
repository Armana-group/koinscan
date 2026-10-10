import Link from "next/link";
import { Lede, Page, Title } from "@/components/ks/Page";

export default function NotFound() {
  return (
    <Page>
      <Title>Nothing here</Title>
      <Lede>This page does not exist. Try a search, or start again from the home page.</Lede>
      <div className="ks-actions">
        <Link href="/" className="ks-btn ghost">
          Home
        </Link>
      </div>
    </Page>
  );
}
