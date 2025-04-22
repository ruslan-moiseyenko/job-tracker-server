import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { AuthService } from './auth.service';
// import { OAuth2Client } from 'google-auth-library';
import { User } from '@prisma/client';
import { JwtPayload, Secret, SignOptions } from 'jsonwebtoken';
import {
  AuthenticationError,
  ConfigurationError,
  ConflictError,
  OAuthError,
} from '../common/exceptions/graphql.exceptions';
import { LoginInput, OAuthUser, RegisterInput } from './auth.dto';

// --- Моки внешних зависимостей ---
// (Вам нужно будет создать более полные и реалистичные моки)

// Mock implementation for transactions
const mockTransaction = jest.fn().mockImplementation(async (callback) => {
  try {
    return await callback(mockPrismaService);
  } catch (error) {
    if (error?.code === 'P2002') {
      throw error;
    }
    throw new Error('Transaction failed: ' + error.message);
  }
});

// Update PrismaService mock with transaction support
const mockPrismaService = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
  token: {
    findUnique: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
  },
  userOAuthConnection: {
    findUnique: jest.fn(),
    create: jest.fn(),
    findMany: jest.fn(),
    delete: jest.fn(),
    findFirst: jest.fn(),
  },
  $transaction: mockTransaction,
};

// Create a base mock config and make it immutable to prevent accidental modifications
const mockConfigValues = Object.freeze({
  JWT_ACCESS_SECRET: 'test_access_secret',
  JWT_REFRESH_SECRET: 'test_refresh_secret',
  JWT_ACCESS_EXPIRATION: '900',
  JWT_REFRESH_EXPIRATION: '604800',
  GOOGLE_CLIENT_ID: 'test_google_client_id',
  GOOGLE_CLIENT_SECRET: 'test_google_client_secret',
  GOOGLE_CALLBACK_URL: 'test_google_callback_url',
});

// Mock ConfigService with stable implementation
const mockConfigService = {
  get: jest.fn((key: string) => mockConfigValues[key]),
};

// Мок RedisService
const mockRedisService = {
  addToBlacklist: jest.fn(),
};

// Моки для библиотек
jest.mock('bcryptjs');
jest.mock('google-auth-library');

// Mock jsonwebtoken module
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(),
  verify: jest.fn(),
}));

// Create type-safe mocks
type MockJwt = {
  sign: jest.Mock<string, [any, Secret, SignOptions?]>;
  verify: jest.Mock<JwtPayload | string, [string, Secret]>;
};

const mockJwt = jwt as unknown as MockJwt;

// Create stable JWT payload factory
const createJwtPayload = (userId: string) => ({
  sub: userId,
  exp: Math.floor(Date.now() / 1000) + 900,
});

