import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { PriceService, PriceData } from './price.service';

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  },
})
export class PriceGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private unsubscribe: (() => void) | null = null;

  constructor(private priceService: PriceService) {}

  afterInit() {
    console.log('WebSocket Gateway initialized');

    // Subscribe to price updates and broadcast to all clients
    this.unsubscribe = this.priceService.subscribe((price: PriceData) => {
      this.server.emit('price:update', price);
    });
  }

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);

    // Send current price immediately on connect
    const currentPrice = this.priceService.getCurrentPrice();
    if (currentPrice) {
      client.emit('price:update', currentPrice);
    }

    // Send connection status
    client.emit('connection:status', 'connected');
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }
}
