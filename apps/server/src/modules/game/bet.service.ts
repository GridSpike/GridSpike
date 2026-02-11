import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { PriceService } from '../price/price.service';

// Game constants (inline for now)
const GRID_COLS = 7;
const GRID_ROWS = 13;
const TICKS_COL = 15;
const PSTEP = 20; // $20 per row for BTC at ~$97k
const BET_SIZES = [1, 5, 10, 50] as const;

function calcMultiplier(distFromCenter: number, col: number): number {
  const d = Math.abs(distFromCenter);
  const tf = 1 + (GRID_COLS - 1 - col) * 0.12;
  const pf = 1 + d * 0.65 + d * d * 0.1;
  return Math.round(Math.min(1.6 + (pf * tf - 1) * 1.05, 35) * 100) / 100;
}

export interface PlaceBetDto {
  gridRow: number;
  gridCol: number;
  amount: number;
}

@Injectable()
export class BetService {
  constructor(
    private prisma: PrismaService,
    private priceService: PriceService,
  ) {}

  async placeBet(userId: string, dto: PlaceBetDto) {
    // Validate bet amount
    if (!BET_SIZES.includes(dto.amount as any)) {
      throw new BadRequestException(
        `Invalid bet amount. Allowed: ${BET_SIZES.join(', ')}`,
      );
    }

    // Validate grid position
    if (dto.gridRow < 0 || dto.gridRow >= GRID_ROWS) {
      throw new BadRequestException('Invalid grid row');
    }
    if (dto.gridCol < 0 || dto.gridCol >= GRID_COLS) {
      throw new BadRequestException('Invalid grid column');
    }

    // Get current price and tick
    const currentPrice = this.priceService.getCurrentPrice();
    if (!currentPrice) {
      throw new BadRequestException('Price feed not available');
    }

    // Calculate multiplier and target
    const centerRow = Math.floor(GRID_ROWS / 2);
    const distFromCenter = dto.gridRow - centerRow;
    const multiplier = calcMultiplier(distFromCenter, dto.gridCol);

    // Calculate price level and target tick
    const priceLevel = currentPrice.price + distFromCenter * PSTEP;
    const targetTick = currentPrice.tick + (dto.gridCol + 1) * TICKS_COL;

    // Use transaction to ensure atomicity
    return this.prisma.$transaction(async (tx) => {
      // Get user and check balance
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { id: true, balance: true },
      });

      if (!user) {
        throw new BadRequestException('User not found');
      }

      if (Number(user.balance) < dto.amount) {
        throw new BadRequestException('Insufficient balance');
      }

      // Deduct balance
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: { balance: { decrement: dto.amount } },
      });

      // Create bet
      const bet = await tx.bet.create({
        data: {
          userId,
          amount: dto.amount,
          multiplier,
          priceLevel,
          targetTick,
          gridRow: dto.gridRow,
          gridCol: dto.gridCol,
          priceAtPlacement: currentPrice.price,
          status: 'ACTIVE',
        },
      });

      // Create transaction record
      await tx.transaction.create({
        data: {
          userId,
          type: 'BET_PLACED',
          amount: -dto.amount,
          balanceBefore: Number(user.balance),
          balanceAfter: Number(updatedUser.balance),
          betId: bet.id,
        },
      });

      return {
        bet: {
          ...bet,
          amount: Number(bet.amount),
          multiplier: Number(bet.multiplier),
          priceLevel: Number(bet.priceLevel),
          priceAtPlacement: Number(bet.priceAtPlacement),
        },
        newBalance: Number(updatedUser.balance),
      };
    });
  }

  async getActiveBets(userId: string) {
    const bets = await this.prisma.bet.findMany({
      where: {
        userId,
        status: 'ACTIVE',
      },
      orderBy: { placedAt: 'desc' },
    });

    return bets.map((bet) => ({
      ...bet,
      amount: Number(bet.amount),
      multiplier: Number(bet.multiplier),
      priceLevel: Number(bet.priceLevel),
      payout: bet.payout ? Number(bet.payout) : null,
      priceAtPlacement: Number(bet.priceAtPlacement),
      priceAtSettlement: bet.priceAtSettlement
        ? Number(bet.priceAtSettlement)
        : null,
    }));
  }

  async getBetHistory(userId: string, limit = 50) {
    const bets = await this.prisma.bet.findMany({
      where: { userId },
      orderBy: { placedAt: 'desc' },
      take: limit,
    });

    return bets.map((bet) => ({
      ...bet,
      amount: Number(bet.amount),
      multiplier: Number(bet.multiplier),
      priceLevel: Number(bet.priceLevel),
      payout: bet.payout ? Number(bet.payout) : null,
      priceAtPlacement: Number(bet.priceAtPlacement),
      priceAtSettlement: bet.priceAtSettlement
        ? Number(bet.priceAtSettlement)
        : null,
    }));
  }
}
