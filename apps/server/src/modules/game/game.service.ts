import { Injectable } from '@nestjs/common';
import { BetService, PlaceBetDto } from './bet.service';
import { SettlementService } from './settlement.service';

@Injectable()
export class GameService {
  constructor(
    private betService: BetService,
    private settlementService: SettlementService,
  ) {}

  async placeBet(userId: string, dto: PlaceBetDto) {
    return this.betService.placeBet(userId, dto);
  }

  async getActiveBets(userId: string) {
    return this.betService.getActiveBets(userId);
  }

  async getBetHistory(userId: string, limit = 50) {
    return this.betService.getBetHistory(userId, limit);
  }

  onSettlement(callback: Parameters<SettlementService['onSettlement']>[0]) {
    return this.settlementService.onSettlement(callback);
  }
}
