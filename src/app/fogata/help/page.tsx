import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Metadata } from "next";
import Link from "next/link";
import Markdown from "react-markdown";
import { backLink, pageTitle, quietLink } from "@/components/fogata/styles";
import { FOGATA_IMAGE, pageMetadata } from "@/lib/social-metadata";
import styles from "./guide.module.css";

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
    <div className="mx-auto w-full max-w-[1080px] px-5 py-10">
      <Link href="/fogata" className={backLink}>‹ Fogata</Link>
      <div className="flex flex-wrap items-start justify-between gap-5 border-b border-border pb-7">
        <div>
          <h1 className={pageTitle}>Fogata guide</h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
            From your first deposit to managing rewards and finding your way out.
          </p>
        </div>
        <a href="/fogata-guide.md" download="fogata-guide.md" className={`${quietLink} text-sm`}>
          Download Markdown ↗
        </a>
      </div>
      <article className={`${styles.content} mt-7 max-w-[740px] break-words text-sm leading-7 text-muted-foreground [&_h2]:mb-4 [&_h2]:mt-12 [&_h2]:border-t [&_h2]:border-border [&_h2]:pt-7 [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:leading-tight [&_h2]:tracking-tight [&_h2]:text-foreground [&_h3]:mb-3 [&_h3]:mt-7 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-foreground [&_p]:my-4 [&_ul]:my-4 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5 [&_ol]:my-4 [&_ol]:list-decimal [&_ol]:space-y-2 [&_ol]:pl-5 [&_strong]:font-medium [&_strong]:text-foreground [&_a]:text-foreground [&_a]:underline [&_a]:decoration-border [&_a]:underline-offset-4 hover:[&_a]:decoration-foreground [&_blockquote]:border-l-2 [&_blockquote]:border-brand [&_blockquote]:pl-4 [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_pre]:overflow-x-auto [&_pre]:rounded-xl [&_pre]:bg-muted [&_pre]:p-4`}>
        <Markdown components={{
          h1: () => null,
          h2: ({ children }) => <h2 id={headingId(String(children))}>{children}</h2>,
          h3: ({ children }) => <h3 id={headingId(String(children))}>{children}</h3>,
        }}>{guide}</Markdown>
      </article>
    </div>
  );
}
