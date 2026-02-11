import { PrismaService } from '../../database/prisma.service';
export declare class LeaderboardService {
    private prisma;
    constructor(prisma: PrismaService);
    getTopByProfit(limit?: number): Promise<{
        rank: number;
        userId: string;
        username: string;
        profit: number;
        wins: number;
        losses: number;
        winRate: number;
    }[]>;
    getTopByWins(limit?: number): Promise<{
        rank: number;
        userId: string;
        username: string;
        wins: number;
    }[]>;
}
