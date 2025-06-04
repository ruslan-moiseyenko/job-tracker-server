import { Test, TestingModule } from '@nestjs/testing';
import { CompanyService } from './company.service';
import { PrismaService } from '../prisma/prisma.service';
import { Company } from '@prisma/client';

describe('CompanyService - Search Functionality', () => {
  let service: CompanyService;
  let prismaService: PrismaService;

  const mockUser = { id: 'user-1' };
  const mockCompanies: Partial<Company>[] = [
    { id: '1', name: 'Apple Inc', userId: 'user-1' },
    { id: '2', name: 'Google LLC', userId: 'user-1' },
    { id: '3', name: 'Microsoft Corporation', userId: 'user-1' },
    { id: '4', name: 'Amazon.com Inc', userId: 'user-1' },
    { id: '5', name: 'Meta Platforms Inc', userId: 'user-1' },
    { id: '6', name: 'Application Software Company', userId: 'user-1' },
  ];

  beforeEach(async () => {
    const mockPrismaService = {
      company: {
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompanyService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<CompanyService>(CompanyService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  describe('searchCompanies', () => {
    it('should prioritize "starts with" matches over "contains" matches', async () => {
      // Mock the first call (startsWith) returning Apple
      (prismaService.company.findMany as jest.Mock)
        .mockResolvedValueOnce([{ id: '1', name: 'Apple Inc' }]) // startsWith results
        .mockResolvedValueOnce([
          { id: '6', name: 'Application Software Company' },
        ]); // contains results

      const result = await service.searchCompanies('App', mockUser.id);

      expect(result).toHaveLength(2);
      expect(result![0].name).toBe('Apple Inc'); // "starts with" result first
      expect(result![1].name).toBe('Application Software Company'); // "contains" result second

      // Verify the correct queries were made
      expect(prismaService.company.findMany).toHaveBeenCalledTimes(2);

      // First call should search for startsWith
      expect(prismaService.company.findMany).toHaveBeenNthCalledWith(1, {
        select: { id: true, name: true },
        where: {
          userId: mockUser.id,
          name: { startsWith: 'App', mode: 'insensitive' },
        },
        orderBy: { name: 'asc' },
        take: 10,
      });

      // Second call should search for contains but exclude startsWith
      expect(prismaService.company.findMany).toHaveBeenNthCalledWith(2, {
        select: { id: true, name: true },
        where: {
          userId: mockUser.id,
          name: { contains: 'App', mode: 'insensitive' },
          NOT: { name: { startsWith: 'App', mode: 'insensitive' } },
        },
        orderBy: { name: 'asc' },
        take: 9, // 10 - 1 (startsWith result)
      });
    });

    it('should return empty array for empty search term', async () => {
      const result = await service.searchCompanies('', mockUser.id);
      expect(result).toEqual([]);
      expect(prismaService.company.findMany).not.toHaveBeenCalled();
    });

    it('should return empty array for whitespace-only search term', async () => {
      const result = await service.searchCompanies('   ', mockUser.id);
      expect(result).toEqual([]);
      expect(prismaService.company.findMany).not.toHaveBeenCalled();
    });

    it('should return only startsWith results if 10 or more found', async () => {
      const tenResults = Array.from({ length: 10 }, (_, i) => ({
        id: `${i + 1}`,
        name: `App Company ${i + 1}`,
      }));

      (prismaService.company.findMany as jest.Mock).mockResolvedValueOnce(
        tenResults,
      );

      const result = await service.searchCompanies('App', mockUser.id);

      expect(result).toHaveLength(10);
      expect(result).toEqual(tenResults);

      // Should only call once since we got enough results from startsWith
      expect(prismaService.company.findMany).toHaveBeenCalledTimes(1);
    });

    it('should trim search input', async () => {
      (prismaService.company.findMany as jest.Mock)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      await service.searchCompanies('  Apple  ', mockUser.id);

      expect(prismaService.company.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            name: { startsWith: 'Apple', mode: 'insensitive' },
          }),
        }),
      );
    });
  });
});
