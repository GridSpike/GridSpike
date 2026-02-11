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
exports.GameService = void 0;
const common_1 = require("@nestjs/common");
const bet_service_1 = require("./bet.service");
const settlement_service_1 = require("./settlement.service");
let GameService = class GameService {
    constructor(betService, settlementService) {
        this.betService = betService;
        this.settlementService = settlementService;
    }
    async placeBet(userId, dto) {
        return this.betService.placeBet(userId, dto);
    }
    async getActiveBets(userId) {
        return this.betService.getActiveBets(userId);
    }
    async getBetHistory(userId, limit = 50) {
        return this.betService.getBetHistory(userId, limit);
    }
    onSettlement(callback) {
        return this.settlementService.onSettlement(callback);
    }
};
exports.GameService = GameService;
exports.GameService = GameService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [bet_service_1.BetService,
        settlement_service_1.SettlementService])
], GameService);
//# sourceMappingURL=game.service.js.map