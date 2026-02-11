export type BetStatus = 'ACTIVE' | 'WON' | 'LOST';

export interface Bet {
  id: string;
  userId: string;
  amount: number;
  multiplier: number;
  priceLevel: number;
  targetTick: number;
  gridRow: number;
  gridCol: number;
  status: BetStatus;
  payout: number | null;
  placedAt: Date;
  settledAt: Date | null;
}

export interface PlaceBetRequest {
  gridRow: number;
  gridCol: number;
  amount: number;
}

export interface BetSettledEvent {
  bet: Bet;
  payout: number;
  newBalance: number;
}
