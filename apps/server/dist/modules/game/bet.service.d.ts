import { Prisma } from '@prisma/client';
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
            payout: Prisma.Decimal | null;
            priceAtSettlement: Prisma.Decimal | null;
            placedAt: Date;
            settledAt: Date | null;
            userId: string;
        };
        newBalance: number;
    }>;
    getActiveBets(userId: string): Promise<any[]>;
    getBetHistory(userId: string, limit?: number): Promise<any[]>;
}
