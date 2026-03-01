/**
 * Global setup for integration tests
 * Runs once before all test suites
 */

import { spawn } from 'child_process';
import { resolve } from 'path';

export default async function globalSetup() {
  console.log('🔧 Setting up integration test environment...');

  // Ensure the CLI is built before running integration tests
  console.log('📦 Building CLI...');
  const buildProcess = spawn('npm', ['run', 'build'], {
    cwd: resolve(__dirname, '../..'),
    stdio: 'inherit'
  });

  const buildPromise = new Promise<void>((resolve, reject) => {
    buildProcess.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Build failed with exit code ${code}`));
      }
    });

    buildProcess.on('error', (error) => {
      reject(error);
    });
  });

  try {
    await buildPromise;
    console.log('✅ CLI built successfully');
  } catch (error) {
    console.error('❌ Failed to build CLI:', error);
    throw error;
  }

  // Verify CLI executable
  console.log('🔍 Verifying CLI executable...');
  const testProcess = spawn('node', [resolve(__dirname, '../../dist/index.js'), '--version'], {
    cwd: resolve(__dirname, '../..'),
    stdio: 'pipe'
  });

  const testPromise = new Promise<void>((resolve, reject) => {
    let output = '';

    testProcess.stdout.on('data', (data) => {
      output += data.toString();
    });

    testProcess.on('close', (code) => {
      if (code === 0 && output.trim().match(/^\d+\.\d+\.\d+$/)) {
        resolve();
      } else {
        reject(new Error(`CLI verification failed. Exit code: ${code}, Output: ${output}`));
      }
    });

    testProcess.on('error', (error) => {
      reject(error);
    });
  });

  try {
    await testPromise;
    console.log('✅ CLI executable verified');
  } catch (error) {
    console.error('❌ CLI verification failed:', error);
    throw error;
  }

  console.log('🚀 Integration test environment ready');
};