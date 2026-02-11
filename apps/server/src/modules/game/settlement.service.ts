import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { PriceService, PriceData } from '../price/price.service';

// Game constants (inline for now)
const PSTEP = 20; // $20 per row for BTC at ~$97k
const TICKS_COL = 15;

export interface SettlementResult {
  betId: string;
  odIn: string;
  status: 'WON' | 'LOST';
  payout: number;
  newBalance: number;
}

@Injectable()
export class SettlementService implements OnModuleInit {
  private readonly PRICE_TOLERANCE = 0.55; // Same as PSTEP * 0.55
  private settlementListeners: ((result: SettlementResult) => void)[] = [];

  constructor(
    private prisma: PrismaService,
    private priceService: PriceService,
  ) {}

  onModuleInit() {
    // Subscribe to price updates for settlement checking
    this.priceService.subscribe((price) => {
      this.checkSettlements(price);
    });
  }

  // Subscribe to settlement results
  onSettlement(callback: (result: SettlementResult) => void) {
    this.settlementListeners.push(callback);
    return () => {
      this.settlementListeners = this.settlementListeners.filter(
        (l) => l !== callback,
      );
    };
  }

  private notifySettlement(result: SettlementResult) {
    for (const listener of this.settlementListeners) {
      try {
        listener(result);
      } catch (error) {
        console.error('Error in settlement listener:', error);
      }
    }
  }

  private async checkSettlements(currentPrice: PriceData) {
    // Find all active bets that should be checked
    const bets = await this.prisma.bet.findMany({
      where: {
        status: 'ACTIVE',
      },
      include: {
        user: {
          select: { id: true, balance: true },
        },
      },
    });

    for (const bet of bets) {
      const colStart = bet.targetTick - TICKS_COL;
      const colEnd = bet.targetTick;

      // Is current tick within bet's column?
      if (currentPrice.tick >= colStart && currentPrice.tick <= colEnd) {
        // Check if price touches bet's price level
        const priceDiff = Math.abs(currentPrice.price - Number(bet.priceLevel));
        const halfBand = PSTEP * this.PRICE_TOLERANCE;

        if (priceDiff <= halfBand) {
          // WIN
          await this.settleBet(bet.id, bet.userId, 'WON', currentPrice.price);
        }
      } else if (currentPrice.tick > colEnd) {
        // Tick passed column without hit - LOSS
        await this.settleBet(bet.id, bet.userId, 'LOST', currentPrice.price);
      }
    }
  }

  private async settleBet(
    betId: string,
    odIn: string,
    status: 'WON' | 'LOST',
    settlePrice: number,
  ) {
    try {
      const result = await this.prisma.$transaction(async (tx) => {
        // Get the bet
        const bet = await tx.bet.findUnique({
          where: { id: betId },
          include: { user: true },
        });

        if (!bet || bet.status !== 'ACTIVE') {
          return null;
        }

        const payout =
          status === 'WON'
            ? Number(bet.amount) * Number(bet.multiplier)
            : 0;

        // Update bet
        await tx.bet.update({
          where: { id: betId },
          data: {
            status,
            payout,
            priceAtSettlement: settlePrice,
            settledAt: new Date(),
          },
        });

        let newBalance = Number(bet.user.balance);

        // If won, credit balance
        if (status === 'WON') {
          const updatedUser = await tx.user.update({
            where: { id: odIn },
            data: { balance: { increment: payout } },
          });
          newBalance = Number(updatedUser.balance);

          // Create transaction
          await tx.transaction.create({
            data: {
              userId: odIn,
              type: 'BET_WON',
              amount: payout,
              balanceBefore: Number(bet.user.balance),
              balanceAfter: newBalance,
              betId,
            },
          });
        }

        return {
          betId,
          odIn,
          status,
          payout,
          newBalance,
        };
      });

      if (result) {
        this.notifySettlement(result);
      }
    } catch (error) {
      console.error('Error settling bet:', error);
    }
  }
}
