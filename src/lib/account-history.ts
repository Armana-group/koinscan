export function getTotalTransactionCount(
  newestSequenceNumber?: string,
): number | null {
  if (!newestSequenceNumber || !/^\d+$/.test(newestSequenceNumber)) return null;

  const sequenceNumber = Number(newestSequenceNumber);
  if (!Number.isSafeInteger(sequenceNumber)) return null;

  return sequenceNumber + 1;
}
