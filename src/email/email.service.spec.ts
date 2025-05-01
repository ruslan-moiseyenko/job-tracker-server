import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EmailService } from './email.service';
import { EmailMonitorService } from '../common/monitoring/email-monitor.service';
import { SchedulerRegistry } from '@nestjs/schedule';

// Mock nodemailer
jest.mock('nodemailer', () => {
  return {
    createTransport: jest.fn().mockImplementation(() => ({
      sendMail: jest.fn().mockResolvedValue({ messageId: 'test-message-id' }),
      verify: jest.fn().mockResolvedValue(true),
    })),
    getTestMessageUrl: jest
      .fn()
      .mockReturnValue('https://ethereal.email/message/test'),
    createTestAccount: jest.fn().mockResolvedValue({
      user: 'test@ethereal.email',
      pass: 'testpass',
    }),
  };
});

describe('EmailService', () => {
  let service: EmailService;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key, defaultValue) => {
              // Return mock values for config
              const configs = {
                EMAIL_SERVICE: 'gmail',
                EMAIL_USER: 'test@gmail.com',
                EMAIL_PASSWORD: 'test-password',
                EMAIL_FROM: 'test@gmail.com',
                EMAIL_FROM_NAME: 'Test Sender',
                FRONTEND_URL: 'http://localhost:3000',
                NODE_ENV: 'test',
                EMAIL_TEST_MODE: true,
              };
              return configs[key] || defaultValue;
            }),
          },
        },
        {
          provide: EmailMonitorService,
          useValue: {
            recordEvent: jest.fn(),
          },
        },
        {
          provide: SchedulerRegistry,
          useValue: {
            addInterval: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendEmail', () => {
    it('should send an email successfully', async () => {
      const emailOptions = {
        to: 'recipient@example.com',
        subject: 'Test Subject',
        html: '<p>Test content</p>',
        text: 'Test content',
      };

      const result = await service.sendEmail(emailOptions);

      expect(result.success).toBe(true);
      expect(result.id).toBe('test-message-id');
    });
  });

  describe('sendPasswordResetEmail', () => {
    it('should send password reset email', async () => {
      const sendEmailSpy = jest.spyOn(service, 'sendEmail').mockResolvedValue({
        success: true,
        id: 'reset-message-id',
      });

      const email = 'user@example.com';
      const context = {
        username: 'Test User',
        resetLink: 'http://example.com/reset?token=123',
        expiresIn: '60 minutes',
      };

      const result = await service.sendPasswordResetEmail(email, context);

      expect(result.success).toBe(true);
      expect(sendEmailSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          to: email,
          subject: expect.any(String),
          html: expect.stringContaining(context.resetLink),
          text: expect.stringContaining(context.resetLink),
        }),
      );
    });
  });

  describe('sendEmailChangeVerification', () => {
    it('should send email change verification', async () => {
      const sendEmailSpy = jest.spyOn(service, 'sendEmail').mockResolvedValue({
        success: true,
        id: 'verification-message-id',
      });

      const email = 'newemail@example.com';
      const context = {
        username: 'Test User',
        verificationCode: '123456',
        newEmail: 'newemail@example.com',
        expiresIn: '30 minutes',
      };

      const result = await service.sendEmailChangeVerification(email, context);

      expect(result.success).toBe(true);
      expect(sendEmailSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          to: email,
          subject: expect.any(String),
          html: expect.stringContaining(context.verificationCode),
          text: expect.stringContaining(context.verificationCode),
        }),
      );
    });
  });

  describe('generateVerificationCode', () => {
    it('should generate a 6-digit verification code', () => {
      const code = service.generateVerificationCode();

      expect(code.length).toBe(6);
      expect(code).toMatch(/^\d{6}$/); // Ensure it's 6 digits
    });
  });

  describe('generatePasswordResetLink', () => {
    it('should generate a password reset link with the token', () => {
      const token = 'test-reset-token';
      const link = service.generatePasswordResetLink(token);

      expect(link).toContain('reset-password');
      expect(link).toContain(token);
    });
  });
});
