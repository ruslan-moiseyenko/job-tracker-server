import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { CompanyService } from './company.service';
import { Company } from './entities/company.entity';
import { CreateCompanyInput } from './dto/create-company.input';
import { UpdateCompanyInput } from './dto/update-company.input';

@Resolver(() => Company)
export class CompanyResolver {
  constructor(private readonly companyService: CompanyService) {}

  @Mutation(() => Company, {
    description: '🏢 Companies: Create a new company',
  })
  createCompany(
    @Args('createCompanyInput') createCompanyInput: CreateCompanyInput,
  ) {
    return this.companyService.create(createCompanyInput);
  }

  @Query(() => [Company], {
    name: 'company',
    description: '🏢 Companies: Get all companies',
  })
  findAll() {
    return this.companyService.findAll();
  }

  @Query(() => Company, {
    name: 'company',
    description: '🏢 Companies: Get a specific company by ID',
  })
  findOne(@Args('id', { type: () => Int }) id: number) {
    return this.companyService.findOne(id);
  }

  @Mutation(() => Company, {
    description: '🏢 Companies: Update an existing company',
  })
  updateCompany(
    @Args('updateCompanyInput') updateCompanyInput: UpdateCompanyInput,
  ) {
    return this.companyService.update(
      updateCompanyInput.id,
      updateCompanyInput,
    );
  }

  @Mutation(() => Company, {
    description: '🏢 Companies: Delete a company',
  })
  removeCompany(@Args('id', { type: () => Int }) id: number) {
    return this.companyService.remove(id);
  }
}
