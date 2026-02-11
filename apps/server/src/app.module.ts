import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { GameModule } from './modules/game/game.module';
import { PriceModule } from './modules/price/price.module';
import { LeaderboardModule } from './modules/leaderboard/leaderboard.module';
import { TransactionsModule } from './modules/transactions/transactions.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000,
        limit: 10,
      },
      {
        name: 'medium',
        ttl: 10000,
        limit: 50,
      },
    ]),
    DatabaseModule,
    AuthModule,
    UsersModule,
    GameModule,
    PriceModule,
    LeaderboardModule,
    TransactionsModule,
  ],
})
export class AppModule {}
