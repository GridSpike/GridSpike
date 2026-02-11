import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards } from '@nestjs/common';
import { GameService } from './game.service';
import { SettlementResult } from './settlement.service';

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  },
})
export class GameGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  // Map socket ID to user ID
  private socketToUser: Map<string, string> = new Map();
  private userToSocket: Map<string, string> = new Map();

  constructor(private gameService: GameService) {}

  afterInit() {
    console.log('Game Gateway initialized');

    // Subscribe to settlement events
    this.gameService.onSettlement((result: SettlementResult) => {
      this.notifySettlement(result);
    });
  }

  handleConnection(client: Socket) {
    // User will authenticate via message
  }

  handleDisconnect(client: Socket) {
    const userId = this.socketToUser.get(client.id);
    if (userId) {
      this.socketToUser.delete(client.id);
      this.userToSocket.delete(userId);
    }
  }

  @SubscribeMessage('auth:connect')
  async handleAuth(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { userId: string },
  ) {
    // In production, validate JWT here
    this.socketToUser.set(client.id, data.userId);
    this.userToSocket.set(data.userId, client.id);

    // Send active bets
    const activeBets = await this.gameService.getActiveBets(data.userId);
    client.emit('game:activeBets', activeBets);

    return { success: true };
  }

  @SubscribeMessage('game:placeBet')
  async handlePlaceBet(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { gridRow: number; gridCol: number; amount: number },
  ) {
    const userId = this.socketToUser.get(client.id);
    if (!userId) {
      client.emit('error:message', {
        code: 'UNAUTHORIZED',
        message: 'Please authenticate first',
      });
      return;
    }

    try {
      const result = await this.gameService.placeBet(userId, data);
      client.emit('game:betConfirmed', result.bet);
      client.emit('user:balance', { balance: result.newBalance });
      return { success: true, bet: result.bet };
    } catch (error: any) {
      client.emit('error:message', {
        code: 'BET_FAILED',
        message: error.message || 'Failed to place bet',
      });
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('game:getActiveBets')
  async handleGetActiveBets(@ConnectedSocket() client: Socket) {
    const userId = this.socketToUser.get(client.id);
    if (!userId) {
      return { success: false, error: 'Unauthorized' };
    }

    const bets = await this.gameService.getActiveBets(userId);
    return { success: true, bets };
  }

  private notifySettlement(result: SettlementResult) {
    const socketId = this.userToSocket.get(result.odIn);
    if (socketId) {
      this.server.to(socketId).emit('game:betSettled', {
        betId: result.betId,
        status: result.status,
        payout: result.payout,
      });
      this.server.to(socketId).emit('user:balance', {
        balance: result.newBalance,
      });
    }
  }
}
