import { TransactionsService } from './transactions.service';
export declare class TransactionsController {
    private transactionsService;
    constructor(transactionsService: TransactionsService);
    getHistory(user: {
        id: string;
    }, limit?: string): Promise<any[]>;
    getSummary(user: {
        id: string;
    }): Promise<{
        totalWagered: number;
        totalWon: number;
        profit: number;
        transactionCount: number;
    }>;
}
