import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class LeaderboardService {
  constructor(private prisma: PrismaService) {}

  async getTopByProfit(limit = 10) {
    // Get users with their total profit (sum of payouts - sum of bets)
    const users = await this.prisma.user.findMany({
      select: {
        id: true,
        username: true,
        bets: {
          select: {
            amount: true,
            payout: true,
            status: true,
          },
        },
      },
    });

    const leaderboard = users.map((user: any) => {
      const totalBet = user.bets.reduce(
        (sum: number, bet: any) => sum + Number(bet.amount),
        0,
      );
      const totalPayout = user.bets.reduce(
        (sum: number, bet: any) => sum + (bet.payout ? Number(bet.payout) : 0),
        0,
      );
      const profit = totalPayout - totalBet;
      const wins = user.bets.filter((b: any) => b.status === 'WON').length;
      const losses = user.bets.filter((b: any) => b.status === 'LOST').length;

      return {
        userId: user.id,
        username: user.username,
        profit,
        wins,
        losses,
        winRate: wins + losses > 0 ? wins / (wins + losses) : 0,
      };
    });

    return leaderboard
      .sort((a: any, b: any) => b.profit - a.profit)
      .slice(0, limit)
      .map((entry: any, index: number) => ({ ...entry, rank: index + 1 }));
  }

  async getTopByWins(limit = 10) {
    const users = await this.prisma.user.findMany({
      select: {
        id: true,
        username: true,
        bets: {
          where: { status: 'WON' },
          select: { id: true },
        },
      },
    });

    return users
      .map((user: any) => ({
        userId: user.id,
        username: user.username,
        wins: user.bets.length,
      }))
      .sort((a: any, b: any) => b.wins - a.wins)
      .slice(0, limit)
      .map((entry: any, index: number) => ({ ...entry, rank: index + 1 }));
  }
}
