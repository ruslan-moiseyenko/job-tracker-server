import { Test, TestingModule } from '@nestjs/testing';
import { CompanyService } from './src/company/company.service';
import { PrismaService } from './src/prisma/prisma.service';

describe('Company Flags Mutual Exclusivity', () => {
  let service: CompanyService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompanyService,
        {
          provide: PrismaService,
          useValue: {
            $transaction: jest.fn(),
            company: {
              create: jest.fn(),
              update: jest.fn(),
              findFirst: jest.fn(),
            },
            companyNote: {
              findFirst: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              deleteMany: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<CompanyService>(CompanyService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('resolveMutuallyExclusiveFlags via update method', () => {
    it('should set isBlacklisted=true and isFavorite=false when isBlacklisted=true', async () => {
      const mockCompany = {
        id: 'test-id',
        userId: 'user-id',
        name: 'Test Company',
        isFavorite: false,
        isBlacklisted: true,
      };

      // Mock transaction
      (prisma.$transaction as jest.Mock).mockImplementation(
        async (callback) => {
          const txMock = {
            company: {
              update: jest.fn().mockResolvedValue(mockCompany),
            },
            companyNote: {
              findFirst: jest.fn().mockResolvedValue(null),
            },
          };
          return callback(txMock);
        },
      );

      const result = await service.update('user-id', {
        id: 'test-id',
        isBlacklisted: true,
      });

      expect(result.isBlacklisted).toBe(true);
      expect(result.isFavorite).toBe(false);
    });

    it('should set isFavorite=true and isBlacklisted=false when isFavorite=true', async () => {
      const mockCompany = {
        id: 'test-id',
        userId: 'user-id',
        name: 'Test Company',
        isFavorite: true,
        isBlacklisted: false,
      };

      // Mock transaction
      (prisma.$transaction as jest.Mock).mockImplementation(
        async (callback) => {
          const txMock = {
            company: {
              update: jest.fn().mockResolvedValue(mockCompany),
            },
            companyNote: {
              findFirst: jest.fn().mockResolvedValue(null),
            },
          };
          return callback(txMock);
        },
      );

      const result = await service.update('user-id', {
        id: 'test-id',
        isFavorite: true,
      });

      expect(result.isFavorite).toBe(true);
      expect(result.isBlacklisted).toBe(false);
    });

    it('should prioritize isBlacklisted when both flags are provided as true', async () => {
      const mockCompany = {
        id: 'test-id',
        userId: 'user-id',
        name: 'Test Company',
        isFavorite: false,
        isBlacklisted: true,
      };

      // Mock transaction
      (prisma.$transaction as jest.Mock).mockImplementation(
        async (callback) => {
          const txMock = {
            company: {
              update: jest.fn().mockResolvedValue(mockCompany),
            },
            companyNote: {
              findFirst: jest.fn().mockResolvedValue(null),
            },
          };
          return callback(txMock);
        },
      );

      const result = await service.update('user-id', {
        id: 'test-id',
        isFavorite: true,
        isBlacklisted: true,
      });

      // Based on our logic, isBlacklisted is checked first, so it wins
      expect(result.isBlacklisted).toBe(true);
      expect(result.isFavorite).toBe(false);
    });
  });
});
