import { Test, TestingModule } from '@nestjs/testing';
import { CompanyResolver } from './company.resolver';
import { CompanyService } from './company.service';
import { PrismaService } from '../prisma/prisma.service';

describe('CompanyResolver', () => {
  let resolver: CompanyResolver;
  let companyService: jest.Mocked<CompanyService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompanyResolver,
        {
          provide: CompanyService,
          useValue: {
            create: jest.fn(),
            findAllForUser: jest.fn(),
            findCompanyById: jest.fn(),
            searchCompanies: jest.fn(),
            findBlacklistedCompanies: jest.fn(),
            findFavoriteCompanies: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: PrismaService,
          useValue: {},
        },
      ],
    }).compile();

    resolver = module.get<CompanyResolver>(CompanyResolver);
    companyService = module.get(CompanyService);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  describe('company operations', () => {
    it('should create a company', async () => {
      const mockInput = {
        name: 'Test Company',
        website: 'https://test.com',
        companyNote: 'Test note',
      };
      const mockUser = { id: 'user-1' } as any;
      const mockCompany = {
        id: 'company-1',
        name: 'Test Company',
        companyNote: 'Test note',
      };

      companyService.create.mockResolvedValue(mockCompany as any);

      const result = await resolver.createCompany(mockInput as any, mockUser);

      expect(companyService.create).toHaveBeenCalledWith(
        mockUser.id,
        mockInput,
      );
      expect(result).toEqual(mockCompany);
    });

    it('should get all companies for user', async () => {
      const mockUser = { id: 'user-1' } as any;
      const mockCompanies = [
        { id: 'company-1', name: 'Company 1', companyNote: 'Note 1' },
        { id: 'company-2', name: 'Company 2', companyNote: null },
      ];

      companyService.findAllForUser.mockResolvedValue(mockCompanies as any);

      const result = await resolver.getAllCompanies(mockUser);

      expect(companyService.findAllForUser).toHaveBeenCalledWith(mockUser.id);
      expect(result).toEqual(mockCompanies);
    });
  });
});
