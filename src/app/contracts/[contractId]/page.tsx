import { Suspense } from "react";
import { use } from "react";
import ContractPageClient from "./ContractPageClient";

export default function ContractPage({
  params,
}: {
  params: Promise<{ contractId: string }>;
}) {
  const resolvedParams = use(params);
  
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ContractPageClient params={resolvedParams} />
    </Suspense>
  );
}
