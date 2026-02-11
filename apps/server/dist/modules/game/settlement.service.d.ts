import { OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { PriceService } from '../price/price.service';
export interface SettlementResult {
    betId: string;
    odIn: string;
    status: 'WON' | 'LOST';
    payout: number;
    newBalance: number;
}
export declare class SettlementService implements OnModuleInit {
    private prisma;
    private priceService;
    private readonly PRICE_TOLERANCE;
    private settlementListeners;
    constructor(prisma: PrismaService, priceService: PriceService);
    onModuleInit(): void;
    onSettlement(callback: (result: SettlementResult) => void): () => void;
    private notifySettlement;
    private checkSettlements;
    private settleBet;
}
