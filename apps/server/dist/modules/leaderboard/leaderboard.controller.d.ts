import { LeaderboardService } from './leaderboard.service';
export declare class LeaderboardController {
    private leaderboardService;
    constructor(leaderboardService: LeaderboardService);
    getByProfit(limit?: string): Promise<{
        rank: number;
        userId: string;
        username: string;
        profit: number;
        wins: number;
        losses: number;
        winRate: number;
    }[]>;
    getByWins(limit?: string): Promise<{
        rank: number;
        userId: string;
        username: string;
        wins: number;
    }[]>;
}
