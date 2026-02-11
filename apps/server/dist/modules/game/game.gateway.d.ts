import { OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { GameService } from './game.service';
export declare class GameGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    private gameService;
    server: Server;
    private socketToUser;
    private userToSocket;
    constructor(gameService: GameService);
    afterInit(): void;
    handleConnection(client: Socket): void;
    handleDisconnect(client: Socket): void;
    handleAuth(client: Socket, data: {
        userId: string;
    }): Promise<{
        success: boolean;
    }>;
    handlePlaceBet(client: Socket, data: {
        gridRow: number;
        gridCol: number;
        amount: number;
    }): Promise<{
        success: boolean;
        bet: {
            amount: number;
            multiplier: number;
            priceLevel: number;
            priceAtPlacement: number;
            id: string;
            targetTick: number;
            gridRow: number;
            gridCol: number;
            status: import("@prisma/client").$Enums.BetStatus;
            payout: import("@prisma/client/runtime/library").Decimal | null;
            priceAtSettlement: import("@prisma/client/runtime/library").Decimal | null;
            placedAt: Date;
            settledAt: Date | null;
            userId: string;
        };
        error?: undefined;
    } | {
        success: boolean;
        error: any;
        bet?: undefined;
    } | undefined>;
    handleGetActiveBets(client: Socket): Promise<{
        success: boolean;
        error: string;
        bets?: undefined;
    } | {
        success: boolean;
        bets: {
            amount: number;
            multiplier: number;
            priceLevel: number;
            payout: number | null;
            priceAtPlacement: number;
            priceAtSettlement: number | null;
            id: string;
            targetTick: number;
            gridRow: number;
            gridCol: number;
            status: import("@prisma/client").$Enums.BetStatus;
            placedAt: Date;
            settledAt: Date | null;
            userId: string;
        }[];
        error?: undefined;
    }>;
    private notifySettlement;
}
