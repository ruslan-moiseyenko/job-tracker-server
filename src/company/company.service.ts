import { Injectable } from '@nestjs/common';
import { CreateCompanyInput } from './dto/create-company.input';
import { UpdateCompanyInput } from './dto/update-company.input';
import { Company } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

export interface ICreateCompanyInput {
  name: string;
  website?: string;
  description?: string;
}

@Injectable()
export class CompanyService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, input: CreateCompanyInput): Promise<Company> {
    const { name, website, description } = input;
    // Check if the name is already taken
    const existingCompany = await this.prisma.company.findFirst({
      where: {
        userId,
        name: {
          equals: name.trim(),
          mode: 'insensitive',
        },
      },
    });

    if (existingCompany) {
      throw new Error(`Company with name "${input.name}" already exists`);
    }

    return this.prisma.company.create({
      data: {
        name: name.trim(),
        website: website?.trim(),
        description: description?.trim(),
        userId,
      },
    });
  }

  async findAllForUser(userId: string): Promise<Company[]> {
    return this.prisma.company.findMany({
      where: { userId },
      orderBy: { name: 'asc' },
    });
  }

  async findCompanyById(id: string, userId: string): Promise<Company | null> {
    return this.prisma.company.findFirst({
      where: { id, userId },
    });
  }

  async update(
    userId: string,
    updateCompanyInput: UpdateCompanyInput,
  ): Promise<Company> {
    const { id, ...updateData } = updateCompanyInput;
    // Check if new name already exists
    if (updateData.name) {
      const existingCompany = await this.prisma.company.findFirst({
        where: {
          userId,
          id: { not: id }, // Exclude the current company being updated
          name: {
            equals: updateData.name.trim(),
            mode: 'insensitive',
          },
        },
      });

      if (existingCompany) {
        throw new Error(
          `Company with name "${updateData.name}" already exists`,
        );
      }
    }

    return await this.prisma.company.update({
      where: { id, userId },
      data: {
        name: updateData.name?.trim(),
        website: updateData.website?.trim(),
        description: updateData.description?.trim(),
      },
    });
  }

  async delete(id: string, userId: string) {
    return await this.prisma.company.delete({
      where: { id, userId },
    });
  }

  async searchCompanies(
    name: string,
    userId: string,
  ): Promise<Pick<Company, 'id' | 'name'>[] | null> {
    const trimmedName = name.trim();

    if (!trimmedName) {
      return [];
    }

    return await this.prisma.company.findMany({
      select: { id: true, name: true },
      where: {
        userId,
        OR: [
          { name: { startsWith: trimmedName, mode: 'insensitive' } }, // Prioritize startsWith matches
          { name: { contains: trimmedName, mode: 'insensitive' } },
        ],
      },
      orderBy: { name: 'asc' },
      take: 10,
    });
  }
}
