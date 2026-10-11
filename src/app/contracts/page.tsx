import type { Metadata } from "next";
import { CONTRACT_GROUPS, KNOWN_CONTRACTS } from "@/lib/names";
import { short } from "@/lib/format";
import { pageMetadata } from "@/lib/social-metadata";
import { Group, Lede, Page, Title } from "@/components/ks/Page";
import { GlyphMark, Row } from "@/components/ks/Row";

export const metadata: Metadata = pageMetadata("Contracts | KoinScan", "The contracts that run Koinos, and the ones people use most.");

export default function ContractsPage() {
  return (
    <Page list>
      <Title>Contracts</Title>
      <Lede>The contracts that run Koinos, and the ones people use most. Search any address to open its page.</Lede>
      {CONTRACT_GROUPS.map((group) => (
        <div key={group}>
          <Group>{group}</Group>
          <div className="ks-list">
            {KNOWN_CONTRACTS.filter((c) => c.group === group).map((contract) => (
              <Row
                key={contract.address}
                lead={<GlyphMark glyph={contract.glyph} />}
                title={contract.name}
                detail={contract.description}
                amount={short(contract.address)}
                amountTone="plain"
                href={`/contracts/${contract.slug ?? contract.address}`}
              />
            ))}
          </div>
        </div>
      ))}
    </Page>
  );
}
