import { Injectable } from '@nestjs/common';
import { ApplicationStage } from '@prisma/client';
import {
  NotFoundError,
  ConflictError,
} from 'src/common/exceptions/graphql.exceptions';
import { PrismaService } from 'src/prisma/prisma.service';

export interface CreateApplicationStageInput {
  name: string;
  description?: string;
  color?: string;
  insertAfter?: string; // ID of stage to insert after (optional)
}

export interface UpdateApplicationStageInput {
  name?: string;
  description?: string;
  color?: string;
}

export interface ReorderStagesInput {
  stageId: string;
  newOrder: number;
}

export interface BulkReorderInput {
  stages: Array<{
    id: string;
    order: number;
  }>;
}

@Injectable()
export class ApplicationStageService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllForUser(userId: string): Promise<ApplicationStage[]> {
    return await this.prisma.applicationStage.findMany({
      where: { userId: userId },
      orderBy: {
        order: 'asc',
      },
    });
  }

  async findOne(id: string, userId: string): Promise<ApplicationStage | null> {
    return await this.prisma.applicationStage.findFirst({
      where: {
        id,
        OR: [{ userId: userId }, { userId: null }],
      },
    });
  }

  async create(
    userId: string,
    input: CreateApplicationStageInput,
  ): Promise<ApplicationStage> {
    // Check if a stage with this name already exists for the user (case-insensitive)
    const existingStage = await this.prisma.applicationStage.findFirst({
      where: {
        userId,
        name: {
          equals: input.name,
          mode: 'insensitive',
        },
      },
    });

    if (existingStage) {
      throw new ConflictError(
        `Application stage with name "${input.name}" already exists`,
      );
    }

    return await this.prisma.$transaction(async (tx) => {
      let newOrder: number;

      if (input.insertAfter) {
        // Insert after a specific stage
        const afterStage = await tx.applicationStage.findFirst({
          where: { id: input.insertAfter, userId },
        });

        if (!afterStage) {
          throw new NotFoundError('Stage to insert after not found');
        }

        // Find the next stage after the target position
        const nextStage = await tx.applicationStage.findFirst({
          where: {
            userId,
            order: { gt: afterStage.order },
          },
          orderBy: { order: 'asc' },
        });

        if (nextStage) {
          // Insert between afterStage and nextStage
          newOrder = Math.floor((afterStage.order + nextStage.order) / 2);

          // If there's no space between them, shift everything after and create space
          if (newOrder === afterStage.order) {
            await tx.applicationStage.updateMany({
              where: {
                userId,
                order: { gt: afterStage.order },
              },
              data: { order: { increment: 1000 } },
            });
            newOrder = afterStage.order + 500;
          }
        } else {
          // Insert at the end
          newOrder = afterStage.order + 1000;
        }
      } else {
        // Insert at the end by default
        const lastStage = await tx.applicationStage.findFirst({
          where: { userId },
          orderBy: { order: 'desc' },
        });

        newOrder = lastStage ? lastStage.order + 1000 : 1000;
      }

      return await tx.applicationStage.create({
        data: {
          name: input.name,
          description: input.description,
          color: input.color,
          order: newOrder,
          userId,
        },
      });
    });
  }

  async update(
    id: string,
    userId: string,
    input: UpdateApplicationStageInput,
  ): Promise<ApplicationStage> {
    // Get the existing stage and check if name conflicts in one query
    const [existingStage, conflictingStage] = await Promise.all([
      // Check if stage exists and belongs to user
      this.prisma.applicationStage.findFirst({
        where: {
          id,
          userId: userId,
        },
      }),
      // Check for name conflicts only if name is being updated
      input.name
        ? this.prisma.applicationStage.findFirst({
            where: {
              userId,
              name: {
                equals: input.name,
                mode: 'insensitive',
              },
              id: { not: id }, // Exclude the current stage being updated
            },
          })
        : null,
    ]);

    if (!existingStage) {
      throw new NotFoundError(
        'Application stage name is not unique or cannot be found',
      );
    }

    if (
      conflictingStage &&
      input.name &&
      input.name.toLowerCase() !== existingStage.name.toLowerCase()
    ) {
      throw new ConflictError(
        `Application stage with name "${input.name}" already exists`,
      );
    }

    return await this.prisma.applicationStage.update({
      where: { id },
      data: input,
    });
  }

  async delete(id: string, userId: string): Promise<ApplicationStage> {
    return await this.prisma.$transaction(async (tx) => {
      // First, get the stage to verify it exists and belongs to user
      const existingStage = await tx.applicationStage.findFirst({
        where: {
          id,
          userId,
        },
      });

      if (!existingStage) {
        throw new NotFoundError(
          'Application stage not found or cannot be deleted',
        );
      }

      // Check if the stage is currently being used by any applications
      const applicationUsingStage = await tx.jobApplication.findFirst({
        where: {
          currentStageId: id,
          jobSearch: {
            userId, // Check if applications belongs to the user
          },
        },
      });

      if (applicationUsingStage) {
        throw new ConflictError(
          `Cannot delete stage "${existingStage.name}" because it is currently being used by applications. Please move applications to a different stage first.`,
        );
      }

      // Get users who have more than 1 stage using raw query
      const usersWithMultipleStages = await tx.$queryRaw<{ user_id: string }[]>`
        SELECT "user_id" 
        FROM "application_stages" 
        WHERE "user_id" = ${userId}
        GROUP BY "user_id" 
        HAVING COUNT(*) > 1
      `;

      // Attempt to delete only if this user has more than 1 stage
      const deleteResult = await tx.applicationStage.deleteMany({
        where: {
          id,
          userId: {
            in: usersWithMultipleStages.map((r) => r.user_id),
          },
        },
      });

      // If nothing was deleted, it means this was the last stage
      if (deleteResult.count === 0) {
        throw new ConflictError(
          'Cannot delete the last application stage. At least one stage must exist.',
        );
      }

      // Return the stage that was deleted
      return existingStage;
    });
  }

  /**
   * Move a stage to a new position relative to other stages
   */
  async reorderStage(
    userId: string,
    stageId: string,
    position: 'first' | 'last' | { after: string } | { before: string },
  ): Promise<ApplicationStage> {
    return await this.prisma.$transaction(async (tx) => {
      const currentStage = await tx.applicationStage.findFirst({
        where: { id: stageId, userId },
      });

      if (!currentStage) {
        throw new NotFoundError('Application stage not found');
      }

      let newOrder: number;

      if (position === 'first') {
        const firstStage = await tx.applicationStage.findFirst({
          where: { userId },
          orderBy: { order: 'asc' },
        });
        newOrder = firstStage ? firstStage.order - 1000 : 1000;
      } else if (position === 'last') {
        const lastStage = await tx.applicationStage.findFirst({
          where: { userId },
          orderBy: { order: 'desc' },
        });
        newOrder = lastStage ? lastStage.order + 1000 : 1000;
      } else if ('after' in position) {
        const afterStage = await tx.applicationStage.findFirst({
          where: { id: position.after, userId },
        });
        if (!afterStage) {
          throw new NotFoundError('Reference stage not found');
        }

        const nextStage = await tx.applicationStage.findFirst({
          where: { userId, order: { gt: afterStage.order } },
          orderBy: { order: 'asc' },
        });

        if (nextStage) {
          newOrder = Math.floor((afterStage.order + nextStage.order) / 2);
          if (newOrder === afterStage.order) {
            // No space, create some
            await tx.applicationStage.updateMany({
              where: { userId, order: { gt: afterStage.order } },
              data: { order: { increment: 1000 } },
            });
            newOrder = afterStage.order + 500;
          }
        } else {
          newOrder = afterStage.order + 1000;
        }
      } else if ('before' in position) {
        const beforeStage = await tx.applicationStage.findFirst({
          where: { id: position.before, userId },
        });
        if (!beforeStage) {
          throw new NotFoundError('Reference stage not found');
        }

        const prevStage = await tx.applicationStage.findFirst({
          where: { userId, order: { lt: beforeStage.order } },
          orderBy: { order: 'desc' },
        });

        if (prevStage) {
          newOrder = Math.floor((prevStage.order + beforeStage.order) / 2);
          if (newOrder === prevStage.order) {
            // No space, create some
            await tx.applicationStage.updateMany({
              where: { userId, order: { gte: beforeStage.order } },
              data: { order: { increment: 1000 } },
            });
            newOrder = prevStage.order + 500;
          }
        } else {
          newOrder = beforeStage.order - 1000;
        }
      } else {
        throw new Error('Invalid position specified');
      }

      return await tx.applicationStage.update({
        where: { id: stageId },
        data: { order: newOrder },
      });
    });
  }

  /**
   * Bulk reorder multiple stages at once
   * More efficient for drag-and-drop reordering operations
   */
  async bulkReorderStages(
    userId: string,
    reorderData: BulkReorderInput,
  ): Promise<ApplicationStage[]> {
    return await this.prisma.$transaction(async (tx) => {
      // Validate all stages belong to the user
      const stageIds = reorderData.stages.map((s) => s.id);
      const existingStages = await tx.applicationStage.findMany({
        where: { id: { in: stageIds }, userId },
      });

      if (existingStages.length !== stageIds.length) {
        throw new NotFoundError('One or more stages not found');
      }

      // Validate no duplicate orders
      const orders = reorderData.stages.map((s) => s.order);
      const uniqueOrders = new Set(orders);
      if (orders.length !== uniqueOrders.size) {
        throw new ConflictError('Duplicate orders provided');
      }

      // Update all stages with their new orders
      const updatePromises = reorderData.stages.map((stage) =>
        tx.applicationStage.update({
          where: { id: stage.id },
          data: { order: stage.order },
        }),
      );

      return await Promise.all(updatePromises);
    });
  }

  /**
   * Create default application stages for a new user
   */
  async createDefaultStagesForUser(
    userId: string,
    prismaClient?: any,
  ): Promise<ApplicationStage[]> {
    const client = prismaClient || this.prisma;

    const defaultStages = [
      {
        name: 'Applied',
        description: 'Application submitted',
        color: '#3498db',
        order: 1000,
        userId,
      },
      {
        name: 'Interview',
        description: 'Interview scheduled',
        color: '#f39c12',
        order: 2000,
        userId,
      },
      {
        name: 'Feedback',
        description: 'Waiting for feedback',
        color: '#9b59b6',
        order: 3000,
        userId,
      },
      {
        name: 'Offer',
        description: 'Received an offer',
        color: '#27ae60',
        order: 4000,
        userId,
      },
      {
        name: 'Rejection',
        description: 'Application rejected',
        color: '#e74c3c',
        order: 5000,
        userId,
      },
    ];

    return Promise.all(
      defaultStages.map((stage) =>
        client.applicationStage.create({ data: stage }),
      ),
    );
  }

  /**
   * Get applications that would be affected by deleting a stage
   * Useful for showing warnings to users before deletion
   */
  async getApplicationsUsingStage(
    stageId: string,
    userId: string,
  ): Promise<{ count: number; applicationTitles: string[] }> {
    const applications = await this.prisma.jobApplication.findMany({
      where: {
        currentStageId: stageId,
        jobSearch: {
          userId,
        },
      },
      select: {
        id: true,
        positionTitle: true,
        company: {
          select: {
            name: true,
          },
        },
      },
      take: 5, // Limit to first 5 for display purposes
    });

    return {
      count: applications.length,
      applicationTitles: applications.map(
        (app) =>
          `${app.positionTitle || 'Untitled Position'} at ${app.company.name}`,
      ),
    };
  }
}
