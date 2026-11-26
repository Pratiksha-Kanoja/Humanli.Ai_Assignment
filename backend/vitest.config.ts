import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // Set before any src module loads (config/env.ts validates process.env on import)
    env: {
      NODE_ENV: 'test',
      MONGODB_URI: 'memory',
      JWT_SECRET: 'test_secret_that_is_long_enough',
      JWT_EXPIRES_IN: '1d',
      CORS_ORIGIN: '*',
    },
    hookTimeout: 120_000,
    testTimeout: 30_000,
    fileParallelism: false,
  },
});
