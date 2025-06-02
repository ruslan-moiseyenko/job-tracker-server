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

  async remove(id: string, userId: string): Promise<ApplicationStage> {
    // Verify the stage belongs to the user (can't delete system stages)
    const existingStage = await this.prisma.applicationStage.findFirst({
      where: {
        id,
        userId: userId,
      },
    });

    if (!existingStage) {
      throw new NotFoundError(
        'Application stage not found or cannot be deleted',
      );
    }

    // Just delete the stage - no need to compact orders with gap-based system
    return await this.prisma.applicationStage.delete({
      where: { id },
    });
  }

  /**
   * Move a stage to a new position relative to other stages
   * More intuitive than numeric ordering
   */
  async moveStage(
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
   * Swap the order of two stages
   * Convenient method for simple position swaps
   */
  async swapStageOrders(
    userId: string,
    stageId1: string,
    stageId2: string,
  ): Promise<ApplicationStage[]> {
    return await this.prisma.$transaction(async (tx) => {
      const [stage1, stage2] = await Promise.all([
        tx.applicationStage.findFirst({ where: { id: stageId1, userId } }),
        tx.applicationStage.findFirst({ where: { id: stageId2, userId } }),
      ]);

      if (!stage1 || !stage2) {
        throw new NotFoundError('One or more stages not found');
      }

      // Swap the orders
      const [updatedStage1, updatedStage2] = await Promise.all([
        tx.applicationStage.update({
          where: { id: stageId1 },
          data: { order: stage2.order },
        }),
        tx.applicationStage.update({
          where: { id: stageId2 },
          data: { order: stage1.order },
        }),
      ]);

      return [updatedStage1, updatedStage2];
    });
  }
}
