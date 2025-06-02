# GraphQL API Organization

This document describes how the GraphQL API is organized to provide better developer experience and easier navigation in GraphQL Playground.

## API Groups

Our GraphQL API is organized into logical groups, each identified with an emoji and clear naming convention:

### 🔐 Authentication
- **Purpose**: User authentication and authorization operations
- **Operations**:
  - `register` - Register a new user account
  - `login` - Login with email and password
  - `logout` - Logout user and invalidate tokens
  - `refreshToken` - Refresh access token using refresh token
  - `googleAuth` - Google OAuth authentication
  - `googleAuthCallback` - Handle Google OAuth callback

### 👤 User Profile
- **Purpose**: User profile management operations  
- **Operations**:
  - `me` - Get current user information
  - `updateUserProfile` - Update user profile information
  - `changePassword` - Change user password
  - `setLastActiveSearch` - Set the last active job search
  - `requestEmailChange` - Request to change email address
  - `verifyEmailChange` - Verify email change with code
  - `requestPasswordReset` - Request a password reset
  - `resetPassword` - Reset password using token

### 🔍 Job Applications
- **Purpose**: Job application tracking and management
- **Operations**:
  - `createJobApplication` - Create a new job application
  - `jobApplications` - Get all job applications for current user
  - `jobApplicationsBySearch` - Get job applications filtered by job search
  - `jobApplication` - Get a specific job application by ID
  - `updateJobApplication` - Update an existing job application
  - `removeJobApplication` - Delete a job application

### 🔎 Job Searches
- **Purpose**: Job search management and organization
- **Operations**:
  - `createJobSearch` - Create a new job search
  - `getAllJobSearches` - Get all job searches with optional filtering and pagination
  - `getJobSearchById` - Get a specific job search by ID
  - `updateJobSearch` - Update an existing job search
  - `deleteJobSearch` - Delete a job search
  - `getLastActiveSearch` - Get the last active job search ID

### 📊 Application Stages
- **Purpose**: Application stage workflow management
- **Operations**:
  - `applicationStages` - Get all application stages for current user
  - `applicationStage` - Get a specific application stage by ID
  - `createApplicationStage` - Create a new application stage
  - `updateApplicationStage` - Update an existing application stage
  - `removeApplicationStage` - Delete an application stage
  - `moveStage` - Move stage to different position
  - `swapStageOrders` - Swap the order of two stages
  - `bulkReorderStages` - Reorder multiple stages at once

### 🏢 Companies
- **Purpose**: Company information management
- **Operations**:
  - `company` - Get all companies or a specific company by ID
  - `createCompany` - Create a new company
  - `updateCompany` - Update an existing company
  - `removeCompany` - Delete a company

### 👥 Contacts
- **Purpose**: Professional contacts management
- **Operations**:
  - `getAllContacts` - Get all contacts
  - `getContactById` - Get a specific contact by ID

## Visual Organization in GraphQL Playground

When you open GraphQL Playground at `http://localhost:3000/graphql`, you'll notice:

1. **Emoji Prefixes**: Each operation is prefixed with a relevant emoji to quickly identify its category
2. **Consistent Naming**: Operations follow a clear naming pattern within each group
3. **Descriptive Documentation**: Each operation includes a detailed description explaining its purpose
4. **Logical Grouping**: Related operations are visually grouped together

## Implementation Details

The organization is implemented using:

- **GraphQL Descriptions**: Each resolver method includes a `description` property with emoji and group information
- **Utility Class**: `GraphQLGroupingUtility` provides consistent formatting and group definitions
- **TypeScript Enums**: Group definitions are centralized and type-safe

### Example Usage in Resolvers

```typescript
@Mutation(() => JobApplicationType, { 
  description: GraphQLGroupingUtility.formatDescription('JOB_APPLICATIONS', 'Create a new job application')
})
async createJobApplication(/* ... */) {
  // Implementation
}
```

## Benefits

1. **Better Developer Experience**: Developers can quickly find relevant operations
2. **Improved Documentation**: Clear, consistent descriptions for all operations
3. **Easier Navigation**: Visual grouping in GraphQL Playground
4. **Maintainable Code**: Centralized group definitions and consistent patterns
5. **Type Safety**: TypeScript ensures consistent group names and formatting

## Future Enhancements

Potential improvements to consider:

1. **GraphQL Federation**: Split into separate schemas by domain
2. **Custom Directives**: Add `@group` directive for automatic organization
3. **Schema Documentation**: Generate documentation from group definitions
4. **API Versioning**: Group-based versioning strategy
