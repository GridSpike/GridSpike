import { PrismaService } from '../../database/prisma.service';
export declare class UsersService {
    private prisma;
    constructor(prisma: PrismaService);
    findById(id: string): Promise<{
        id: string;
        email: string;
        username: string;
        passwordHash: string;
        balance: import("@prisma/client/runtime/library").Decimal;
        createdAt: Date;
        updatedAt: Date;
    } | null>;
    findByEmail(email: string): Promise<{
        id: string;
        email: string;
        username: string;
        passwordHash: string;
        balance: import("@prisma/client/runtime/library").Decimal;
        createdAt: Date;
        updatedAt: Date;
    } | null>;
    findByUsername(username: string): Promise<{
        id: string;
        email: string;
        username: string;
        passwordHash: string;
        balance: import("@prisma/client/runtime/library").Decimal;
        createdAt: Date;
        updatedAt: Date;
    } | null>;
    create(data: {
        email: string;
        username: string;
        passwordHash: string;
    }): Promise<{
        id: string;
        email: string;
        username: string;
        passwordHash: string;
        balance: import("@prisma/client/runtime/library").Decimal;
        createdAt: Date;
        updatedAt: Date;
    }>;
    updateBalance(userId: string, amount: number): Promise<{
        id: string;
        email: string;
        username: string;
        passwordHash: string;
        balance: import("@prisma/client/runtime/library").Decimal;
        createdAt: Date;
        updatedAt: Date;
    }>;
    getBalance(userId: string): Promise<number>;
}
