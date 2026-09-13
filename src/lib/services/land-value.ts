export function contractPricePerM2Local(input: {
  priceLocal: number;
  surfaceM2: number;
}): number {
  return input.surfaceM2 > 0 ? input.priceLocal / input.surfaceM2 : 0;
}

export function currentPricePerM2Local(
  input: { estimatedValueUsd: number | null; surfaceM2: number },
  bobPerUsd: number,
): number | null {
  if (input.estimatedValueUsd == null || input.surfaceM2 <= 0 || bobPerUsd <= 0) {
    return null;
  }
  return (input.estimatedValueUsd * bobPerUsd) / input.surfaceM2;
}

/** NAV land slice: paid cost, or current lot value minus unpaid contract. */
export function landEquityUsd(input: {
  paidUsd: number;
  remainingUsd: number;
  estimatedValueUsd: number | null;
}): number {
  if (input.estimatedValueUsd == null) return input.paidUsd;
  return Math.max(0, input.estimatedValueUsd - input.remainingUsd);
}
