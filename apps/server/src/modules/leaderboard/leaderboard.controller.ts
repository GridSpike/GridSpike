import { Controller, Get, Query } from '@nestjs/common';
import { LeaderboardService } from './leaderboard.service';

@Controller('api/leaderboard')
export class LeaderboardController {
  constructor(private leaderboardService: LeaderboardService) {}

  @Get('profit')
  async getByProfit(@Query('limit') limit?: string) {
    return this.leaderboardService.getTopByProfit(
      limit ? parseInt(limit, 10) : 10,
    );
  }

  @Get('wins')
  async getByWins(@Query('limit') limit?: string) {
    return this.leaderboardService.getTopByWins(
      limit ? parseInt(limit, 10) : 10,
    );
  }
}
