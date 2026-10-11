import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Metadata } from "next";
import Markdown from "react-markdown";
import { FOGATA_IMAGE, pageMetadata } from "@/lib/social-metadata";
import { Crumb, Lede, Page, Title } from "@/components/ks/Page";

export const dynamic = "force-static";

export const metadata: Metadata = pageMetadata(
  "Fogata guide | KoinScan",
  "Learn how Koinos mining works and how to deposit, manage rewards, withdraw, and trade with Fogata.",
  FOGATA_IMAGE,
);

// Headings in the guide are plain text. Use the same anchors as Markdown readers.
function headingId(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-");
}

export default async function FogataHelpPage() {
  const guide = await readFile(path.join(process.cwd(), "public", "fogata-guide.md"), "utf8");

  return (
    <Page>
      <Crumb
        back="Fogata"
        backHref="/fogata"
        right={
          <a href="/fogata-guide.md" download="fogata-guide.md">
            Download Markdown ↗
          </a>
        }
      />
      <Title>Fogata guide</Title>
      <Lede>From your first deposit to managing rewards and finding your way out.</Lede>
      <article className="ks-prose" style={{ marginTop: 28 }}>
        <Markdown
          components={{
            h1: () => null,
            h2: ({ children }) => <h2 id={headingId(String(children))}>{children}</h2>,
            h3: ({ children }) => <h3 id={headingId(String(children))}>{children}</h3>,
          }}
        >
          {guide}
        </Markdown>
      </article>
    </Page>
  );
}
