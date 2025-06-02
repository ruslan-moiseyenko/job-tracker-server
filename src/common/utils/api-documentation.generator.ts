import { GraphQLGroupingUtility } from '../graphql/schema-grouping.plugin';

/**
 * Generate documentation for GraphQL API groups
 */
export class APIDocumentationGenerator {
  /**
   * Generate markdown documentation for all API groups
   */
  static generateGroupsDocumentation(): string {
    const groups = GraphQLGroupingUtility.getAllGroups();

    let markdown = '# GraphQL API Groups\n\n';
    markdown +=
      'This document provides an overview of all available API groups in the GraphQL schema.\n\n';

    groups.forEach((group, index) => {
      markdown += `## ${group.emoji} ${group.name}\n\n`;
      markdown += `${group.description}\n\n`;
      if (index < groups.length - 1) {
        markdown += '---\n\n';
      }
    });

    return markdown;
  }

  /**
   * Generate JSON schema for API groups
   */
  static generateGroupsSchema(): object {
    const groups = GraphQLGroupingUtility.getAllGroups();

    return {
      version: '1.0.0',
      description: 'GraphQL API Groups Schema',
      groups: groups.map((group) => ({
        id: group.name.toLowerCase().replace(/\s+/g, '_'),
        name: group.name,
        emoji: group.emoji,
        description: group.description,
      })),
    };
  }

  /**
   * Generate TypeScript interface for groups
   */
  static generateGroupsInterface(): string {
    const groups = GraphQLGroupingUtility.getAllGroups();

    let typescript = 'export interface APIGroup {\n';
    typescript += '  id: string;\n';
    typescript += '  name: string;\n';
    typescript += '  emoji: string;\n';
    typescript += '  description: string;\n';
    typescript += '}\n\n';

    typescript += 'export const API_GROUPS: APIGroup[] = [\n';
    groups.forEach((group, index) => {
      typescript += '  {\n';
      typescript += `    id: '${group.name.toLowerCase().replace(/\s+/g, '_')}',\n`;
      typescript += `    name: '${group.name}',\n`;
      typescript += `    emoji: '${group.emoji}',\n`;
      typescript += `    description: '${group.description}'\n`;
      typescript += `  }${index < groups.length - 1 ? ',' : ''}\n`;
    });
    typescript += '];\n';

    return typescript;
  }
}

// Export groups for external consumption
export const API_GROUPS_DOCUMENTATION =
  APIDocumentationGenerator.generateGroupsDocumentation();
export const API_GROUPS_SCHEMA =
  APIDocumentationGenerator.generateGroupsSchema();
export const API_GROUPS_INTERFACE =
  APIDocumentationGenerator.generateGroupsInterface();
