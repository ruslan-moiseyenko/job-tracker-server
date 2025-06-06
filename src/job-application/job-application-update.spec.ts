import { Test, TestingModule } from '@nestjs/testing';
import { JobApplicationService } from './job-application.service';
import { PrismaService } from '../prisma/prisma.service';
import { CompanyService } from '../company/company.service';
import { NotFoundError } from '../common/exceptions/graphql.exceptions';

describe('JobApplicationService - Update Company', () => {
  let service: JobApplicationService;
  let prisma: jest.Mocked<PrismaService>;
  let companyService: jest.Mocked<CompanyService>;

  beforeEach(async () => {
    const mockPrismaService = {
      jobApplication: {
        findFirst: jest.fn(),
        update: jest.fn(),
      },
    };

    const mockCompanyService = {
      findCompanyById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobApplicationService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: CompanyService,
          useValue: mockCompanyService,
        },
      ],
    }).compile();

    service = module.get<JobApplicationService>(JobApplicationService);
    prisma = module.get<jest.Mocked<PrismaService>>(PrismaService);
    companyService = module.get<jest.Mocked<CompanyService>>(CompanyService);
  });

  describe('update with companyId', () => {
    it('should successfully update job application with new company', async () => {
      const applicationId = 'app-1';
      const userId = 'user-1';
      const newCompanyId = 'company-2';

      const existingApplication = {
        id: applicationId,
        companyId: 'company-1',
        positionTitle: 'Software Engineer',
        jobSearch: { userId },
      };

      const newCompany = {
        id: newCompanyId,
        name: 'New Company',
        userId,
      };

      const updatedApplication = {
        ...existingApplication,
        companyId: newCompanyId,
        company: newCompany,
        currentStage: null,
        jobSearch: { userId },
      };

      (prisma.jobApplication.findFirst as jest.Mock).mockResolvedValue(
        existingApplication as any,
      );
      (companyService.findCompanyById as jest.Mock).mockResolvedValue(
        newCompany as any,
      );
      (prisma.jobApplication.update as jest.Mock).mockResolvedValue(
        updatedApplication as any,
      );

      const result = await service.update(applicationId, userId, {
        companyId: newCompanyId,
      });

      expect(companyService.findCompanyById).toHaveBeenCalledWith(
        newCompanyId,
        userId,
      );
      expect(prisma.jobApplication.update).toHaveBeenCalledWith({
        where: { id: applicationId },
        data: { companyId: newCompanyId },
        include: {
          company: true,
          currentStage: true,
          jobSearch: true,
        },
      });
      expect(result.companyId).toBe(newCompanyId);
    });

    it('should throw NotFoundError if new company does not exist', async () => {
      const applicationId = 'app-1';
      const userId = 'user-1';
      const invalidCompanyId = 'invalid-company';

      const existingApplication = {
        id: applicationId,
        companyId: 'company-1',
        jobSearch: { userId },
      };

      (prisma.jobApplication.findFirst as jest.Mock).mockResolvedValue(
        existingApplication as any,
      );
      (companyService.findCompanyById as jest.Mock).mockResolvedValue(null);

      await expect(
        service.update(applicationId, userId, {
          companyId: invalidCompanyId,
        }),
      ).rejects.toThrow(NotFoundError);

      expect(companyService.findCompanyById).toHaveBeenCalledWith(
        invalidCompanyId,
        userId,
      );
      expect(prisma.jobApplication.update).not.toHaveBeenCalled();
    });

    it('should throw NotFoundError if new company belongs to different user', async () => {
      const applicationId = 'app-1';
      const userId = 'user-1';
      const otherUserCompanyId = 'company-2';

      const existingApplication = {
        id: applicationId,
        companyId: 'company-1',
        jobSearch: { userId },
      };

      (prisma.jobApplication.findFirst as jest.Mock).mockResolvedValue(
        existingApplication as any,
      );
      (companyService.findCompanyById as jest.Mock).mockResolvedValue(null); // Company not found for this user

      await expect(
        service.update(applicationId, userId, {
          companyId: otherUserCompanyId,
        }),
      ).rejects.toThrow('Company not found or access denied');

      expect(companyService.findCompanyById).toHaveBeenCalledWith(
        otherUserCompanyId,
        userId,
      );
      expect(prisma.jobApplication.update).not.toHaveBeenCalled();
    });

    it('should update other fields without company validation if companyId not provided', async () => {
      const applicationId = 'app-1';
      const userId = 'user-1';

      const existingApplication = {
        id: applicationId,
        companyId: 'company-1',
        positionTitle: 'Software Engineer',
        jobSearch: { userId },
      };

      const updatedApplication = {
        ...existingApplication,
        positionTitle: 'Senior Software Engineer',
        company: { id: 'company-1', name: 'Original Company' },
        currentStage: null,
        jobSearch: { userId },
      };

      (prisma.jobApplication.findFirst as jest.Mock).mockResolvedValue(
        existingApplication as any,
      );
      (prisma.jobApplication.update as jest.Mock).mockResolvedValue(
        updatedApplication as any,
      );

      const result = await service.update(applicationId, userId, {
        positionTitle: 'Senior Software Engineer',
      });

      expect(companyService.findCompanyById).not.toHaveBeenCalled();
      expect(prisma.jobApplication.update).toHaveBeenCalledWith({
        where: { id: applicationId },
        data: { positionTitle: 'Senior Software Engineer' },
        include: {
          company: true,
          currentStage: true,
          jobSearch: true,
        },
      });
      expect(result.positionTitle).toBe('Senior Software Engineer');
    });
  });
});
