# Cookie-Based Authentication Guide

This guide explains how to configure your frontend application to work with the new cookie-based authentication system.

## Overview

We've implemented a hybrid authentication system that:

1. Uses HTTP-only cookies for secure token storage
2. Maintains backward compatibility with the token-based approach (for existing clients)
3. Automatically detects which method to use based on context

## Apollo Client Configuration

To use cookie-based authentication with Apollo Client, you need to configure it to include credentials in requests:

```typescript
import { ApolloClient, InMemoryCache, createHttpLink } from '@apollo/client';

const httpLink = createHttpLink({
  uri: 'http://localhost:3000/graphql',
  credentials: 'include' // This is crucial for cookies to be sent
});

const client = new ApolloClient({
  link: httpLink,
  cache: new InMemoryCache()
});
```

### Important Configuration Properties

- `credentials: 'include'`: This ensures that cookies are sent with every request
- For cross-domain requests, the server has been configured to allow credentials with appropriate CORS headers

## Authentication Flow

### Login / Registration

The server now handles authentication with these steps:

1. When a user logs in/registers, the server:
   - Sets `access_token` and `refresh_token` as HTTP-only cookies
   - Returns user data in the response (tokens are only included in the response when cookies can't be set)

2. Example mutation:
  
```typescript
const LOGIN_MUTATION = gql`
  mutation Login($input: LoginInput!) {
    login(input: $input) {
      user {
        id
        email
        firstName
        lastName
      }
      # accessToken and refreshToken fields are now optional
      # they'll be null when cookies are used
      accessToken
      refreshToken
    }
  }
`;
```

### Token Refresh

The token refresh flow has been simplified:

1. Refresh mutation can be called without explicitly providing a token:

```typescript
const REFRESH_TOKEN_MUTATION = gql`
  mutation RefreshToken {
    refreshToken {
      success
    }
  }
`;
```

2. The server will:
   - Extract the refresh token from cookies
   - Generate new tokens and set them as cookies
   - Return a success boolean

3. Example usage:
```typescript
try {
  const { data } = await client.mutate({
    mutation: REFRESH_TOKEN_MUTATION
  });
  
  if (data.refreshToken.success) {
    // Tokens have been refreshed and stored in cookies
    // You can update your application state if needed
  }
} catch (error) {
  // Handle refresh token failure
  // Usually by redirecting to login
}

### Logout

Logout now properly cleans up both cookie-based and token-based auth:

```typescript
const LOGOUT_MUTATION = gql`
  mutation Logout {
    logout
  }
`;
```

## Client-Side State Management

With cookie-based authentication, you no longer need to:

1. Store tokens in localStorage/sessionStorage
2. Manually attach Authorization headers to requests
3. Handle token refresh logic on the client

You should still maintain authentication state in your application (isLoggedIn, userData) but the token management is now handled by the browser and server.

## Detecting Authentication Method

Your client can detect whether tokens are being used from cookies by checking if tokens are returned in auth responses:

```typescript
const { data } = await client.mutate({
  mutation: LOGIN_MUTATION,
  variables: { input: { email, password } }
});

// If tokens are returned in the response, cookies aren't being used
const usingCookies = !data.login.accessToken;

if (!usingCookies) {
  // Fall back to manual token management if needed
  localStorage.setItem('accessToken', data.login.accessToken);
}
```

## Security Benefits

Using HTTP-only cookies provides several security benefits:

1. Protection against XSS attacks - JavaScript cannot access the token
2. Automatic secure transmission - cookies are automatically sent with requests
3. Built-in expiration handling - browser manages cookie lifecycle

## Troubleshooting

If you encounter issues with cookie-based authentication:

1. Ensure `credentials: 'include'` is set in your Apollo Client configuration
2. Check that cookies are being set (look in browser dev tools > Application > Cookies)
3. Verify that CORS is properly configured for your domain
4. Test in an incognito window to avoid interference from browser extensions

### OAuth Authentication Flow

The OAuth flow (e.g., Google Sign-In) has been updated to use cookie-based authentication:

1. REST Endpoint Flow:
```typescript
// Initiating OAuth
window.location.href = '/auth/google';

// Handling the callback
// The server will set auth cookies and redirect to:
// /oauth-redirect?success=true
```

2. GraphQL Flow:
```typescript
const GOOGLE_AUTH_CALLBACK = gql`
  mutation GoogleAuthCallback($code: String!) {
    googleAuthCallback(code: $code) {
      success
      user {
        id
        email
        firstName
        lastName
      }
    }
  }
`;

// After receiving the code from Google:
const { data } = await client.mutate({
  mutation: GOOGLE_AUTH_CALLBACK,
  variables: { code }
});

if (data.googleAuthCallback.success) {
  // Authentication successful
  // Cookies have been set automatically
  // You can use data.googleAuthCallback.user to update your UI
}
```

Both flows now use HTTP-only cookies for token storage, providing better security and simpler client-side implementation
