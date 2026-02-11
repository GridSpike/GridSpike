import { OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { PriceService } from './price.service';
export declare class PriceGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    private priceService;
    server: Server;
    private unsubscribe;
    constructor(priceService: PriceService);
    afterInit(): void;
    handleConnection(client: Socket): void;
    handleDisconnect(client: Socket): void;
}
