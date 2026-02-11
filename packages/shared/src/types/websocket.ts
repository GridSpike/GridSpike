import { Bet } from './bet';

// Server → Client Events
export interface ServerToClientEvents {
  'price:update': (data: PriceUpdate) => void;
  'game:betConfirmed': (bet: Bet) => void;
  'game:betSettled': (data: { bet: Bet; payout: number }) => void;
  'user:balance': (data: { balance: number }) => void;
  'connection:status': (status: 'connected' | 'disconnected') => void;
  'error:message': (error: { code: string; message: string }) => void;
}

// Client → Server Events
export interface ClientToServerEvents {
  'game:placeBet': (data: { gridRow: number; gridCol: number; amount: number }) => void;
  'game:cancelBet': (betId: string) => void;
  'user:subscribe': () => void;
}

export interface PriceUpdate {
  price: number;
  bid: number;
  ask: number;
  tick: number;
  timestamp: number;
}
