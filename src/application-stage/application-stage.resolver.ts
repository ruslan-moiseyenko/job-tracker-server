import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { User } from '@prisma/client';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { GqlThrottlerGuard } from 'src/common/guards/gql-throttler.guard';
import { ApplicationStageType } from 'src/job-application/entities/job-application.entity';
import { ApplicationStageService } from './application-stage.service';
import {
  CreateApplicationStageInputDto,
  UpdateApplicationStageInputDto,
  BulkReorderStagesInputDto,
  SwapStageOrdersInputDto,
  MoveStageInputDto,
} from 'src/application-stage/dto/application-stage.dto';

@Resolver(() => ApplicationStageType)
@UseGuards(GqlThrottlerGuard)
export class ApplicationStageResolver {
  constructor(
    private readonly applicationStageService: ApplicationStageService,
  ) {}

  @Query(() => [ApplicationStageType], { name: 'applicationStages' })
  async findAllApplicationStages(@CurrentUser() user: User) {
    return this.applicationStageService.findAllForUser(user.id);
  }

  @Query(() => ApplicationStageType, {
    name: 'applicationStage',
    nullable: true,
  })
  async findOneApplicationStage(
    @Args('id') id: string,
    @CurrentUser() user: User,
  ) {
    return this.applicationStageService.findOne(id, user.id);
  }

  @Mutation(() => ApplicationStageType)
  async createApplicationStage(
    @Args('input') input: CreateApplicationStageInputDto,
    @CurrentUser() user: User,
  ) {
    return this.applicationStageService.create(user.id, input);
  }

  @Mutation(() => ApplicationStageType)
  async updateApplicationStage(
    @Args('id') id: string,
    @Args('input') input: UpdateApplicationStageInputDto,
    @CurrentUser() user: User,
  ) {
    return this.applicationStageService.update(id, user.id, input);
  }

  @Mutation(() => ApplicationStageType)
  async removeApplicationStage(
    @Args('id') id: string,
    @CurrentUser() user: User,
  ) {
    return this.applicationStageService.remove(id, user.id);
  }

  // for drag-and-drop reordering
  @Mutation(() => [ApplicationStageType])
  async bulkReorderStages(
    @Args('input') input: BulkReorderStagesInputDto,
    @CurrentUser() user: User,
  ) {
    return this.applicationStageService.bulkReorderStages(user.id, input);
  }

  @Mutation(() => [ApplicationStageType])
  async swapStageOrders(
    @Args('input') input: SwapStageOrdersInputDto,
    @CurrentUser() user: User,
  ) {
    return this.applicationStageService.swapStageOrders(
      user.id,
      input.stageId1,
      input.stageId2,
    );
  }

  @Mutation(() => ApplicationStageType)
  async moveStage(
    @Args('input') input: MoveStageInputDto,
    @CurrentUser() user: User,
  ) {
    // Parse the position string
    let position: 'first' | 'last' | { after: string } | { before: string };

    if (input.position === 'first' || input.position === 'last') {
      position = input.position;
    } else if (input.position.startsWith('after:')) {
      position = { after: input.position.substring(6) };
    } else if (input.position.startsWith('before:')) {
      position = { before: input.position.substring(7) };
    } else {
      throw new Error(
        'Invalid position format. Use "first", "last", "after:stageId", or "before:stageId"',
      );
    }

    return this.applicationStageService.moveStage(
      user.id,
      input.stageId,
      position,
    );
  }
}
