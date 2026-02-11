import { PrismaService } from '../../database/prisma.service';
import { PriceService } from '../price/price.service';
export interface PlaceBetDto {
    gridRow: number;
    gridCol: number;
    amount: number;
}
export declare class BetService {
    private prisma;
    private priceService;
    constructor(prisma: PrismaService, priceService: PriceService);
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
    getActiveBets(userId: string): Promise<{
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
    }[]>;
    getBetHistory(userId: string, limit?: number): Promise<{
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
    }[]>;
}
