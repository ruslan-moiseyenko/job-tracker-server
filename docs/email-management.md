# Email Management Documentation

This document describes the email functionality in the Job Tracker application, including email verification, password reset, and email change processes.

## Technologies Used

- **Email Service**: Resend API
- **Token Storage**: Redis
- **API Layer**: GraphQL

## Features

### Password Reset

The password reset flow allows users to regain access to their account if they've forgotten their password.

#### Process Flow

1. User requests password reset by providing their email address
2. System generates a unique token and stores it in Redis (expiration: 60 minutes)
3. System sends an email with reset link to the user's email address
4. User clicks the link and sets a new password
5. System verifies the token, updates the password, and invalidates the token

#### API Endpoints

```graphql
# Request password reset
mutation RequestPasswordReset($input: RequestPasswordResetInput!) {
  requestPasswordReset(input: $input)
}

# Reset password using token
mutation ResetPassword($input: ResetPasswordInput!) {
  resetPassword(input: $input)
}
