import { Injectable } from '@nestjs/common';
import { CreateCompanyInput } from './dto/create-company.input';
import { UpdateCompanyInput } from './dto/update-company.input';
import { Company } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  NotFoundError,
  ConflictError,
  BadUserInputError,
} from 'src/common/exceptions/graphql.exceptions';

export interface ICreateCompanyInput {
  name: string;
  website?: string;
  description?: string;
  isFavorite?: boolean;
  isBlacklisted?: boolean;
  companyNote?: string;
}

@Injectable()
export class CompanyService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Automatically handles mutual exclusivity between blacklist and favorite flags
   * If a company is being blacklisted, it's automatically removed from favorites
   * If a company is being favorited, it's automatically removed from blacklist
   */
  private resolveMutuallyExclusiveFlags(
    isBlacklisted?: boolean,
    isFavorite?: boolean,
  ): { resolvedBlacklisted: boolean; resolvedFavorite: boolean } {
    // If explicitly setting to blacklist, remove from favorites
    if (isBlacklisted === true) {
      return {
        resolvedBlacklisted: true,
        resolvedFavorite: false,
      };
    }

    // If explicitly setting to favorite, remove from blacklist
    if (isFavorite === true) {
      return {
        resolvedBlacklisted: false,
        resolvedFavorite: true,
      };
    }

    // If both are false or undefined, keep as provided
    return {
      resolvedBlacklisted: isBlacklisted || false,
      resolvedFavorite: isFavorite || false,
    };
  }

  async create(userId: string, input: CreateCompanyInput): Promise<Company> {
    const { name, website, description, companyNote } = input;

    // Check for exact match first
    const exactMatch = await this.prisma.company.findFirst({
      where: {
        userId,
        name: {
          equals: name.trim(),
          mode: 'insensitive',
        },
      },
    });

    if (exactMatch) {
      throw new Error(`Company with name "${input.name}" already exists`);
    }

    // Check for similar companies to prevent duplicates
    const similarCompanies = await this.findSimilarCompanies(name, userId, 0.9);

    if (similarCompanies.length > 0) {
      const suggestions = similarCompanies
        .map((c) => `"${c.name}" (ID: ${c.id})`)
        .join(', ');
      throw new Error(
        `Similar company names found: ${suggestions}. ` +
          `Consider using existing company or choose a more specific name.`,
      );
    }

    return this.prisma.company.create({
      data: {
        name: name.trim(),
        website: website?.trim(),
        description: description?.trim(),
        companyNote: companyNote?.trim(),
        userId,
        isBlacklisted: false,
        isFavorite: false,
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

    // Resolve mutually exclusive flags
    const { resolvedBlacklisted, resolvedFavorite } =
      this.resolveMutuallyExclusiveFlags(
        updateData.isBlacklisted,
        updateData.isFavorite,
      );

    // Update company with all fields including companyNote
    return await this.prisma.company.update({
      where: { id, userId },
      data: {
        name: updateData.name?.trim(),
        website: updateData.website?.trim(),
        description: updateData.description?.trim(),
        companyNote: updateData.companyNote?.trim(),
        isBlacklisted: resolvedBlacklisted,
        isFavorite: resolvedFavorite,
      },
    });
  }

  async delete(id: string, userId: string) {
    return await this.prisma.$transaction(async (tx) => {
      // First, verify the company exists and belongs to user
      const existingCompany = await tx.company.findFirst({
        where: { id, userId },
      });

      if (!existingCompany) {
        throw new NotFoundError('Company not found or cannot be deleted');
      }

      // Check if the company is currently being used by any applications
      const applicationUsingCompany = await tx.jobApplication.findFirst({
        where: {
          companyId: id,
          jobSearch: {
            userId, // Ensure we only check applications belonging to this user
          },
        },
      });

      if (applicationUsingCompany) {
        throw new ConflictError(
          `Cannot delete company "${existingCompany.name}" because it is currently being used by applications. Please reassign applications to a different company first.`,
        );
      }

      return await tx.company.delete({
        where: { id, userId },
      });
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

    // First, search for companies that start with the query
    const startsWithResults = await this.prisma.company.findMany({
      select: { id: true, name: true },
      where: {
        userId,
        name: { startsWith: trimmedName, mode: 'insensitive' },
      },
      orderBy: { name: 'asc' },
      take: 10,
    });

    // If we have enough results, return them
    if (startsWithResults.length >= 10) {
      return startsWithResults;
    }

    // Otherwise, search for companies that contain the query (excluding startsWith results)
    const containsResults = await this.prisma.company.findMany({
      select: { id: true, name: true },
      where: {
        userId,
        name: { contains: trimmedName, mode: 'insensitive' },
        NOT: { name: { startsWith: trimmedName, mode: 'insensitive' } },
      },
      orderBy: { name: 'asc' },
      take: 10 - startsWithResults.length, // Fill remaining slots
    });

    // Combine results with startsWith first
    return [...startsWithResults, ...containsResults];
  }

  /**
   * Search for companies similar to the given name (fuzzy matching)
   * Used to prevent duplicates when creating new companies
   */
  async findSimilarCompanies(
    name: string,
    userId: string,
    threshold: number = 0.8,
  ): Promise<Pick<Company, 'id' | 'name'>[]> {
    const trimmedName = name.trim().toLowerCase();

    // Get all companies for the user
    const allCompanies = await this.prisma.company.findMany({
      select: { id: true, name: true },
      where: { userId },
    });

    // Simple similarity check
    return allCompanies.filter((company) => {
      const companyName = company.name.toLowerCase();

      if (companyName === trimmedName) {
        return true;
      }

      // Check if one name contains the other and they're similar length
      const lengthRatio =
        Math.min(trimmedName.length, companyName.length) /
        Math.max(trimmedName.length, companyName.length);

      if (lengthRatio >= threshold) {
        return (
          companyName.includes(trimmedName) || trimmedName.includes(companyName)
        );
      }

      return false;
    });
  }

  async findBlacklistedCompanies(userId: string): Promise<Company[]> {
    if (!userId?.trim()) {
      throw new BadUserInputError('User ID is required');
    }

    return this.prisma.company.findMany({
      where: {
        userId,
        isBlacklisted: true,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });
  }

  async findFavoriteCompanies(userId: string): Promise<Company[]> {
    if (!userId?.trim()) {
      throw new BadUserInputError('User ID is required');
    }

    return this.prisma.company.findMany({
      where: {
        userId,
        isFavorite: true,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });
  }
}
