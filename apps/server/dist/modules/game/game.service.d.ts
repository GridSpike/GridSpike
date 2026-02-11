import { BetService, PlaceBetDto } from './bet.service';
import { SettlementService } from './settlement.service';
export declare class GameService {
    private betService;
    private settlementService;
    constructor(betService: BetService, settlementService: SettlementService);
    placeBet(userId: string, dto: PlaceBetDto): Promise<{
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
        newBalance: number;
    }>;
    getActiveBets(userId: string): Promise<any[]>;
    getBetHistory(userId: string, limit?: number): Promise<any[]>;
    onSettlement(callback: Parameters<SettlementService['onSettlement']>[0]): () => void;
}
