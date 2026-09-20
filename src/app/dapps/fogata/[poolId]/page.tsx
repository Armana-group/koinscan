import { redirect } from "next/navigation";

export default async function DappsPoolRedirect({
  params,
}: {
  params: Promise<{ poolId: string }>;
}) {
  const { poolId } = await params;
  redirect(`/fogata/${poolId}`);
}
