import { GraphQLError } from 'graphql';

export class AuthenticationError extends GraphQLError {
  constructor(message: string = 'Authentication failed') {
    super(message, {
      extensions: {
        code: 'UNAUTHENTICATED',
      },
    });
  }
}

export class ConfigurationError extends GraphQLError {
  constructor(message: string = 'Server configuration error') {
    super(message, {
      extensions: {
        code: 'CONFIGURATION_ERROR',
      },
    });
  }
}

export class ValidationError extends GraphQLError {
  constructor(message: string) {
    super(message, {
      extensions: {
        code: 'BAD_USER_INPUT',
      },
    });
  }
}

export class ConflictError extends GraphQLError {
  constructor(message: string) {
    super(message, {
      extensions: {
        code: 'CONFLICT',
      },
    });
  }
}
