"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const socket_io_1 = require("socket.io");
const game_service_1 = require("./game.service");
let GameGateway = class GameGateway {
    constructor(gameService) {
        this.gameService = gameService;
        this.socketToUser = new Map();
        this.userToSocket = new Map();
    }
    afterInit() {
        console.log('Game Gateway initialized');
        this.gameService.onSettlement((result) => {
            this.notifySettlement(result);
        });
    }
    handleConnection(client) {
    }
    handleDisconnect(client) {
        const userId = this.socketToUser.get(client.id);
        if (userId) {
            this.socketToUser.delete(client.id);
            this.userToSocket.delete(userId);
        }
    }
    async handleAuth(client, data) {
        this.socketToUser.set(client.id, data.userId);
        this.userToSocket.set(data.userId, client.id);
        const activeBets = await this.gameService.getActiveBets(data.userId);
        client.emit('game:activeBets', activeBets);
        return { success: true };
    }
    async handlePlaceBet(client, data) {
        const userId = this.socketToUser.get(client.id);
        if (!userId) {
            client.emit('error:message', {
                code: 'UNAUTHORIZED',
                message: 'Please authenticate first',
            });
            return;
        }
        try {
            const result = await this.gameService.placeBet(userId, data);
            client.emit('game:betConfirmed', result.bet);
            client.emit('user:balance', { balance: result.newBalance });
            return { success: true, bet: result.bet };
        }
        catch (error) {
            client.emit('error:message', {
                code: 'BET_FAILED',
                message: error.message || 'Failed to place bet',
            });
            return { success: false, error: error.message };
        }
    }
    async handleGetActiveBets(client) {
        const userId = this.socketToUser.get(client.id);
        if (!userId) {
            return { success: false, error: 'Unauthorized' };
        }
        const bets = await this.gameService.getActiveBets(userId);
        return { success: true, bets };
    }
    notifySettlement(result) {
        const socketId = this.userToSocket.get(result.odIn);
        if (socketId) {
            this.server.to(socketId).emit('game:betSettled', {
                betId: result.betId,
                status: result.status,
                payout: result.payout,
            });
            this.server.to(socketId).emit('user:balance', {
                balance: result.newBalance,
            });
        }
    }
};
exports.GameGateway = GameGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], GameGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('auth:connect'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], GameGateway.prototype, "handleAuth", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('game:placeBet'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], GameGateway.prototype, "handlePlaceBet", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('game:getActiveBets'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket]),
    __metadata("design:returntype", Promise)
], GameGateway.prototype, "handleGetActiveBets", null);
exports.GameGateway = GameGateway = __decorate([
    (0, websockets_1.WebSocketGateway)({
        cors: {
            origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
            credentials: true,
        },
    }),
    __metadata("design:paramtypes", [game_service_1.GameService])
], GameGateway);
//# sourceMappingURL=game.gateway.js.map