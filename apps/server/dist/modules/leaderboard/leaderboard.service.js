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
exports.LeaderboardService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../database/prisma.service");
let LeaderboardService = class LeaderboardService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getTopByProfit(limit = 10) {
        const users = await this.prisma.user.findMany({
            select: {
                id: true,
                username: true,
                bets: {
                    select: {
                        amount: true,
                        payout: true,
                        status: true,
                    },
                },
            },
        });
        const leaderboard = users.map((user) => {
            const totalBet = user.bets.reduce((sum, bet) => sum + Number(bet.amount), 0);
            const totalPayout = user.bets.reduce((sum, bet) => sum + (bet.payout ? Number(bet.payout) : 0), 0);
            const profit = totalPayout - totalBet;
            const wins = user.bets.filter((b) => b.status === 'WON').length;
            const losses = user.bets.filter((b) => b.status === 'LOST').length;
            return {
                userId: user.id,
                username: user.username,
                profit,
                wins,
                losses,
                winRate: wins + losses > 0 ? wins / (wins + losses) : 0,
            };
        });
        return leaderboard
            .sort((a, b) => b.profit - a.profit)
            .slice(0, limit)
            .map((entry, index) => ({ ...entry, rank: index + 1 }));
    }
    async getTopByWins(limit = 10) {
        const users = await this.prisma.user.findMany({
            select: {
                id: true,
                username: true,
                bets: {
                    where: { status: 'WON' },
                    select: { id: true },
                },
            },
        });
        return users
            .map((user) => ({
            userId: user.id,
            username: user.username,
            wins: user.bets.length,
        }))
            .sort((a, b) => b.wins - a.wins)
            .slice(0, limit)
            .map((entry, index) => ({ ...entry, rank: index + 1 }));
    }
};
exports.LeaderboardService = LeaderboardService;
exports.LeaderboardService = LeaderboardService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], LeaderboardService);
//# sourceMappingURL=leaderboard.service.js.map