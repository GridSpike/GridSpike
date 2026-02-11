import { Module } from '@nestjs/common';
import { GameService } from './game.service';
import { GameGateway } from './game.gateway';
import { BetService } from './bet.service';
import { SettlementService } from './settlement.service';
import { PriceModule } from '../price/price.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [PriceModule, UsersModule],
  providers: [GameService, GameGateway, BetService, SettlementService],
  exports: [GameService, BetService],
})
export class GameModule {}
