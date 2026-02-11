import { PrismaService } from '../../database/prisma.service';
export declare class LeaderboardService {
    private prisma;
    constructor(prisma: PrismaService);
    getTopByProfit(limit?: number): Promise<any[]>;
    getTopByWins(limit?: number): Promise<any[]>;
}
