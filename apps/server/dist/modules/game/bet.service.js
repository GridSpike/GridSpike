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
Object.defineProperty(exports, "__esModule", { value: true });
exports.BetService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../database/prisma.service");
const price_service_1 = require("../price/price.service");
const GRID_COLS = 7;
const GRID_ROWS = 13;
const TICKS_COL = 15;
const PSTEP = 20;
const BET_SIZES = [1, 5, 10, 50];
function calcMultiplier(distFromCenter, col) {
    const d = Math.abs(distFromCenter);
    const tf = 1 + (GRID_COLS - 1 - col) * 0.12;
    const pf = 1 + d * 0.65 + d * d * 0.1;
    return Math.round(Math.min(1.6 + (pf * tf - 1) * 1.05, 35) * 100) / 100;
}
let BetService = class BetService {
    constructor(prisma, priceService) {
        this.prisma = prisma;
        this.priceService = priceService;
    }
    async placeBet(userId, dto) {
        if (!BET_SIZES.includes(dto.amount)) {
            throw new common_1.BadRequestException(`Invalid bet amount. Allowed: ${BET_SIZES.join(', ')}`);
        }
        if (dto.gridRow < 0 || dto.gridRow >= GRID_ROWS) {
            throw new common_1.BadRequestException('Invalid grid row');
        }
        if (dto.gridCol < 0 || dto.gridCol >= GRID_COLS) {
            throw new common_1.BadRequestException('Invalid grid column');
        }
        const currentPrice = this.priceService.getCurrentPrice();
        if (!currentPrice) {
            throw new common_1.BadRequestException('Price feed not available');
        }
        const centerRow = Math.floor(GRID_ROWS / 2);
        const distFromCenter = dto.gridRow - centerRow;
        const multiplier = calcMultiplier(distFromCenter, dto.gridCol);
        const priceLevel = currentPrice.price + distFromCenter * PSTEP;
        const targetTick = currentPrice.tick + (dto.gridCol + 1) * TICKS_COL;
        return this.prisma.$transaction(async (tx) => {
            const user = await tx.user.findUnique({
                where: { id: userId },
                select: { id: true, balance: true },
            });
            if (!user) {
                throw new common_1.BadRequestException('User not found');
            }
            if (Number(user.balance) < dto.amount) {
                throw new common_1.BadRequestException('Insufficient balance');
            }
            const updatedUser = await tx.user.update({
                where: { id: userId },
                data: { balance: { decrement: dto.amount } },
            });
            const bet = await tx.bet.create({
                data: {
                    userId,
                    amount: dto.amount,
                    multiplier,
                    priceLevel,
                    targetTick,
                    gridRow: dto.gridRow,
                    gridCol: dto.gridCol,
                    priceAtPlacement: currentPrice.price,
                    status: 'ACTIVE',
                },
            });
            await tx.transaction.create({
                data: {
                    userId,
                    type: 'BET_PLACED',
                    amount: -dto.amount,
                    balanceBefore: Number(user.balance),
                    balanceAfter: Number(updatedUser.balance),
                    betId: bet.id,
                },
            });
            return {
                bet: {
                    ...bet,
                    amount: Number(bet.amount),
                    multiplier: Number(bet.multiplier),
                    priceLevel: Number(bet.priceLevel),
                    priceAtPlacement: Number(bet.priceAtPlacement),
                },
                newBalance: Number(updatedUser.balance),
            };
        });
    }
    async getActiveBets(userId) {
        const bets = await this.prisma.bet.findMany({
            where: {
                userId,
                status: 'ACTIVE',
            },
            orderBy: { placedAt: 'desc' },
        });
        return bets.map((bet) => ({
            ...bet,
            amount: Number(bet.amount),
            multiplier: Number(bet.multiplier),
            priceLevel: Number(bet.priceLevel),
            payout: bet.payout ? Number(bet.payout) : null,
            priceAtPlacement: Number(bet.priceAtPlacement),
            priceAtSettlement: bet.priceAtSettlement
                ? Number(bet.priceAtSettlement)
                : null,
        }));
    }
    async getBetHistory(userId, limit = 50) {
        const bets = await this.prisma.bet.findMany({
            where: { userId },
            orderBy: { placedAt: 'desc' },
            take: limit,
        });
        return bets.map((bet) => ({
            ...bet,
            amount: Number(bet.amount),
            multiplier: Number(bet.multiplier),
            priceLevel: Number(bet.priceLevel),
            payout: bet.payout ? Number(bet.payout) : null,
            priceAtPlacement: Number(bet.priceAtPlacement),
            priceAtSettlement: bet.priceAtSettlement
                ? Number(bet.priceAtSettlement)
                : null,
        }));
    }
};
exports.BetService = BetService;
exports.BetService = BetService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        price_service_1.PriceService])
], BetService);
//# sourceMappingURL=bet.service.js.map