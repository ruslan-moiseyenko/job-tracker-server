import { Catch } from '@nestjs/common';
import { GqlExceptionFilter } from '@nestjs/graphql';
import { GraphQLError } from 'graphql';

@Catch()
export class GraphQLErrorFilter implements GqlExceptionFilter {
  catch(exception: Error) {
    if (exception instanceof GraphQLError) {
      return exception;
    }

    return new GraphQLError(exception.message, {
      extensions: {
        code: 'INTERNAL_SERVER_ERROR',
        ...(process.env.NODE_ENV === 'development' && {
          stacktrace: exception.stack,
        }),
      },
    });
  }
}
