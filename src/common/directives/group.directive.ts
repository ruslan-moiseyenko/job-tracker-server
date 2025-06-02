import { GraphQLDirective, DirectiveLocation, GraphQLString } from 'graphql';

/**
 * Custom GraphQL directive for grouping operations in schema documentation
 */
export const GroupDirective = new GraphQLDirective({
  name: 'group',
  description:
    'Groups operations together for better organization in GraphQL Playground and documentation',
  locations: [DirectiveLocation.FIELD_DEFINITION, DirectiveLocation.OBJECT],
  args: {
    name: {
      type: GraphQLString,
      description: 'The name of the group',
    },
    description: {
      type: GraphQLString,
      description: 'Optional description for the group',
    },
  },
});

/**
 * Decorator for applying the @group directive to GraphQL fields
 */
export const Group = (_name: string, _description?: string) => {
  return (
    target: any,
    propertyKey?: string,
    descriptor?: PropertyDescriptor,
  ) => {
    // This is a placeholder decorator - the actual directive is handled by GraphQL schema
    return descriptor;
  };
};
