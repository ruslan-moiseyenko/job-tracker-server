import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { User } from '@prisma/client';
import { GqlAuthGuard } from '../auth/gql-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CompanyService } from './company.service';
import { CreateCompanyInput } from './dto/create-company.input';
import { UpdateCompanyInput } from './dto/update-company.input';
import { Company } from './entities/company.entity';

@Resolver(() => Company)
@UseGuards(GqlAuthGuard)
export class CompanyResolver {
  constructor(private readonly companyService: CompanyService) {}

  @Mutation(() => Company, {
    description: '🏢 Companies: Create a new company',
  })
  createCompany(
    @Args('input') createCompanyInput: CreateCompanyInput,
    @CurrentUser() user: User,
  ) {
    return this.companyService.create(user.id, createCompanyInput);
  }

  @Query(() => [Company], {
    name: 'getAllCompanies',
    description: '🏢 Companies: Get all companies for current user',
  })
  getAllCompanies(@CurrentUser() user: User) {
    return this.companyService.findAllForUser(user.id);
  }

  @Query(() => Company, {
    name: 'getCompanyById',
    description: '🏢 Companies: Get a specific company by ID',
  })
  getCompanyById(@Args('id') id: string, @CurrentUser() user: User) {
    return this.companyService.findCompanyById(id, user.id);
  }

  @Query(() => [Company], {
    name: 'searchCompanies',
    description: '🏢 Companies: Search companies by name for autocomplete',
  })
  async searchCompanies(@Args('name') name: string, @CurrentUser() user: User) {
    return this.companyService.searchCompanies(name, user.id);
  }

  @Query(() => [Company], {
    name: 'getBlacklistedCompanies',
    description: '🚫 Companies: Get all blacklisted companies for current user',
  })
  getBlacklistedCompanies(@CurrentUser() user: User) {
    return this.companyService.findBlacklistedCompanies(user.id);
  }

  @Query(() => [Company], {
    name: 'getFavoriteCompanies',
    description: '⭐ Companies: Get all favorite companies for current user',
  })
  getFavoriteCompanies(@CurrentUser() user: User) {
    return this.companyService.findFavoriteCompanies(user.id);
  }

  @Mutation(() => Company, {
    description: '🏢 Companies: Update an existing company',
  })
  updateCompany(
    @Args('input') updateCompanyInput: UpdateCompanyInput,
    @CurrentUser() user: User,
  ) {
    return this.companyService.update(user.id, updateCompanyInput);
  }

  @Mutation(() => Company, {
    description: '🏢 Companies: Delete a company',
  })
  deleteCompany(@Args('id') id: string, @CurrentUser() user: User) {
    return this.companyService.delete(id, user.id);
  }
}
