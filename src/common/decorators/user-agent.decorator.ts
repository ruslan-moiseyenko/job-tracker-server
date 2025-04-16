import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { GqlContext } from 'src/common/types/graphql.context';

export const UserAgent = createParamDecorator(
  (data: unknown, context: ExecutionContext): string => {
    const gqlCtx = GqlExecutionContext.create(context);
    const ctx = gqlCtx.getContext<GqlContext>();
    return ctx.req.headers['user-agent'] || 'Unknown';
  },
);
