import { GraphQLError } from 'graphql';

export class AuthenticationError extends GraphQLError {
  constructor(message: string) {
    super(message, {
      extensions: { code: 'UNAUTHENTICATED' },
    });
  }
}

export class ConfigurationError extends GraphQLError {
  constructor(message: string) {
    super(message, {
      extensions: { code: 'CONFIGURATION_ERROR' },
    });
  }
}

export class ConflictError extends GraphQLError {
  constructor(message: string) {
    super(message, {
      extensions: { code: 'CONFLICT' },
    });
  }
}

export class NotFoundError extends GraphQLError {
  constructor(message: string) {
    super(message, {
      extensions: { code: 'NOT_FOUND' },
    });
  }
}

export class OAuthError extends GraphQLError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, {
      extensions: { code: 'OAUTH_ERROR', ...details },
    });
  }
}

export class OAuthConfigError extends ConfigurationError {
  constructor(provider: string, missingConfig: string[]) {
    super(
      `Missing ${provider} OAuth configuration: ${missingConfig.join(', ')}`,
    );
  }
}
