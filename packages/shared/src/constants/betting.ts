// Allowed bet sizes
export const BET_SIZES = [1, 5, 10, 50] as const;
export type BetSize = (typeof BET_SIZES)[number];

// Initial balance for new users
export const INITIAL_BALANCE = 1000;

// Multiplier calculation
export function calcMultiplier(distFromCenter: number, col: number): number {
  const d = Math.abs(distFromCenter);
  const tf = 1 + (6 - col) * 0.12; // GRID_COLS - 1 - col
  const pf = 1 + d * 0.65 + d * d * 0.1;
  return Math.round(Math.min(1.6 + (pf * tf - 1) * 1.05, 35) * 100) / 100;
}

// Validate bet amount
export function isValidBetAmount(amount: number): amount is BetSize {
  return BET_SIZES.includes(amount as BetSize);
}
