import { BadRequestException, Catch } from '@nestjs/common';
import { GqlExceptionFilter } from '@nestjs/graphql';
import { GraphQLError } from 'graphql';

@Catch()
export class GraphQLErrorFilter implements GqlExceptionFilter {
  catch(exception: Error) {
    if (exception instanceof BadRequestException) {
      const response = exception.getResponse() as any;

      if (response.message && Array.isArray(response.message)) {
        return new GraphQLError('Validation failed', {
          extensions: {
            code: 'BAD_USER_INPUT',
            validationErrors: response.message,
          },
        });
      }

      return new GraphQLError(
        typeof response.message === 'string'
          ? (response.message as string)
          : 'Bad request',
        {
          extensions: {
            code: 'BAD_USER_INPUT',
          },
        },
      );
    }

    // for already handled exceptions
    if (exception instanceof GraphQLError) {
      return exception;
    }

    // for all other exceptions
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
