import { LeaderboardService } from './leaderboard.service';
export declare class LeaderboardController {
    private leaderboardService;
    constructor(leaderboardService: LeaderboardService);
    getByProfit(limit?: string): Promise<any[]>;
    getByWins(limit?: string): Promise<any[]>;
}
