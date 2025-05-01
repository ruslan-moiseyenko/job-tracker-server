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
```

### Email Change

The email change flow allows users to update the email address associated with their account.

#### Process Flow

1. User requests to change their email by providing the new email address
2. System validates that the new email is not already in use
3. System generates a 6-digit verification code and stores it in Redis (expiration: 30 minutes)
4. System sends the verification code to the new email address
5. User enters the verification code to confirm ownership of the new email
6. System verifies the code, updates the user's email, and invalidates the code

#### Security Considerations

- Verification code is sent only to the new email address to confirm ownership
- Verification code has a limited validity period (30 minutes)
- System prevents changing to an email that's already associated with another account
- Original email is not changed until verification is complete

#### API Endpoints

```graphql
# Request email change
mutation RequestEmailChange($input: RequestEmailChangeInput!) {
  requestEmailChange(input: $input)
}

# Verify and complete email change
mutation VerifyEmailChange($input: VerifyEmailChangeInput!) {
  verifyEmailChange(input: $input)
}
```

## Email Templates

The application uses HTML email templates with text fallbacks for all communications. Templates include:

- Password reset emails
- Email change verification

## User Instructions

### Changing Your Email Address

To change the email address associated with your account:

1. Log in to your account
2. Go to your Profile Settings
3. Click "Change Email"
4. Enter your new email address and click "Send Verification Code"
5. Check your new email inbox for a message from Job Tracker
6. Enter the 6-digit verification code from the email
7. Your email address will be updated once the code is verified

**Note**: The verification code is valid for a limited time. If you don't use it within this time, you'll need to request a new one.
