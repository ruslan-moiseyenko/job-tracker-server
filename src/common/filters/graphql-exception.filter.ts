import { BadRequestException, Catch } from '@nestjs/common';
import { GqlExceptionFilter } from '@nestjs/graphql';
import { GraphQLError } from 'graphql';

@Catch()
export class GraphQLErrorFilter implements GqlExceptionFilter {
  catch(exception: Error) {
    if (exception instanceof BadRequestException) {
      const response = exception.getResponse() as any;

      if (response.message && Array.isArray(response.message)) {
        // Format validation messages in a readable way
        const formattedMessages = response.message
          .map((error: any) => {
            if (typeof error === 'object' && error !== null) {
              // If the error is an object, try to extract meaningful properties
              const constraints = error.constraints
                ? Object.values(
                    error.constraints as Record<string, string>,
                  ).join(', ')
                : '';
              const property = error.property ? `${error.property}: ` : '';
              return property + (constraints || JSON.stringify(error));
            }
            return String(error);
          })
          .join('; ');

        return new GraphQLError(`Validation failed: ${formattedMessages}`, {
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
