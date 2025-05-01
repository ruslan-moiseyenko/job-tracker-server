import { Injectable, Logger } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';

type EmailEvent = {
  type: 'PASSWORD_RESET' | 'EMAIL_CHANGE' | 'OTHER';
  recipient: string;
  result: 'SUCCESS' | 'FAILURE';
  timestamp: Date;
  details?: any;
};

@Injectable()
export class EmailMonitorService {
  private readonly logger = new Logger(EmailMonitorService.name);
  private emailEvents: EmailEvent[] = [];
  private readonly maxEventsToStore: number;

  constructor(
    private schedulerRegistry: SchedulerRegistry,
    private configService: ConfigService,
  ) {
    this.maxEventsToStore = this.configService.get<number>(
      'EMAIL_MONITOR_MAX_EVENTS',
      1000,
    );

    // Setup periodic logging
    this.setupPeriodicLogging();
  }

  /**
   * Record a new email sending event
   */
  recordEvent(event: Omit<EmailEvent, 'timestamp'>) {
    this.emailEvents.push({
      ...event,
      timestamp: new Date(),
    });

    // Trim the array if it gets too large
    if (this.emailEvents.length > this.maxEventsToStore) {
      this.emailEvents = this.emailEvents.slice(-this.maxEventsToStore);
    }

    // Log preview URLs for test emails
    if (event.result === 'SUCCESS' && event.details?.previewUrl) {
      this.logger.debug(
        `Email preview available at: ${event.details.previewUrl}`,
      );
    }
  }

  /**
   * Get email sending statistics
   */
  getStatistics() {
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const eventsLast24h = this.emailEvents.filter(
      (e) => e.timestamp >= last24h,
    );

    const totalSent = eventsLast24h.length;
    const successfulSent = eventsLast24h.filter(
      (e) => e.result === 'SUCCESS',
    ).length;
    const failedSent = eventsLast24h.filter(
      (e) => e.result === 'FAILURE',
    ).length;

    const byType = {
      PASSWORD_RESET: eventsLast24h.filter((e) => e.type === 'PASSWORD_RESET')
        .length,
      EMAIL_CHANGE: eventsLast24h.filter((e) => e.type === 'EMAIL_CHANGE')
        .length,
      OTHER: eventsLast24h.filter((e) => e.type === 'OTHER').length,
    };

    return {
      totalSent,
      successfulSent,
      failedSent,
      successRate: totalSent ? (successfulSent / totalSent) * 100 : 0,
      byType,
    };
  }

  /**
   * Get recent email failures
   */
  getRecentFailures(limit = 10) {
    return this.emailEvents
      .filter((e) => e.result === 'FAILURE')
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Get recent successful emails
   */
  getRecentSuccesses(limit = 10) {
    return this.emailEvents
      .filter((e) => e.result === 'SUCCESS')
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Setup periodic logging of email statistics
   */
  private setupPeriodicLogging() {
    const callback = () => {
      try {
        const stats = this.getStatistics();
        this.logger.log(`Email sending statistics (last 24h): 
          Total: ${stats.totalSent}, 
          Success rate: ${stats.successRate.toFixed(2)}%, 
          Password resets: ${stats.byType.PASSWORD_RESET}, 
          Email changes: ${stats.byType.EMAIL_CHANGE}`);

        const failures = this.getRecentFailures(5);
        if (failures.length > 0) {
          this.logger.warn(`Recent email failures: ${failures.length}`);
          failures.forEach((f) => {
            this.logger.warn(
              `Failed ${f.type} email to ${f.recipient} at ${f.timestamp.toISOString()}`,
            );
          });
        }
      } catch (error) {
        this.logger.error('Error logging email statistics', error);
      }
    };

    // Log once a day
    const interval = setInterval(callback, 24 * 60 * 60 * 1000);
    this.schedulerRegistry.addInterval('email-stats-logging', interval);
  }
}
