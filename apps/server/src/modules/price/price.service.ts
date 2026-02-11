import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import WebSocket from 'ws';

export interface PriceData {
  price: number;
  bid: number;
  ask: number;
  tick: number;
  timestamp: number;
}

@Injectable()
export class PriceService implements OnModuleInit, OnModuleDestroy {
  private ws: WebSocket | null = null;
  private currentPrice: PriceData | null = null;
  private tick = 0;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private priceHistory: PriceData[] = [];
  private readonly HISTORY_SIZE = 1000;

  // Callbacks for price updates
  private listeners: ((price: PriceData) => void)[] = [];

  onModuleInit() {
    this.connect();
  }

  onModuleDestroy() {
    this.disconnect();
  }

  private connect() {
    console.log('Connecting to Binance Book Ticker...');

    // Using binance.us for US-based servers
    this.ws = new WebSocket(
      'wss://stream.binance.us:9443/ws/btcusd@bookTicker',
    );

    this.ws.on('open', () => {
      console.log('Connected to Binance Book Ticker');
    });

    this.ws.on('message', (data: WebSocket.Data) => {
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

        // Store in history
        this.priceHistory.push(this.currentPrice);
        if (this.priceHistory.length > this.HISTORY_SIZE) {
          this.priceHistory.shift();
        }

        // Notify listeners
        this.notifyListeners(this.currentPrice);
      } catch (error) {
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

  private disconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
    this.reconnectTimeout = setTimeout(() => {
      this.connect();
    }, 5000);
  }

  private notifyListeners(price: PriceData) {
    for (const listener of this.listeners) {
      try {
        listener(price);
      } catch (error) {
        console.error('Error in price listener:', error);
      }
    }
  }

  // Subscribe to price updates
  subscribe(callback: (price: PriceData) => void) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback);
    };
  }

  // Get current price
  getCurrentPrice(): PriceData | null {
    return this.currentPrice;
  }

  // Get price at specific tick (for bet settlement verification)
  getPriceAtTick(tick: number): PriceData | null {
    return this.priceHistory.find((p) => p.tick === tick) || null;
  }

  // Get recent prices
  getRecentPrices(count: number): PriceData[] {
    return this.priceHistory.slice(-count);
  }

  // Get current tick
  getCurrentTick(): number {
    return this.tick;
  }
}