// Extracted mock setup functions for reusability
const setupAuthMocks = () => {
  // Reset all mocks
  jest.clearAllMocks();
  jest.resetAllMocks();

  // Base mock setup with stable implementations
  (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword123');
  (bcrypt.compare as jest.Mock).mockResolvedValue(true);

  // JWT mock setup with proper typing
  mockJwt.sign.mockImplementation(
    (payload: any, secret: Secret, _options?: SignOptions): string => {
      if (!secret) {
        throw new ConfigurationError('JWT secret is required');
      }

      if (secret === mockConfigValues.JWT_ACCESS_SECRET)
        return 'fakeAccessToken';
      if (secret === mockConfigValues.JWT_REFRESH_SECRET)
        return 'fakeRefreshToken';
      throw new Error('Invalid JWT secret');
    },
  );

  mockJwt.verify.mockImplementation(
    (token: string, secret: Secret): JwtPayload => {
      if (!secret) {
        throw new ConfigurationError('JWT secret is required');
      }

      if (token === 'expiredToken') {
        const error = new Error('Token expired') as Error & { name: string };
        error.name = 'TokenExpiredError';
        throw error;
      }

      if (token === 'invalidToken') {
        const error = new Error('Invalid signature') as Error & {
          name: string;
        };
        error.name = 'JsonWebTokenError';
        throw error;
      }

      if (
        secret === mockConfigValues.JWT_ACCESS_SECRET &&
        token === 'fakeAccessToken'
      ) {
        return createJwtPayload('user-id-1');
      }

      if (
        secret === mockConfigValues.JWT_REFRESH_SECRET &&
        token === 'fakeRefreshToken'
      ) {
        return createJwtPayload('user-id-1');
      }

      throw new Error('Invalid verify mock setup');
    },
  );

  // Reset ConfigService mock to stable implementation
  mockConfigService.get.mockImplementation(
    (key: string) => mockConfigValues[key],
  );
};

describe('AuthService', () => {
  let service: AuthService;
  let prisma: typeof mockPrismaService;
  let config: typeof mockConfigService;
  let redis: typeof mockRedisService;

  const mockUser: User = {
    id: 'user-id-1',
    email: 'test@example.com',
    password: 'hashedPassword123',
    firstName: 'Test',
    lastName: 'User',
    provider: null,
    providerId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    setupAuthMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: RedisService, useValue: mockRedisService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get(PrismaService);
    config = module.get(ConfigService);
    redis = module.get(RedisService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // --- Тесты для register ---
  describe('register', () => {
    const registerInput: RegisterInput = {
      email: 'new@example.com',
      password: 'password123',
      firstName: 'New',
      lastName: 'User',
    };

    it('should successfully register a new user', async () => {
      prisma.user.findUnique.mockResolvedValue(null); // Пользователь не существует
      prisma.user.create.mockResolvedValue({
        ...mockUser,
        ...registerInput,
        id: 'new-user-id',
      });

      const result = await service.register(registerInput);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: registerInput.email },
      });
      expect(bcrypt.hash).toHaveBeenCalledWith(registerInput.password, 10);
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          email: registerInput.email,
          password: 'hashedPassword123', // Результат мока bcrypt.hash
          firstName: registerInput.firstName,
          lastName: registerInput.lastName,
        },
      });
      expect(result).toBeDefined();
      expect(result.email).toEqual(registerInput.email);
    });

    it('should throw ConflictError if user already exists', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser); // Пользователь существует

      await expect(service.register(registerInput)).rejects.toThrow(
        ConflictError,
      );
      expect(prisma.user.create).not.toHaveBeenCalled();
    });
  });

  // --- Тесты для login ---
  describe('login', () => {
    const loginInput: LoginInput = {
      email: mockUser.email,
      password: 'password123',
    };
    const userAgent = 'test-agent';

    beforeEach(() => {
      // Setup specific mocks for login tests
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.token.create.mockResolvedValue({ id: 'token-1' });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    });

    it('should successfully login and return tokens', async () => {
      const result = await service.login(loginInput, userAgent);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: loginInput.email },
      });
      expect(bcrypt.compare).toHaveBeenCalledWith(
        loginInput.password,
        mockUser.password,
      );
      expect(mockJwt.sign).toHaveBeenCalledTimes(2); // Access and Refresh
      expect(prisma.token.create).toHaveBeenCalled();
      expect(result).toEqual({
        accessToken: 'fakeAccessToken',
        refreshToken: 'fakeRefreshToken',
      });
    });

    it('should throw AuthenticationError if user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.login(loginInput, userAgent)).rejects.toThrow(
        AuthenticationError,
      );
    });

    it('should throw AuthenticationError if password does not match', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(false); // Пароль не совпадает
      await expect(service.login(loginInput, userAgent)).rejects.toThrow(
        AuthenticationError,
      );
    });

    it('should throw AuthenticationError if user has no password (e.g., OAuth only)', async () => {
      prisma.user.findUnique.mockResolvedValue({ ...mockUser, password: null }); // Пользователь без пароля
      await expect(service.login(loginInput, userAgent)).rejects.toThrow(
        AuthenticationError,
      );
    });

    it('should throw ConfigurationError if JWT secrets are missing', async () => {
      // Имитируем отсутствие секрета
      config.get.mockImplementation((key: string) => {
        if (key === 'JWT_ACCESS_SECRET') return undefined;
        return mockConfigService.get(key); // Возвращаем остальные значения
      });

      await expect(service.login(loginInput, userAgent)).rejects.toThrow(
        ConfigurationError,
      );
    });
  });

  // --- Тесты для logout ---
  describe('logout', () => {
    const refreshToken = 'fakeRefreshToken';
    const accessToken = 'fakeAccessToken';
    const userId = mockUser.id;

    beforeEach(() => {
      setupAuthMocks();
      const mockTokenRecord = {
        id: 'token-id',
        token: refreshToken,
        userId: userId,
        userAgent: 'agent',
        expDate: new Date(Date.now() + 100000),
      };

      prisma.token.findUnique.mockResolvedValue(mockTokenRecord);
      prisma.token.delete.mockResolvedValue(mockTokenRecord);
      redis.addToBlacklist.mockResolvedValue('OK');
    });

    it('should successfully logout, delete refresh token, and blacklist access token', async () => {
      const result = await service.logout(refreshToken, userId, accessToken);

      expect(prisma.token.findUnique).toHaveBeenCalledWith({
        where: { token: refreshToken },
      });
      expect(prisma.token.delete).toHaveBeenCalledWith({
        where: { token: refreshToken },
      });
      expect(mockJwt.verify).toHaveBeenCalledWith(
        accessToken,
        mockConfigValues.JWT_ACCESS_SECRET,
      );
      expect(redis.addToBlacklist).toHaveBeenCalledWith(
        accessToken,
        expect.any(Number),
      ); // Проверяем, что вызван с токеном и временем > 0
      expect(result).toBe(true);
    });

    it('should successfully logout without blacklisting if access token is not provided', async () => {
      const result = await service.logout(refreshToken, userId); // Без accessToken

      expect(prisma.token.findUnique).toHaveBeenCalledWith({
        where: { token: refreshToken },
      });
      expect(prisma.token.delete).toHaveBeenCalledWith({
        where: { token: refreshToken },
      });
      expect(mockJwt.verify).not.toHaveBeenCalledWith(
        accessToken,
        expect.anything(),
      );
      expect(redis.addToBlacklist).not.toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should successfully logout without blacklisting if access token is expired', async () => {
      // Мок jwt.verify для access token вернет payload с exp в прошлом
      mockJwt.verify.mockImplementation((token, secret) => {
        if (
          secret === mockConfigValues.JWT_ACCESS_SECRET &&
          token === accessToken
        )
          return { sub: userId, exp: Math.floor(Date.now() / 1000) - 100 };
        return {};
      });

      const result = await service.logout(refreshToken, userId, accessToken);

      expect(prisma.token.findUnique).toHaveBeenCalledWith({
        where: { token: refreshToken },
      });
      expect(prisma.token.delete).toHaveBeenCalledWith({
        where: { token: refreshToken },
      });
      expect(mockJwt.verify).toHaveBeenCalledWith(
        accessToken,
        mockConfigValues.JWT_ACCESS_SECRET,
      );
      expect(redis.addToBlacklist).not.toHaveBeenCalled(); // Не добавляем в блэклист истекший
      expect(result).toBe(true);
    });

    it('should handle JsonWebTokenError during access token verification gracefully', async () => {
      const invalidToken = 'invalidToken';
      prisma.token.delete.mockResolvedValue({ id: 'token-id' });

      const result = await service.logout(refreshToken, userId, invalidToken);

      expect(prisma.token.delete).toHaveBeenCalled();
      expect(redis.addToBlacklist).not.toHaveBeenCalled();
      expect(result).toBe(true); // Should still return true as refresh token was deleted
    });

    it('should handle TokenExpiredError during access token verification gracefully', async () => {
      const expiredToken = 'expiredToken';
      prisma.token.delete.mockResolvedValue({ id: 'token-id' });

      const result = await service.logout(refreshToken, userId, expiredToken);

      expect(prisma.token.delete).toHaveBeenCalled();
      expect(redis.addToBlacklist).not.toHaveBeenCalled();
      expect(result).toBe(true); // Should still return true as refresh token was deleted
    });

    it('should throw AuthenticationError if refresh token not found', async () => {
      prisma.token.findUnique.mockResolvedValue(null);
      await expect(
        service.logout(refreshToken, userId, accessToken),
      ).rejects.toThrow(AuthenticationError);
      expect(prisma.token.delete).not.toHaveBeenCalled();
      expect(redis.addToBlacklist).not.toHaveBeenCalled();
    });

    it('should throw AuthenticationError if refresh token belongs to another user', async () => {
      prisma.token.findUnique.mockResolvedValue({
        id: 'token-id',
        token: refreshToken,
        userId: 'another-user-id',
        userAgent: 'agent',
        expDate: new Date(Date.now() + 100000),
      });
      await expect(
        service.logout(refreshToken, userId, accessToken),
      ).rejects.toThrow(AuthenticationError);
      expect(prisma.token.delete).not.toHaveBeenCalled();
    });

    it('should return false if deleting token fails (and not throw)', async () => {
      prisma.token.delete.mockRejectedValue(new Error('DB delete failed')); // Имитация ошибки БД

      // Ожидаем, что метод вернет false, а не выбросит ошибку (согласно коду)
      const result = await service.logout(refreshToken, userId, accessToken);
      expect(result).toBe(false);
      expect(redis.addToBlacklist).not.toHaveBeenCalled(); // Не дойдем до блэклиста
    });
  });

  // --- Тесты для refreshTokens ---
  describe('refreshTokens', () => {
    const oldRefreshToken = 'fakeRefreshToken';
    const userAgent = 'test-agent';
    const tokenId = 'token-id-1';

    beforeEach(() => {
      setupAuthMocks();
      prisma.token.findUnique.mockResolvedValue({
        id: tokenId,
        token: oldRefreshToken,
        userId: mockUser.id,
        userAgent,
        expDate: new Date(Date.now() + 100000),
      });
      prisma.token.create.mockImplementation(({ data }) =>
        Promise.resolve({
          id: 'new-token-id',
          ...data,
        }),
      );
    });

    it('should successfully refresh tokens', async () => {
      const result = await service.refreshTokens(oldRefreshToken, userAgent);

      expect(result).toEqual({
        accessToken: 'fakeAccessToken',
        refreshToken: 'fakeRefreshToken',
      });

      expect(prisma.token.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          token: expect.any(String),
          userId: mockUser.id,
          userAgent,
        }),
      });
    });

    it('should throw AuthenticationError if refresh token not found', async () => {
      prisma.token.findUnique.mockResolvedValue(null);
      await expect(
        service.refreshTokens(oldRefreshToken, userAgent),
      ).rejects.toThrow(AuthenticationError);
      expect(prisma.token.delete).not.toHaveBeenCalled();
    });

    it('should throw AuthenticationError if refresh token is expired', async () => {
      const expiredTokenRecord = {
        id: 'token-id-2',
        token: oldRefreshToken,
        userId: mockUser.id,
        userAgent: 'old-agent',
        expDate: new Date(Date.now() - 1000),
        user: mockUser,
      };
      prisma.token.findUnique.mockResolvedValue(expiredTokenRecord);
      prisma.token.delete.mockResolvedValue(expiredTokenRecord); // Удаление должно произойти

      await expect(
        service.refreshTokens(oldRefreshToken, userAgent),
      ).rejects.toThrow(/Refresh token expired/);
      expect(prisma.token.delete).toHaveBeenCalledWith({
        where: { token: oldRefreshToken },
      });
      expect(prisma.token.create).not.toHaveBeenCalled();
    });

    it('should throw AuthenticationError if refresh token signature is invalid', async () => {
      prisma.token.findUnique.mockResolvedValue({
        id: 'token-id-2',
        token: oldRefreshToken,
        userId: mockUser.id,
        userAgent: 'old-agent',
        expDate: new Date(Date.now() + 100000),
        user: mockUser,
      });
      // Имитируем ошибку верификации
      mockJwt.verify.mockImplementation((token, secret) => {
        if (
          secret === mockConfigValues.JWT_REFRESH_SECRET &&
          token === oldRefreshToken
        )
          throw new Error('Invalid signature');
        return {};
      });

      await expect(
        service.refreshTokens(oldRefreshToken, userAgent),
      ).rejects.toThrow(/Invalid refresh token/);
      expect(prisma.token.delete).not.toHaveBeenCalled(); // Токен не удаляется при невалидной подписи
    });

    it('should throw ConfigurationError if JWT secrets are missing', async () => {
      // First setup a valid token record with included user
      const tokenRecord = {
        id: tokenId,
        token: oldRefreshToken,
        userId: mockUser.id,
        userAgent,
        expDate: new Date(Date.now() + 100000),
        user: mockUser,
      };
      prisma.token.findUnique.mockResolvedValue(tokenRecord);

      // Mock missing JWT refresh secret
      config.get.mockImplementation((key: string) => {
        if (key === 'JWT_REFRESH_SECRET') return undefined;
        return mockConfigValues[key];
      });

      await expect(
        service.refreshTokens(oldRefreshToken, userAgent),
      ).rejects.toThrow(ConfigurationError);

      // Verify the mocks were called in the right order with correct parameters
      expect(prisma.token.findUnique).toHaveBeenCalledWith({
        where: { token: oldRefreshToken },
        include: { user: true },
      });

      // Reset the mock for other tests
      config.get.mockImplementation((key: string) => mockConfigValues[key]);
    });
  });

  // --- Тесты для validateOAuthUser ---
  describe.skip('validateOAuthUser', () => {
    const oauthInput: OAuthUser = {
      provider: 'google',
      providerId: 'google-id-123',
      email: 'oauth@example.com',
      firstName: 'OAuth',
      lastName: 'User',
      displayName: 'OAuth User',
      avatarUrl: 'http://avatar.url',
      userData: { some: 'data' },
    };

    beforeEach(() => {
      setupAuthMocks();

      // Setup transaction mock
      prisma.$transaction.mockImplementation(async (cb) => {
        return await cb(prisma);
      });
    });

    it('should return existing user if OAuth connection exists', async () => {
      const connection = {
        id: 'conn-1',
        provider: 'google',
        providerId: 'google-id-123',
        userId: mockUser.id,
        user: mockUser,
      };
      prisma.userOAuthConnection.findUnique.mockResolvedValue(connection);

      const result = await service.validateOAuthUser(oauthInput);

      expect(prisma.userOAuthConnection.findUnique).toHaveBeenCalledWith({
        where: {
          provider_providerId: {
            provider: oauthInput.provider,
            providerId: oauthInput.providerId,
          },
        },
        include: { user: true },
      });
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(result).toEqual(mockUser);
    });

    it('should find user by email, create connection, and return user if connection does not exist but user does', async () => {
      prisma.userOAuthConnection.findUnique.mockResolvedValue(null);
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.userOAuthConnection.create.mockImplementation(({ data }) =>
        Promise.resolve({
          id: 'new-connection',
          ...data,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      );

      const result = await service.validateOAuthUser(oauthInput);

      expect(prisma.userOAuthConnection.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          provider: oauthInput.provider,
          providerId: oauthInput.providerId,
          userId: mockUser.id,
        }),
      });
      expect(result).toEqual(mockUser);
    });

    it('should create user and connection, and return user if neither connection nor user exists', async () => {
      prisma.userOAuthConnection.findUnique.mockResolvedValue(null); // Connection not found
      prisma.user.findUnique.mockResolvedValue(null); // User not found by email
      prisma.user.create.mockResolvedValue(mockUser); // Mock user creation inside transaction
      prisma.userOAuthConnection.create.mockResolvedValue({
        /* new connection */
      }); // Mock connection creation inside transaction

      const result = await service.validateOAuthUser(oauthInput);

      expect(prisma.userOAuthConnection.findUnique).toHaveBeenCalled();
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: oauthInput.email },
      });
      expect(prisma.$transaction).toHaveBeenCalled();
      // Проверяем вызовы внутри мока транзакции
      expect(bcrypt.hash).toHaveBeenCalled(); // Password should be hashed
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: oauthInput.email,
          firstName: oauthInput.firstName,
          lastName: oauthInput.lastName,
          password: 'hashedPassword123', // Результат мока bcrypt.hash
        }),
      });
      expect(prisma.userOAuthConnection.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          provider: oauthInput.provider,
          providerId: oauthInput.providerId,
          userId: mockUser.id, // Важно, что используется ID нового пользователя
        }),
      });
      expect(result).toEqual(mockUser);
    });

    it('should throw ConflictError if email exists during user creation within transaction', async () => {
      prisma.userOAuthConnection.findUnique.mockResolvedValue(null);
      prisma.user.findUnique.mockResolvedValue(null);

      const conflictError = new Error('Unique constraint failed on email');
      conflictError['code'] = 'P2002';

      prisma.user.create.mockRejectedValue(conflictError);

      await expect(service.validateOAuthUser(oauthInput)).rejects.toThrow(
        ConflictError,
      );
    });

    it('should throw ConflictError if OAuth connection already exists for another user (race condition simulation)', async () => {
      prisma.userOAuthConnection.findUnique.mockResolvedValue(null); // Сначала не нашли
      prisma.user.findUnique.mockResolvedValue(mockUser); // Нашли пользователя по email
      // Имитируем ошибку P2002 при создании связи внутри транзакции (кто-то успел создать раньше)
      const conflictError = new Error(
        'Unique constraint failed on provider_providerId',
      );
      conflictError['code'] = 'P2002';
      conflictError['meta'] = { target: ['provider_providerId'] };
      prisma.userOAuthConnection.create.mockRejectedValue(conflictError);

      await expect(service.validateOAuthUser(oauthInput)).rejects.toThrow(
        ConflictError,
      );
      expect(prisma.$transaction).toHaveBeenCalled();
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('should throw OAuthError on generic transaction failure', async () => {
      prisma.userOAuthConnection.findUnique.mockResolvedValue(null);
      prisma.user.findUnique.mockResolvedValue(null);

      prisma.user.create.mockRejectedValue(new Error('Some generic DB error'));

      await expect(service.validateOAuthUser(oauthInput)).rejects.toThrow(
        OAuthError,
      );
    });
  });

  // --- Тесты для handleGoogleAuth ---
  describe.skip('handleGoogleAuth', () => {
    const googleCode = 'google_auth_code';
    const userAgent = 'google-agent';
    const oauthUser: OAuthUser = {
      provider: 'google',
      providerId: 'google-123',
      email: 'google@test.com',
      firstName: 'G',
      lastName: 'User',
    };

    beforeEach(() => {
      jest
        .spyOn(AuthService.prototype as any, 'handleGoogleCode')
        .mockResolvedValue(oauthUser);
      jest.spyOn(service, 'validateOAuthUser').mockResolvedValue(mockUser);
      jest
        .spyOn(service, 'generateAccessToken')
        .mockReturnValue('googleAccessToken');
      jest
        .spyOn(service, 'generateRefreshToken')
        .mockReturnValue('googleRefreshToken');
      prisma.token.create.mockResolvedValue({
        /* token data */
      });
    });

    it('should handle google auth with code, validate/create user, generate tokens', async () => {
      const result = await service.handleGoogleAuth(googleCode, userAgent);

      expect(service.validateOAuthUser).toHaveBeenCalledWith(oauthUser);
      expect(service.generateAccessToken).toHaveBeenCalledWith(mockUser.id);
      expect(service.generateRefreshToken).toHaveBeenCalled();
      expect(prisma.token.create).toHaveBeenCalledWith(
        expect.objectContaining({
          token: 'googleRefreshToken',
          userId: mockUser.id,
          userAgent: userAgent,
        }),
      );
      expect(result).toEqual({
        accessToken: 'googleAccessToken',
        refreshToken: 'googleRefreshToken',
        user: mockUser,
      });
    });

    it('should handle google auth with OAuthUser input', async () => {
      const result = await service.handleGoogleAuth(oauthUser, userAgent);

      expect(service.validateOAuthUser).toHaveBeenCalledWith(oauthUser);
      expect(service.generateAccessToken).toHaveBeenCalledWith(mockUser.id);
      expect(service.generateRefreshToken).toHaveBeenCalled();
      expect(prisma.token.create).toHaveBeenCalled();
      expect(result).toEqual({
        accessToken: 'googleAccessToken',
        refreshToken: 'googleRefreshToken',
        user: mockUser,
      });
    });

    it('should throw error if validateOAuthUser returns null or invalid user', async () => {
      jest.spyOn(service, 'validateOAuthUser').mockResolvedValue(null as any);

      await expect(
        service.handleGoogleAuth(googleCode, userAgent),
      ).rejects.toThrow('User ID is required for token generation');
      expect(prisma.token.create).not.toHaveBeenCalled();
    });

    it('should propagate errors from validateOAuthUser', async () => {
      jest
        .spyOn(service, 'validateOAuthUser')
        .mockRejectedValue(new ConflictError('OAuth conflict'));

      await expect(
        service.handleGoogleAuth(googleCode, userAgent),
      ).rejects.toThrow(ConflictError);
    });
  });

  // --- Тесты для getOAuthConnections ---
  describe.skip('getOAuthConnections', () => {
    it('should return list of connections for the user', async () => {
      const connections = [
        { id: 'conn1', provider: 'google' },
        { id: 'conn2', provider: 'facebook' },
      ];
      prisma.userOAuthConnection.findMany.mockResolvedValue(connections as any);

      const result = await service.getOAuthConnections(mockUser.id);

      expect(prisma.userOAuthConnection.findMany).toHaveBeenCalledWith({
        where: { userId: mockUser.id },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual(connections);
    });
  });

  // --- Тесты для removeOAuthConnection ---
  describe.skip('removeOAuthConnection', () => {
    const connectionId = 'conn-to-remove';
    const userId = mockUser.id;

    it('should remove connection if found and user has password', async () => {
      const connection = {
        id: connectionId,
        userId: userId,
        provider: 'google',
      };
      const userWithPassword = {
        ...mockUser,
        password: 'hashedPassword',
        userOAuthConnection: [connection, { id: 'other-conn' }],
      };
      prisma.userOAuthConnection.findFirst.mockResolvedValue(connection as any);
      prisma.user.findUnique.mockResolvedValue(userWithPassword as any);
      prisma.userOAuthConnection.delete.mockResolvedValue(connection as any);

      const result = await service.removeOAuthConnection(userId, connectionId);

      expect(prisma.userOAuthConnection.findFirst).toHaveBeenCalledWith({
        where: { id: connectionId, userId },
      });
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
        include: { userOAuthConnection: true },
      });
      expect(prisma.userOAuthConnection.delete).toHaveBeenCalledWith({
        where: { id: connectionId },
      });
      expect(result).toBe(true);
    });

    it('should remove connection if found and user has other connections (even without password)', async () => {
      const connection = {
        id: connectionId,
        userId: userId,
        provider: 'google',
      };
      const userWithoutPassword = {
        ...mockUser,
        password: null,
        userOAuthConnection: [connection, { id: 'other-conn' }],
      }; // > 1 connection
      prisma.userOAuthConnection.findFirst.mockResolvedValue(connection as any);
      prisma.user.findUnique.mockResolvedValue(userWithoutPassword as any);
      prisma.userOAuthConnection.delete.mockResolvedValue(connection as any);

      const result = await service.removeOAuthConnection(userId, connectionId);

      expect(prisma.userOAuthConnection.findFirst).toHaveBeenCalled();
      expect(prisma.user.findUnique).toHaveBeenCalled();
      expect(prisma.userOAuthConnection.delete).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should throw AuthenticationError if connection not found', async () => {
      prisma.userOAuthConnection.findFirst.mockResolvedValue(null);

      await expect(
        service.removeOAuthConnection(userId, connectionId),
      ).rejects.toThrow(/OAuth connection not found/);
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
      expect(prisma.userOAuthConnection.delete).not.toHaveBeenCalled();
    });

    it('should throw AuthenticationError if trying to remove last connection and user has no password', async () => {
      const connection = {
        id: connectionId,
        userId: userId,
        provider: 'google',
      };
      const userWithoutPassword = {
        ...mockUser,
        password: null,
        userOAuthConnection: [connection],
      }; // Only 1 connection
      prisma.userOAuthConnection.findFirst.mockResolvedValue(connection as any);
      prisma.user.findUnique.mockResolvedValue(userWithoutPassword as any);

      await expect(
        service.removeOAuthConnection(userId, connectionId),
      ).rejects.toThrow(
        /Cannot remove the last OAuth connection without setting a password/,
      );
      expect(prisma.userOAuthConnection.delete).not.toHaveBeenCalled();
    });
  });

  // --- Тесты для generateAccessToken / generateRefreshToken ---
  describe('generate Tokens', () => {
    it('generateAccessToken should call mockJwt.sign with correct params', () => {
      service.generateAccessToken(mockUser.id);
      expect(mockJwt.sign).toHaveBeenCalledWith(
        { sub: mockUser.id },
        mockConfigValues.JWT_ACCESS_SECRET,
        { expiresIn: '900s' },
      );
    });

    it('generateRefreshToken should call mockJwt.sign with correct params', () => {
      service.generateRefreshToken();
      expect(mockJwt.sign).toHaveBeenCalledWith(
        {},
        mockConfigValues.JWT_REFRESH_SECRET,
        {
          expiresIn: '604800s',
        },
      );
    });

    it('generateAccessToken should throw ConfigurationError if secret missing', () => {
      config.get.mockImplementation((key: string) => {
        if (key === 'JWT_ACCESS_SECRET') return undefined;
        return mockConfigService.get(key);
      });
      expect(() => service.generateAccessToken(mockUser.id)).toThrow(
        ConfigurationError,
      );
    });

    it('generateRefreshToken should throw ConfigurationError if secret missing', () => {
      config.get.mockImplementation((key: string) => {
        if (key === 'JWT_REFRESH_SECRET') return undefined;
        return mockConfigService.get(key);
      });
      expect(() => service.generateRefreshToken()).toThrow(ConfigurationError);
    });
  });

  // --- Тесты для validateAccessToken ---
  describe('validateAccessToken', () => {
    const validToken = 'fakeAccessToken';
    const expiredToken = 'expiredToken';
    const invalidToken = 'invalidToken';

    beforeEach(() => {
      setupAuthMocks();
    });

    it('should return user for a valid token', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      const result = await service.validateAccessToken(validToken);

      expect(mockJwt.verify).toHaveBeenCalledWith(
        validToken,
        mockConfigValues.JWT_ACCESS_SECRET,
      );
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: mockUser.id },
      });
      expect(result).toEqual(mockUser);
    });

    it('should return null for an expired token', async () => {
      const result = await service.validateAccessToken(expiredToken);
      expect(mockJwt.verify).toHaveBeenCalledWith(
        expiredToken,
        mockConfigValues.JWT_ACCESS_SECRET,
      );
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });

    it('should return null for an invalid token (signature)', async () => {
      const result = await service.validateAccessToken(invalidToken);
      expect(mockJwt.verify).toHaveBeenCalledWith(
        invalidToken,
        mockConfigValues.JWT_ACCESS_SECRET,
      );
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });

    it('should return null if user not found after decoding token', async () => {
      prisma.user.findUnique.mockResolvedValue(null); // Пользователь не найден
      const result = await service.validateAccessToken(validToken);
      expect(mockJwt.verify).toHaveBeenCalledWith(
        validToken,
        mockConfigValues.JWT_ACCESS_SECRET,
      );
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: mockUser.id },
      });
      expect(result).toBeNull();
    });

    it('should return null if payload has no sub', async () => {
      mockJwt.verify.mockImplementationOnce(() => ({
        exp: Math.floor(Date.now() / 1000) + 900,
      }));
      const result = await service.validateAccessToken(validToken);
      expect(mockJwt.verify).toHaveBeenCalledWith(
        validToken,
        mockConfigValues.JWT_ACCESS_SECRET,
      );
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });

    it('should return null (or throw) if access secret is missing', async () => {
      config.get.mockImplementation((key: string) => {
        if (key === 'JWT_ACCESS_SECRET') return undefined;
        return mockConfigValues[key];
      });

      const result = await service.validateAccessToken('fakeAccessToken');
      expect(result).toBeNull();
    });
  });
});
