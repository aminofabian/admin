export type AdjacentDirection = 'previous' | 'next';

export type AdjacentPlayerResult =
  | { status: 'ok'; id: number }
  | { status: 'end' }
  | { status: 'not-in-list' };

/**
 * Pick the neighbour of `currentId` following the order the players list returns,
 * so Prev/Next match the rows an admin sees rather than raw id ordering.
 */
export function pickAdjacentPlayerId(
  orderedIds: number[],
  currentId: number,
  direction: AdjacentDirection,
): AdjacentPlayerResult {
  const index = orderedIds.indexOf(currentId);

  if (index === -1) {
    return { status: 'not-in-list' };
  }

  const targetIndex = direction === 'next' ? index + 1 : index - 1;

  if (targetIndex < 0 || targetIndex >= orderedIds.length) {
    return { status: 'end' };
  }

  return { status: 'ok', id: orderedIds[targetIndex] };
}

/**
 * True once the scanned pages contain enough context to resolve the neighbour,
 * letting the page scan stop early instead of reading the whole list.
 */
export function hasEnoughScannedContext(
  orderedIds: number[],
  currentId: number,
  direction: AdjacentDirection,
): boolean {
  const index = orderedIds.indexOf(currentId);

  if (index === -1) {
    return false;
  }

  return direction === 'previous' || orderedIds.length > index + 1;
}
