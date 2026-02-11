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
exports.SettlementService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../database/prisma.service");
const price_service_1 = require("../price/price.service");
const PSTEP = 20;
const TICKS_COL = 15;
let SettlementService = class SettlementService {
    constructor(prisma, priceService) {
        this.prisma = prisma;
        this.priceService = priceService;
        this.PRICE_TOLERANCE = 0.55;
        this.settlementListeners = [];
    }
    onModuleInit() {
        this.priceService.subscribe((price) => {
            this.checkSettlements(price);
        });
    }
    onSettlement(callback) {
        this.settlementListeners.push(callback);
        return () => {
            this.settlementListeners = this.settlementListeners.filter((l) => l !== callback);
        };
    }
    notifySettlement(result) {
        for (const listener of this.settlementListeners) {
            try {
                listener(result);
            }
            catch (error) {
                console.error('Error in settlement listener:', error);
            }
        }
    }
    async checkSettlements(currentPrice) {
        const bets = await this.prisma.bet.findMany({
            where: {
                status: 'ACTIVE',
            },
            include: {
                user: {
                    select: { id: true, balance: true },
                },
            },
        });
        for (const bet of bets) {
            const colStart = bet.targetTick - TICKS_COL;
            const colEnd = bet.targetTick;
            if (currentPrice.tick >= colStart && currentPrice.tick <= colEnd) {
                const priceDiff = Math.abs(currentPrice.price - Number(bet.priceLevel));
                const halfBand = PSTEP * this.PRICE_TOLERANCE;
                if (priceDiff <= halfBand) {
                    await this.settleBet(bet.id, bet.userId, 'WON', currentPrice.price);
                }
            }
            else if (currentPrice.tick > colEnd) {
                await this.settleBet(bet.id, bet.userId, 'LOST', currentPrice.price);
            }
        }
    }
    async settleBet(betId, odIn, status, settlePrice) {
        try {
            const result = await this.prisma.$transaction(async (tx) => {
                const bet = await tx.bet.findUnique({
                    where: { id: betId },
                    include: { user: true },
                });
                if (!bet || bet.status !== 'ACTIVE') {
                    return null;
                }
                const payout = status === 'WON'
                    ? Number(bet.amount) * Number(bet.multiplier)
                    : 0;
                await tx.bet.update({
                    where: { id: betId },
                    data: {
                        status,
                        payout,
                        priceAtSettlement: settlePrice,
                        settledAt: new Date(),
                    },
                });
                let newBalance = Number(bet.user.balance);
                if (status === 'WON') {
                    const updatedUser = await tx.user.update({
                        where: { id: odIn },
                        data: { balance: { increment: payout } },
                    });
                    newBalance = Number(updatedUser.balance);
                    await tx.transaction.create({
                        data: {
                            userId: odIn,
                            type: 'BET_WON',
                            amount: payout,
                            balanceBefore: Number(bet.user.balance),
                            balanceAfter: newBalance,
                            betId,
                        },
                    });
                }
                return {
                    betId,
                    odIn,
                    status,
                    payout,
                    newBalance,
                };
            });
            if (result) {
                this.notifySettlement(result);
            }
        }
        catch (error) {
            console.error('Error settling bet:', error);
        }
    }
};
exports.SettlementService = SettlementService;
exports.SettlementService = SettlementService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        price_service_1.PriceService])
], SettlementService);
//# sourceMappingURL=settlement.service.js.map