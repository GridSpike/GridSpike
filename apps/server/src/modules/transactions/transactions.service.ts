import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class TransactionsService {
  constructor(private prisma: PrismaService) {}

  async getHistory(userId: string, limit = 50) {
    const transactions = await this.prisma.transaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return transactions.map((tx) => ({
      ...tx,
      amount: Number(tx.amount),
      balanceBefore: Number(tx.balanceBefore),
      balanceAfter: Number(tx.balanceAfter),
    }));
  }

  async getSummary(userId: string) {
    const transactions = await this.prisma.transaction.findMany({
      where: { userId },
    });

    const totalWagered = transactions
      .filter((tx) => tx.type === 'BET_PLACED')
      .reduce((sum, tx) => sum + Math.abs(Number(tx.amount)), 0);

    const totalWon = transactions
      .filter((tx) => tx.type === 'BET_WON')
      .reduce((sum, tx) => sum + Number(tx.amount), 0);

    const profit = totalWon - totalWagered;

    return {
      totalWagered,
      totalWon,
      profit,
      transactionCount: transactions.length,
    };
  }
}
