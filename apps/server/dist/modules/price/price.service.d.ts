import { OnModuleInit, OnModuleDestroy } from '@nestjs/common';
export interface PriceData {
    price: number;
    bid: number;
    ask: number;
    tick: number;
    timestamp: number;
}
export declare class PriceService implements OnModuleInit, OnModuleDestroy {
    private ws;
    private currentPrice;
    private tick;
    private reconnectTimeout;
    private priceHistory;
    private readonly HISTORY_SIZE;
    private listeners;
    onModuleInit(): void;
    onModuleDestroy(): void;
    private connect;
    private disconnect;
    private scheduleReconnect;
    private notifyListeners;
    subscribe(callback: (price: PriceData) => void): () => void;
    getCurrentPrice(): PriceData | null;
    getPriceAtTick(tick: number): PriceData | null;
    getRecentPrices(count: number): PriceData[];
    getCurrentTick(): number;
}
