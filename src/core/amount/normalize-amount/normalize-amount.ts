// Amounts are sent with at most two decimal places, without float artifacts (0.1 + 0.2)
export const normalizeAmount = (value: number): number => Number(value.toFixed(2));
