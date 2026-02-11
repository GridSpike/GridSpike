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
exports.TransactionsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../database/prisma.service");
let TransactionsService = class TransactionsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getHistory(userId, limit = 50) {
        const transactions = await this.prisma.transaction.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: limit,
        });
        return transactions.map((tx) => ({
            ...tx,
            amount: Number(tx.amount),
            balanceBefore: Number(tx.balanceBefore),
            balanceAfter: Number(tx.balanceAfter),
        }));
    }
    async getSummary(userId) {
        const transactions = await this.prisma.transaction.findMany({
            where: { userId },
        });
        const totalWagered = transactions
            .filter((tx) => tx.type === 'BET_PLACED')
            .reduce((sum, tx) => sum + Math.abs(Number(tx.amount)), 0);
        const totalWon = transactions
            .filter((tx) => tx.type === 'BET_WON')
            .reduce((sum, tx) => sum + Number(tx.amount), 0);
        const profit = totalWon - totalWagered;
        return {
            totalWagered,
            totalWon,
            profit,
            transactionCount: transactions.length,
        };
    }
};
exports.TransactionsService = TransactionsService;
exports.TransactionsService = TransactionsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], TransactionsService);
//# sourceMappingURL=transactions.service.js.map