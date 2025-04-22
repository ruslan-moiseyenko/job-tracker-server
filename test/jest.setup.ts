import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';

// Global beforeAll - runs once before all test suites
beforeAll(() => {
  // Clear all mocks before starting tests
  jest.clearAllMocks();
});

// Global beforeEach - runs before each test in every suite
beforeEach(() => {
  // Clear mocks and restore spies before each test
  jest.clearAllMocks();
  jest.restoreAllMocks();
});

// Global afterAll - runs once after all test suites
afterAll(async () => {
  // Clean up any remaining test data or connections
  const prisma = new PrismaClient();
  const redis = new Redis();

  try {
    // Clean up Redis
    await redis.flushall();
    await redis.quit();

    // Clean up Prisma - disconnect client
    await prisma.$disconnect();
  } catch (error) {
    console.error('Error during test cleanup:', error);
  }
});
