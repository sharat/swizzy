/**
 * Vitest setup file for integration tests
 * Runs before each test file
 */

import { resolve } from 'path';
import { existsSync } from 'fs';
import { expect, vi } from 'vitest';

// Extend matchers for better integration test assertions
expect.extend({
  toContainExitCode(received: { exitCode: number | null }, expected: number) {
    const pass = received.exitCode === expected;
    return {
      message: () =>
        pass
          ? `Expected exit code not to be ${expected}, but received ${received.exitCode}`
          : `Expected exit code to be ${expected}, but received ${received.exitCode}`,
      pass,
    };
  },

  toHaveCompletedWithin(received: { duration: number }, maxDuration: number) {
    const pass = received.duration <= maxDuration;
    return {
      message: () =>
        pass
          ? `Expected duration ${received.duration}ms not to be within ${maxDuration}ms`
          : `Expected duration ${received.duration}ms to be within ${maxDuration}ms`,
      pass,
    };
  },

  toBeValidSwiftLintJSON(received: string) {
    try {
      const parsed = JSON.parse(received);
      const isValid = Array.isArray(parsed) &&
        parsed.every(issue =>
          typeof issue === 'object' &&
          typeof issue.file === 'string' &&
          typeof issue.line === 'number' &&
          typeof issue.reason === 'string' &&
          typeof issue.rule_id === 'string' &&
          ['Warning', 'Error'].includes(issue.severity) &&
          typeof issue.type === 'string' &&
          (issue.character === null || typeof issue.character === 'number')
        );

      return {
        message: () => isValid
          ? 'Expected invalid SwiftLint JSON format'
          : 'Expected valid SwiftLint JSON format',
        pass: isValid,
      };
    } catch {
      return {
        message: () => 'Expected valid JSON that represents SwiftLint output',
        pass: false,
      };
    }
  }
});

// Declare custom matchers for TypeScript
declare module 'vitest' {
  interface Assertion<T = any> {
    toContainExitCode(expected: number): T;
    toHaveCompletedWithin(maxDuration: number): T;
    toBeValidSwiftLintJSON(): T;
  }

  interface AsymmetricMatchersContaining {
    toContainExitCode(expected: number): void;
    toHaveCompletedWithin(maxDuration: number): void;
    toBeValidSwiftLintJSON(): void;
  }
}

// Verify CLI executable exists before running tests
beforeAll(() => {
  const cliPath = resolve(__dirname, '../../dist/index.js');
  if (!existsSync(cliPath)) {
    throw new Error(
      `CLI executable not found at ${cliPath}. Please run 'npm run build' before running integration tests.`
    );
  }
});

// Set environment variables for consistent test behavior
process.env.NODE_ENV = 'test';
process.env.CI = 'true'; // Ensure consistent behavior in CI-like environment

// Global error handler for uncaught exceptions in tests
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection in integration test:', reason);
  // Don't exit the process, let Vitest handle it
});

// Suppress console output during tests unless debugging
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeEach(() => {
  if (!process.env.DEBUG_INTEGRATION_TESTS) {
    console.log = vi.fn();
    console.error = vi.fn();
    console.warn = vi.fn();
  }
});

afterEach(() => {
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});

export {};
