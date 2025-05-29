// Simple test to debug the refreshTokens method
const jwt = require('jsonwebtoken');

// Mock the jwt.sign method the same way as in tests
jwt.sign = jest.fn().mockImplementation((payload, secret, options) => {
  if (secret === 'test_access_secret') return 'fakeAccessToken';
  if (secret === 'test_refresh_secret') return 'fakeRefreshToken';
  throw new Error('Invalid JWT secret');
});

// Mock configService.get
const configService = {
  get: jest.fn().mockImplementation((key) => {
    const values = {
      JWT_ACCESS_SECRET: 'test_access_secret',
      JWT_REFRESH_SECRET: 'test_refresh_secret',
      JWT_ACCESS_EXPIRATION: '900',
      JWT_REFRESH_EXPIRATION: '604800',
    };
    return values[key];
  }),
};

// Test the methods directly
function generateAccessToken(userId) {
  const secret = configService.get('JWT_ACCESS_SECRET');
  if (!secret) {
    throw new Error('JWT configuration is missing');
  }

  return jwt.sign({ sub: userId }, secret, {
    expiresIn: `${configService.get('JWT_ACCESS_EXPIRATION', '900')}s`,
  });
}

function generateRefreshToken() {
  const secret = configService.get('JWT_REFRESH_SECRET');
  if (!secret) {
    throw new Error('JWT configuration is missing');
  }

  return jwt.sign({}, secret, {
    expiresIn: `${configService.get('JWT_REFRESH_EXPIRATION', '604800')}s`,
  });
}

console.log('Access token:', generateAccessToken('user-id-1'));
console.log('Refresh token:', generateRefreshToken());
