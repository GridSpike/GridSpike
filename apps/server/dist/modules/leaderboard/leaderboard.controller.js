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
exports.LeaderboardController = void 0;
const common_1 = require("@nestjs/common");
const leaderboard_service_1 = require("./leaderboard.service");
let LeaderboardController = class LeaderboardController {
    constructor(leaderboardService) {
        this.leaderboardService = leaderboardService;
    }
    async getByProfit(limit) {
        return this.leaderboardService.getTopByProfit(limit ? parseInt(limit, 10) : 10);
    }
    async getByWins(limit) {
        return this.leaderboardService.getTopByWins(limit ? parseInt(limit, 10) : 10);
    }
};
exports.LeaderboardController = LeaderboardController;
__decorate([
    (0, common_1.Get)('profit'),
    __param(0, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], LeaderboardController.prototype, "getByProfit", null);
__decorate([
    (0, common_1.Get)('wins'),
    __param(0, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], LeaderboardController.prototype, "getByWins", null);
exports.LeaderboardController = LeaderboardController = __decorate([
    (0, common_1.Controller)('api/leaderboard'),
    __metadata("design:paramtypes", [leaderboard_service_1.LeaderboardService])
], LeaderboardController);
//# sourceMappingURL=leaderboard.controller.js.map