import type { Metadata } from "next";
import Link from "next/link";
import { changelogEntries } from "@/content/changelog";
import { pageMetadata } from "@/lib/social-metadata";
import { Lede, Page, Title } from "@/components/ks/Page";

export const metadata: Metadata = pageMetadata("Changelog | KoinScan", "A public record of improvements to the KoinScan block explorer.");

export default function ChangelogPage() {
  return (
    <Page>
      <Title>Changelog</Title>
      <Lede>What changed, and why it matters. A public record of improvements to KoinScan&apos;s accuracy, reliability and coverage.</Lede>
      <div style={{ marginTop: 48 }}>
        {changelogEntries.map((entry) => (
          <article key={`${entry.date}-${entry.commits.join("-")}`} className="ks-entry">
            <time dateTime={entry.date}>{entry.displayDate}</time>
            <h2>{entry.title}</h2>
            <p className="ks-sum">{entry.summary}</p>
            <ul>
              {entry.changes.map((change) => (
                <li key={change}>{change}</li>
              ))}
            </ul>
            <p className="ks-meta">
              <span>
                {entry.contributors.length === 1 ? "By" : "By"} {entry.contributors.join(", ")}
              </span>
              {entry.commits.map((commit) => (
                <Link key={commit} href={`https://github.com/Armana-group/koinscan/commit/${commit}`} target="_blank" rel="noopener noreferrer">
                  {commit}
                </Link>
              ))}
            </p>
          </article>
        ))}
      </div>
    </Page>
  );
}
