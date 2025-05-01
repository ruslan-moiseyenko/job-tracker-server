import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { ConfigurationError } from 'src/common/exceptions/graphql.exceptions';
import { EmailMonitorService } from 'src/common/monitoring/email-monitor.service';
import {
  EmailChangeEmailContext,
  PasswordResetEmailContext,
} from 'src/email/email.interfaces';
import { EmailTemplates } from 'src/email/email.templates';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;
  private readonly defaultFromEmail: string | undefined;
  private readonly defaultFromName: string | undefined;
  private readonly frontendUrl: string;
  private readonly testMode: boolean;

  constructor(
    private configService: ConfigService,
    private readonly emailMonitorService: EmailMonitorService,
  ) {
    // Check if we're in test mode
    // this.testMode =
    //   this.configService.get<string>('NODE_ENV') !== 'production' &&
    //   this.configService.get<boolean>('EMAIL_TEST_MODE', false);
    this.testMode = false;
    this.logger.debug(
      `Email service initialized in ${this.testMode ? 'TEST' : 'PRODUCTION'} mode`,
    );

    this.defaultFromEmail = this.configService.get<string>('EMAIL_FROM');
    if (!this.defaultFromEmail) {
      this.logger.error('EMAIL_FROM is not set in the configuration');
      throw new ConfigurationError(
        'EMAIL_FROM is not set in the configuration',
      );
    }

    this.defaultFromName = this.configService.get<string>('EMAIL_FROM_NAME');
    if (!this.defaultFromEmail) {
      this.logger.error('EMAIL_FROM_NAME is not set in the configuration');
      throw new ConfigurationError(
        'EMAIL_FROM_NAME is not set in the configuration',
      );
    }

    this.frontendUrl = this.configService.get<string>(
      'FRONTEND_URL',
      'http://localhost:3000',
    );

    // Initialize Nodemailer asynchronously
    this.initializeTransport().catch((error) => {
      this.logger.error('Error during transport initialization', error);
    });
  }

  /**
   * Initialize email transport based on configuration
   */
  private async initializeTransport(): Promise<void> {
    try {
      if (!this.testMode) {
        await this.initializeProductionTransport();
      } else {
        await this.initializeTestTransport();
      }
    } catch (error) {
      this.logger.error('Failed to initialize email transport', error);
      // Create a fallback mock transport
      this.createMockTransport();
    }
  }

  /**
   * Initialize production transport using real SMTP server
   */
  private async initializeProductionTransport(): Promise<void> {
    const emailService = this.configService.get<string>(
      'EMAIL_SERVICE',
      'gmail',
    );
    const emailUser = this.configService.get<string>('EMAIL_USER');
    const emailPass = this.configService.get<string>('EMAIL_PASSWORD');
    const emailHost = this.configService.get<string>('EMAIL_HOST');
    const emailPort = this.configService.get<number>('EMAIL_PORT');

    if (!emailUser || !emailPass) {
      throw new Error('EMAIL_USER or EMAIL_PASSWORD is not defined');
    }

    // Create configuration based on service or host/port
    if (emailService && emailService !== 'custom') {
      // Using named service (gmail, outlook, etc.)
      this.transporter = nodemailer.createTransport({
        service: emailService,
        auth: {
          user: emailUser,
          pass: emailPass,
        },
      });
    } else if (emailHost && emailPort) {
      // Using custom SMTP server
      this.transporter = nodemailer.createTransport({
        host: emailHost,
        port: emailPort,
        secure: emailPort === 465, // true for 465, false for other ports
        auth: {
          user: emailUser,
          pass: emailPass,
        },
      });
    } else {
      throw new Error(
        'Invalid email configuration. Provide either EMAIL_SERVICE or EMAIL_HOST/EMAIL_PORT',
      );
    }

    // Verify connection
    await this.verifyConnection();
    this.logger.log('Email service initialized with production settings');
  }

  /**
   * Initialize test transport using Ethereal for development
   */
  private async initializeTestTransport(): Promise<void> {
    this.logger.warn(
      'Email service running in TEST MODE - emails will be captured but not delivered',
    );

    // Get test account from Ethereal
    const testAccount = await nodemailer.createTestAccount();

    // Create a test transporter
    this.transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });

    this.logger.debug(`Test email account created: ${testAccount.user}`);
  }

  /**
   * Create a mock transport as fallback
   */
  private createMockTransport(): void {
    this.logger.warn('Using mock email transport - no emails will be sent');

    this.transporter = {
      sendMail: (options) => {
        this.logger.debug(`[MOCK] Would send email:`, {
          to: options.to,
          subject: options.subject,
          text: options.text?.substring(0, 100) + '...',
        });
        return { messageId: `mock-${Date.now()}` };
      },
      verify: () => true,
    } as any;
  }

  /**
   * Verify connection to the mail server
   */
  private async verifyConnection(): Promise<void> {
    try {
      await this.transporter.verify();
      this.logger.log('Email service connected successfully');
    } catch (error) {
      this.logger.error('Failed to connect to email server', error);
      throw error;
    }
  }

  /**
   * Send an email using Nodemailer
   */
  async sendEmail(options: {
    to: string | string[];
    subject: string;
    html: string;
    text?: string;
    from?: string;
    replyTo?: string;
  }): Promise<{
    success: boolean;
    id?: string;
    error?: any;
    previewUrl?: string;
  }> {
    try {
      const { to, subject, html, text, from, replyTo } = options;

      const fromField =
        from || `${this.defaultFromName} <${this.defaultFromEmail}>`;

      const result = await this.transporter.sendMail({
        from: fromField,
        to: Array.isArray(to) ? to.join(', ') : to,
        subject,
        html,
        text,
        replyTo,
      });

      let previewUrl: string | undefined;

      // If in test mode and using Ethereal, get preview URL
      if (this.testMode) {
        const testMessageUrl = nodemailer.getTestMessageUrl(result);
        previewUrl =
          typeof testMessageUrl === 'string' ? testMessageUrl : undefined;
        if (previewUrl) {
          this.logger.debug(`Test email preview URL: ${previewUrl}`);
        }
      }

      this.logger.log(
        `Email sent successfully to ${to.toString()}, ID: ${result.messageId}`,
      );
      return { success: true, id: result.messageId, previewUrl };
    } catch (error) {
      this.logger.error('Failed to send email', error);
      return { success: false, error };
    }
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(
    email: string,
    context: PasswordResetEmailContext,
  ) {
    const template = EmailTemplates.passwordReset(context);
    const result = await this.sendEmail({
      to: email,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });

    // Record the event for monitoring
    this.emailMonitorService?.recordEvent({
      type: 'PASSWORD_RESET',
      recipient: email,
      result: result.success ? 'SUCCESS' : 'FAILURE',
      details: result.success
        ? { id: result.id, previewUrl: result.previewUrl }
        : { error: result.error },
    });

    return result;
  }

  /**
   * Send email verification for email change
   */
  async sendEmailChangeVerification(
    email: string,
    context: EmailChangeEmailContext,
  ) {
    const template = EmailTemplates.emailChange(context);
    const result = await this.sendEmail({
      to: email,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });

    // Record the event for monitoring
    this.emailMonitorService?.recordEvent({
      type: 'EMAIL_CHANGE',
      recipient: email,
      result: result.success ? 'SUCCESS' : 'FAILURE',
      details: result.success
        ? { id: result.id, previewUrl: result.previewUrl }
        : { error: result.error },
    });

    return result;
  }

  /**
   * Generate a random  6-digit numeric verification code
   */
  generateVerificationCode(): string {
    // Generate a 6-digit numeric code
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Generate a password reset link
   * @returns The complete password reset link
   */
  generatePasswordResetLink(token: string): string {
    return `${this.frontendUrl}/reset-password?token=${token}`;
  }

  /**
   * Generate an email verification link
   * @param token - The token to be included in the link
   * @returns The complete email verification link as a string
   */
  generateEmailVerificationLink(token: string): string {
    return `${this.frontendUrl}/verify-email?token=${token}`;
  }
}
