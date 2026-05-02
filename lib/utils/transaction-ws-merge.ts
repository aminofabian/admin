/**
 * When merging websocket (or polling) snapshots into an existing transaction row,
 * a shorter follow-up payload must not overwrite a longer description/remarks already
 * loaded from REST — e.g. list APIs include "… | Payment images: …" while WS may send only the prefix.
 */
export function mergeTransactionTextSnapshot(
  existing: string | null | undefined,
  incoming: string | null | undefined,
): string {
  const ex = typeof existing === 'string' ? existing.trim() : '';
  const inc = typeof incoming === 'string' ? incoming.trim() : '';
  if (!inc) return ex;
  if (!ex) return inc;
  if (ex.includes(inc)) return ex;
  if (inc.includes(ex)) return inc;
  return inc.length >= ex.length ? inc : ex;
}
