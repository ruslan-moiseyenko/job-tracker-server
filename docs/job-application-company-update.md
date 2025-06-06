# Job Application Company Update Feature

## Overview

Added the ability to update the company associated with a JobApplication through the `updateJobApplication` mutation.

## Changes Made

### 1. Updated `UpdateJobApplicationInput` DTO

**File:** `src/job-application/dto/update-job-application.input.ts`

Added a new optional field:

```typescript
@Field({
  nullable: true,
  description: 'Company ID to associate with this application',
})
@IsOptional()
@IsString()
@IsUUID()
companyId?: string;
```

### 2. Enhanced JobApplicationService Update Method

**File:** `src/job-application/job-application.service.ts`

Added company validation when `companyId` is provided:

```typescript
// If companyId is being updated, verify the new company belongs to the user
if (updateJobApplicationInput.companyId) {
  const company = await this.companyService.findCompanyById(
    updateJobApplicationInput.companyId,
    userId,
  );

  if (!company) {
    throw new NotFoundError('Company not found or access denied');
  }
}
```

### 3. Updated GraphQL Schema

The GraphQL schema now includes the `companyId` field in `UpdateJobApplicationInput`:

```graphql
input UpdateJobApplicationInput {
  """Company ID to associate with this application"""
  companyId: String
  
  # ... other fields
}
```

## Usage Examples

### GraphQL Mutation

```graphql
mutation UpdateJobApplication($id: String!, $input: UpdateJobApplicationInput!) {
  updateJobApplication(id: $id, input: $input) {
    id
    positionTitle
    company {
      id
      name
    }
    currentStage {
      id
      name
    }
  }
}
```

### Example Variables

```json
{
  "id": "job-app-123",
  "input": {
    "companyId": "company-456",
    "positionTitle": "Senior Software Engineer"
  }
}
```

## Security & Validation

- **User Ownership:** The new company must belong to the same user who owns the job application
- **Company Existence:** The system validates that the company exists before updating
- **Error Handling:** Returns `NotFoundError` if company doesn't exist or belongs to another user
- **Optional Field:** If `companyId` is not provided, no company validation occurs

## API Behavior

1. **Successful Update:** Updates the job application with the new company and returns the updated record
2. **Company Not Found:** Throws `NotFoundError` with message "Company not found or access denied"
3. **Job Application Not Found:** Throws `NotFoundError` with message "Job application not found"
4. **No Company Change:** If `companyId` is not provided, the company remains unchanged

## Migration Notes

- This is a backward-compatible change
- Existing updateJobApplication calls will continue to work without modification
- The `companyId` field is optional, so it only validates when explicitly provided
- The `jobSearchId` field is still intentionally excluded from updates to maintain data integrity

## Use Cases

- **Company Correction:** User realizes they assigned the wrong company during initial creation
- **Company Merger:** User needs to update applications when companies merge
- **Better Organization:** User wants to standardize company references across applications
- **Data Cleanup:** User wants to consolidate duplicate company entries
