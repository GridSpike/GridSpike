import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { TransactionsService } from './transactions.service';

@Controller('api/transactions')
@UseGuards(JwtAuthGuard)
export class TransactionsController {
  constructor(private transactionsService: TransactionsService) {}

  @Get()
  async getHistory(
    @CurrentUser() user: { id: string },
    @Query('limit') limit?: string,
  ) {
    return this.transactionsService.getHistory(
      user.id,
      limit ? parseInt(limit, 10) : 50,
    );
  }

  @Get('summary')
  async getSummary(@CurrentUser() user: { id: string }) {
    return this.transactionsService.getSummary(user.id);
  }
}
