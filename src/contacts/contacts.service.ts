import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class ContactsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return await this.prisma.contactPerson.findMany();
  }

  async findOne(id: string) {
    return await this.prisma.contactPerson.findUnique({
      where: { id },
    });
  }
}
