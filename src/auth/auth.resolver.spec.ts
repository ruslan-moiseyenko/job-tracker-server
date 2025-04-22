import { Test, TestingModule } from '@nestjs/testing';
import { AuthResolver } from './auth.resolver';
import { AuthService } from './auth.service';
import { GqlAuthGuard } from './gql-auth.guard'; // Нужен для переопределения
import { GqlThrottlerGuard } from '../common/guards/gql-throttler.guard'; // Нужен для переопределения
import { User } from '@prisma/client';
import { GqlContext } from '../common/types/graphql.context';
import { LoginInput, RefreshTokenInput, RegisterInput } from './auth.dto';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended'; // Полезно для моков контекста

// Мок AuthService
const mockAuthService = {
  register: jest.fn(),
  login: jest.fn(),
  refreshTokens: jest.fn(),
  logout: jest.fn(),
  handleGoogleAuth: jest.fn(),
  getOAuthConnections: jest.fn(),
  removeOAuthConnection: jest.fn(),
  // validateAccessToken не вызывается напрямую резолвером, а используется в GqlAuthGuard
};

// Мок Пользователя для декоратора @CurrentUser
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

describe('AuthResolver', () => {
  let resolver: AuthResolver;
  let authService: typeof mockAuthService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthResolver,
        { provide: AuthService, useValue: mockAuthService },
      ],
    })
      // Переопределяем глобальные или специфичные для резолвера гарды, чтобы они не мешали юнит-тестам
      // GqlAuthGuard будет протестирован отдельно или в e2e тестах
      // GqlThrottlerGuard тоже не должен влиять на логику самого резолвера
      .overrideGuard(GqlAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) }) // Всегда разрешаем доступ в юнит-тестах
      .overrideGuard(GqlThrottlerGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    resolver = module.get<AuthResolver>(AuthResolver);
    authService = module.get(AuthService);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  // --- Тесты для Mutations/Queries ---

  describe('register', () => {
    it('should call authService.register with input and return user', async () => {
      const input: RegisterInput = {
        email: 'new@test.com',
        password: 'pw',
        firstName: 'N',
        lastName: 'U',
      };
      const expectedUser = { ...mockUser, email: input.email };
      authService.register.mockResolvedValue(expectedUser);

      const result = await resolver.register(input);

      expect(authService.register).toHaveBeenCalledWith(input);
      expect(result).toEqual(expectedUser);
    });
  });

  describe('login', () => {
    it('should call authService.login with input and userAgent and return payload', async () => {
      const input: LoginInput = { email: 'test@test.com', password: 'pw' };
      const userAgent = 'test-agent';
      const expectedPayload = { accessToken: 'a', refreshToken: 'r' };
      authService.login.mockResolvedValue(expectedPayload);

      const result = await resolver.login(input, userAgent);

      expect(authService.login).toHaveBeenCalledWith(input, userAgent);
      expect(result).toEqual(expectedPayload);
    });
  });

  describe('refreshToken', () => {
    it('should call authService.refreshTokens with input and userAgent and return payload', async () => {
      const input: RefreshTokenInput = { refreshToken: 'old-refresh' };
      const userAgent = 'test-agent-refresh';
      const expectedPayload = {
        accessToken: 'new-a',
        refreshToken: 'new-r',
        user: mockUser,
      };
      authService.refreshTokens.mockResolvedValue(expectedPayload);

      const result = await resolver.refreshToken(input, userAgent);

      expect(authService.refreshTokens).toHaveBeenCalledWith(
        input.refreshToken,
        userAgent,
      );
      expect(result).toEqual(expectedPayload);
    });
  });

  describe('logout', () => {
    const refreshToken = 'refresh-token-to-logout';
    // Глубокий мок для контекста
    const mockContext: DeepMockProxy<GqlContext> = mockDeep<GqlContext>();

    beforeEach(() => {
      // Сбрасываем мок контекста перед каждым тестом в этом describe
      mockContext.req.headers = {}; // Сбрасываем заголовки
    });

    it('should call authService.logout with refresh token, user ID and access token from header', async () => {
      const accessToken = 'access-token-from-header';
      mockContext.req.headers['authorization'] = `Bearer ${accessToken}`;
      authService.logout.mockResolvedValue(true);

      const result = await resolver.logout(refreshToken, mockUser, mockContext);

      expect(authService.logout).toHaveBeenCalledWith(
        refreshToken,
        mockUser.id,
        accessToken,
      );
      expect(result).toBe(true);
    });

    it('should call authService.logout without access token if header is missing', async () => {
      // Заголовок не установлен
      authService.logout.mockResolvedValue(true);

      const result = await resolver.logout(refreshToken, mockUser, mockContext);

      expect(authService.logout).toHaveBeenCalledWith(
        refreshToken,
        mockUser.id,
        undefined,
      );
      expect(result).toBe(true);
    });

    it('should call authService.logout without access token if header format is invalid', async () => {
      mockContext.req.headers['authorization'] =
        `InvalidFormat ${refreshToken}`;
      authService.logout.mockResolvedValue(true);

      const result = await resolver.logout(refreshToken, mockUser, mockContext);

      expect(authService.logout).toHaveBeenCalledWith(
        refreshToken,
        mockUser.id,
        undefined,
      );
      expect(result).toBe(true);
    });

    it('should return false if authService.logout fails', async () => {
      authService.logout.mockResolvedValue(false); // Имитация неудачного логаута

      const result = await resolver.logout(refreshToken, mockUser, mockContext);
      expect(authService.logout).toHaveBeenCalled();
      expect(result).toBe(false);
    });
  });

  describe('me', () => {
    it('should return the user from the CurrentUser decorator', () => {
      // @CurrentUser() user: User будет предоставлен Гардом GqlAuthGuard в реальном приложении.
      // В юнит-тесте мы просто передаем мок пользователя напрямую.
      const result = resolver.me(mockUser);
      expect(result).toEqual(mockUser);
    });
  });

  describe('googleAuthCallback', () => {
    it('should call authService.handleGoogleAuth with code and userAgent', async () => {
      const code = 'google-code-123';
      const userAgent = 'google-cb-agent';
      const expectedPayload = {
        accessToken: 'g-a',
        refreshToken: 'g-r',
        user: mockUser,
      };
      authService.handleGoogleAuth.mockResolvedValue(expectedPayload);

      const result = await resolver.googleAuthCallback(code, userAgent);

      expect(authService.handleGoogleAuth).toHaveBeenCalledWith(
        code,
        userAgent,
      );
      expect(result).toEqual(expectedPayload);
    });
  });

  describe('getMyOAuthConnections', () => {
    it('should call authService.getOAuthConnections with user ID', async () => {
      const connections = [{ provider: 'google', id: '1' }];
      authService.getOAuthConnections.mockResolvedValue(connections as any);

      const result = await resolver.getMyOAuthConnections(mockUser);

      expect(authService.getOAuthConnections).toHaveBeenCalledWith(mockUser.id);
      expect(result).toEqual(connections);
    });
  });

  describe('removeOAuthConnection', () => {
    it('should call authService.removeOAuthConnection with user ID and connection ID', async () => {
      const connectionId = 'conn-id-to-remove';
      authService.removeOAuthConnection.mockResolvedValue(true);

      const result = await resolver.removeOAuthConnection(
        mockUser,
        connectionId,
      );

      expect(authService.removeOAuthConnection).toHaveBeenCalledWith(
        mockUser.id,
        connectionId,
      );
      expect(result).toBe(true);
    });
  });

  // Тест для googleAuth - он просто возвращает null, т.к. логика в стратегии
  describe('googleAuth', () => {
    it('should return null', () => {
      const userAgent = 'some-agent';
      const result = resolver.googleAuth(userAgent);
      expect(result).toBeNull();
      // Проверяем, что сервис не вызывается
      expect(authService.handleGoogleAuth).not.toHaveBeenCalled();
    });
  });
});
