import { PrismaService } from '../../database/prisma.service';
export declare class TransactionsService {
    private prisma;
    constructor(prisma: PrismaService);
    getHistory(userId: string, limit?: number): Promise<any[]>;
    getSummary(userId: string): Promise<{
        totalWagered: number;
        totalWon: number;
        profit: number;
        transactionCount: number;
    }>;
}
