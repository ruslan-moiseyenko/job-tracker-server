import { Plugin } from '@nestjs/apollo';
import { ApolloServerPlugin, GraphQLRequestListener } from '@apollo/server';

/**
 * Apollo Server plugin to enhance GraphQL schema with grouping information
 */
@Plugin()
export class SchemaGroupingPlugin implements ApolloServerPlugin {
  serverWillStart() {
    return Promise.resolve();
  }

  requestDidStart(): Promise<GraphQLRequestListener<any>> {
    return Promise.resolve({
      willSendResponse(_requestContext) {
        // Add custom headers or modify response if needed
        return Promise.resolve();
      },
    });
  }
}

/**
 * Utility to organize GraphQL operations by groups
 */
export class GraphQLGroupingUtility {
  static readonly GROUPS = {
    AUTHENTICATION: {
      emoji: '🔐',
      name: 'Authentication',
      description: 'User authentication and authorization operations',
    },
    USER_PROFILE: {
      emoji: '👤',
      name: 'User Profile',
      description: 'User profile management operations',
    },
    JOB_APPLICATIONS: {
      emoji: '🔍',
      name: 'Job Applications',
      description: 'Job application tracking and management',
    },
    JOB_SEARCHES: {
      emoji: '🔎',
      name: 'Job Searches',
      description: 'Job search management and organization',
    },
    APPLICATION_STAGES: {
      emoji: '📊',
      name: 'Application Stages',
      description: 'Application stage workflow management',
    },
    COMPANIES: {
      emoji: '🏢',
      name: 'Companies',
      description: 'Company information management',
    },
    CONTACTS: {
      emoji: '👥',
      name: 'Contacts',
      description: 'Professional contacts management',
    },
  } as const;

  /**
   * Format description with group information
   */
  static formatDescription(
    group: keyof typeof GraphQLGroupingUtility.GROUPS,
    operation: string,
  ): string {
    const groupInfo = GraphQLGroupingUtility.GROUPS[group];
    return `${groupInfo.emoji} ${groupInfo.name}: ${operation}`;
  }

  /**
   * Get all group names for documentation
   */
  static getAllGroups(): Array<{
    name: string;
    description: string;
    emoji: string;
  }> {
    return Object.values(GraphQLGroupingUtility.GROUPS).map((group) => ({
      name: group.name,
      description: group.description,
      emoji: group.emoji,
    }));
  }
}
