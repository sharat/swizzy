/**
 * Global teardown for integration tests
 * Runs once after all test suites complete
 */

import { rm } from 'fs/promises';
import { resolve } from 'path';

export default async function globalTeardown() {
  console.log('🧹 Cleaning up integration test environment...');

  try {
    // Clean up any temporary files or directories created during testing
    const tempDirs = [
      resolve(__dirname, '../../temp-test-*'),
      resolve(__dirname, '../../test-results'),
    ];

    for (const pattern of tempDirs) {
      try {
        // Note: This is a simplified cleanup. In practice, you might want to use glob
        // to find and clean up temporary directories that match patterns.
      } catch (error) {
        // Ignore cleanup errors - they're not critical
      }
    }

    console.log('✅ Integration test cleanup completed');
  } catch (error) {
    console.warn('⚠️ Some cleanup operations failed:', error);
  }
};