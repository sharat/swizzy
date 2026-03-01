import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'integration',
    environment: 'node',
    globals: true,
    include: ['test/integration/**/*.test.ts'],
    setupFiles: ['test/integration/setup.ts'],
    testTimeout: 30000,
    maxWorkers: 4,
    bail: 0,
    globalSetup: ['test/integration/global-setup.ts'],
    coverage: {
      provider: 'v8',
      reportsDirectory: 'coverage/integration',
      reporter: ['text', 'lcov', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.d.ts'],
    },
  },
});
