// Vitest setup file for global test configuration
import { vi } from 'vitest';

// Mock console methods to avoid noise during testing
const originalConsole = { ...console };

beforeEach(() => {
  // Reset console mocks
  vi.clearAllMocks();
});

afterEach(() => {
  // Restore console after each test
  Object.assign(console, originalConsole);
});

// Global test utilities
export const mockConsole = () => ({
  log: vi.spyOn(console, 'log').mockImplementation(() => {}),
  error: vi.spyOn(console, 'error').mockImplementation(() => {}),
  warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
});

export const restoreConsole = () => {
  Object.assign(console, originalConsole);
};
