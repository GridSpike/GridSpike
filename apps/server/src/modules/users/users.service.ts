import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async findByUsername(username: string) {
    return this.prisma.user.findUnique({
      where: { username },
    });
  }

  async create(data: { email: string; username: string; passwordHash: string }) {
    return this.prisma.user.create({
      data,
    });
  }

  async updateBalance(userId: string, amount: number) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        balance: { increment: amount },
      },
    });
  }

  async getBalance(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { balance: true },
    });
    return user ? Number(user.balance) : 0;
  }
}
