"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PriceService = void 0;
const common_1 = require("@nestjs/common");
const ws_1 = __importDefault(require("ws"));
let PriceService = class PriceService {
    constructor() {
        this.ws = null;
        this.currentPrice = null;
        this.tick = 0;
        this.reconnectTimeout = null;
        this.priceHistory = [];
        this.HISTORY_SIZE = 1000;
        this.listeners = [];
    }
    onModuleInit() {
        this.connect();
    }
    onModuleDestroy() {
        this.disconnect();
    }
    connect() {
        console.log('Connecting to Binance Book Ticker...');
        this.ws = new ws_1.default('wss://stream.binance.us:9443/ws/btcusd@bookTicker');
        this.ws.on('open', () => {
            console.log('Connected to Binance Book Ticker');
        });
        this.ws.on('message', (data) => {
            try {
                const parsed = JSON.parse(data.toString());
                const bid = parseFloat(parsed.b);
                const ask = parseFloat(parsed.a);
                const price = (bid + ask) / 2;
                this.tick++;
                this.currentPrice = {
                    price: Math.round(price * 100) / 100,
                    bid,
                    ask,
                    tick: this.tick,
                    timestamp: Date.now(),
                };
                this.priceHistory.push(this.currentPrice);
                if (this.priceHistory.length > this.HISTORY_SIZE) {
                    this.priceHistory.shift();
                }
                this.notifyListeners(this.currentPrice);
            }
            catch (error) {
                console.error('Error parsing price data:', error);
            }
        });
        this.ws.on('error', (error) => {
            console.error('WebSocket error:', error);
        });
        this.ws.on('close', () => {
            console.log('WebSocket disconnected, reconnecting in 5s...');
            this.scheduleReconnect();
        });
    }
    disconnect() {
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
        }
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }
    scheduleReconnect() {
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
        }
        this.reconnectTimeout = setTimeout(() => {
            this.connect();
        }, 5000);
    }
    notifyListeners(price) {
        for (const listener of this.listeners) {
            try {
                listener(price);
            }
            catch (error) {
                console.error('Error in price listener:', error);
            }
        }
    }
    subscribe(callback) {
        this.listeners.push(callback);
        return () => {
            this.listeners = this.listeners.filter((l) => l !== callback);
        };
    }
    getCurrentPrice() {
        return this.currentPrice;
    }
    getPriceAtTick(tick) {
        return this.priceHistory.find((p) => p.tick === tick) || null;
    }
    getRecentPrices(count) {
        return this.priceHistory.slice(-count);
    }
    getCurrentTick() {
        return this.tick;
    }
};
exports.PriceService = PriceService;
exports.PriceService = PriceService = __decorate([
    (0, common_1.Injectable)()
], PriceService);
//# sourceMappingURL=price.service.js.map