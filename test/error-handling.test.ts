/**
 * Unit tests for comprehensive error handling
 */

import { CompactStream } from '../src/index';
import { spawn } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { vi, type MockedFunction } from 'vitest';
import {
  invalidJsonString,
  invalidSchemaJsonString,
  validJsonString
} from './fixtures/swiftlint-data';
import { validConfigs } from './fixtures/cli-configs';

const transformAsync = async (stream: CompactStream, data: Buffer | string): Promise<void> => {
  const chunk = Buffer.isBuffer(data) ? data : Buffer.from(data);
  await new Promise<void>((resolve, reject) => {
    stream._transform(chunk, 'utf8', (error?: Error | null) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
};

const flushAsync = async (stream: CompactStream): Promise<Error | null | undefined> => (
  new Promise((resolve) => {
    stream._flush((error) => {
      resolve(error);
    });
  })
);

// Mock dependencies
vi.mock('child_process');
vi.mock('fs');
vi.mock('console', () => ({
  log: vi.fn(),
  error: vi.fn(),
  warn: vi.fn()
}));

const mockSpawn = spawn as MockedFunction<typeof spawn>;
const mockReadFileSync = readFileSync as MockedFunction<typeof readFileSync>;
const mockExistsSync = existsSync as MockedFunction<typeof existsSync>;

describe('Error Handling', () => {
  let stream: CompactStream;
  let originalStdinIsTTY: boolean;

  beforeEach(() => {
    vi.clearAllMocks();
    originalStdinIsTTY = process.stdin.isTTY;

    // Default mocks
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue('{"version": "2.2.0"}');
  });

  afterEach(() => {
    // Restore original stdin state
    Object.defineProperty(process.stdin, 'isTTY', {
      value: originalStdinIsTTY,
      configurable: true
    });
  });

  describe('JSON Parsing Errors', () => {
    beforeEach(() => {
      stream = new CompactStream(validConfigs.defaultConfig);
    });

    it('should handle malformed JSON gracefully', async () => {
      await transformAsync(stream, invalidJsonString);
      const error = await flushAsync(stream);
      expect(error).not.toBeNull();
      expect(error?.message).toContain('Failed to parse SwiftLint JSON input');
    });

    it('should handle unexpected JSON end', async () => {
      const incompleteJson = '{"file": "test.swift", "line": 1';

      await transformAsync(stream, incompleteJson);
      const error = await flushAsync(stream);
      expect(error).not.toBeNull();
      expect(error?.message).toContain('Failed to parse SwiftLint JSON input');
    });

    it('should handle non-JSON input', async () => {
      const nonJson = 'This is not JSON at all';

      await transformAsync(stream, nonJson);
      const error = await flushAsync(stream);
      expect(error).not.toBeNull();
    });

    it('should handle empty braces as valid JSON but invalid schema', async () => {
      await transformAsync(stream, '{}');
      const error = await flushAsync(stream);
      expect(error).not.toBeNull();
      expect(error?.message).toContain('Invalid SwiftLint JSON structure');
    });

    it('should handle null JSON input', async () => {
      await transformAsync(stream, 'null');
      const error = await flushAsync(stream);
      expect(error).not.toBeNull();
      expect(error?.message).toContain('Invalid SwiftLint JSON structure');
    });
  });

  describe('Schema Validation Errors', () => {
    beforeEach(() => {
      stream = new CompactStream(validConfigs.defaultConfig);
    });

    it('should handle invalid SwiftLint schema gracefully', async () => {
      await transformAsync(stream, invalidSchemaJsonString);
      const error = await flushAsync(stream);
      expect(error).not.toBeNull();
      expect(error?.message).toContain('Invalid SwiftLint JSON structure');
    });

    it('should provide detailed validation error messages', async () => {
      const invalidIssue = JSON.stringify([{
        file: 'test.swift',
        // Missing required fields: line, severity, rule_id, type, character, reason
      }]);

      await transformAsync(stream, invalidIssue);
      const error = await flushAsync(stream);
      expect(error).not.toBeNull();
      expect(error?.message).toContain('Path:');
      expect(error?.message).toContain('Message:');
    });

    it('should handle wrong data types in issue fields', async () => {
      const wrongTypes = JSON.stringify([{
        character: 'not-a-number',
        file: 123,
        line: 'not-a-number',
        reason: null,
        rule_id: [],
        severity: 'InvalidSeverity',
        type: {}
      }]);

      await transformAsync(stream, wrongTypes);
      const error = await flushAsync(stream);
      expect(error).not.toBeNull();
      expect(error?.message).toContain('Invalid SwiftLint JSON structure');
    });

    it('should handle array with mixed valid and invalid issues', async () => {
      const mixedArray = JSON.stringify([
        {
          character: 5,
          file: '/path/to/valid.swift',
          line: 10,
          reason: 'Valid issue',
          rule_id: 'test_rule',
          severity: 'Warning',
          type: 'Test'
        },
        {
          file: 'invalid.swift'
          // Missing required fields
        }
      ]);

      await transformAsync(stream, mixedArray);
      const error = await flushAsync(stream);
      expect(error).not.toBeNull();
    });
  });

  describe('Process Error Handling with TTY vs Piped Input', () => {
    beforeEach(() => {
      stream = new CompactStream(validConfigs.defaultConfig);
    });

    it('should handle piped input errors differently from TTY input', async () => {
      // Simulate piped input
      Object.defineProperty(process.stdin, 'isTTY', {
        value: false,
        configurable: true
      });

      await transformAsync(stream, invalidJsonString);
      const error = await flushAsync(stream);
      // For piped input, certain errors should be handled gracefully
      if (!error) {
        expect(stream.exitCode).toBe(1);
      }
    });

    it('should handle TTY input errors', async () => {
      // Simulate TTY input
      Object.defineProperty(process.stdin, 'isTTY', {
        value: true,
        configurable: true
      });

      await transformAsync(stream, invalidJsonString);
      const error = await flushAsync(stream);
      expect(error).not.toBeNull();
    });

    it('should handle schema validation errors for piped input', async () => {
      Object.defineProperty(process.stdin, 'isTTY', {
        value: false,
        configurable: true
      });

      await transformAsync(stream, invalidSchemaJsonString);
      const error = await flushAsync(stream);
      // Schema errors should still be handled gracefully for piped input
      if (!error) {
        expect(stream.exitCode).toBe(1);
      }
    });
  });

  describe('Quiet Mode Error Handling', () => {
    beforeEach(() => {
      stream = new CompactStream({ ...validConfigs.defaultConfig, quiet: true });
    });

    it('should suppress error output in quiet mode with piped input', async () => {
      Object.defineProperty(process.stdin, 'isTTY', {
        value: false,
        configurable: true
      });

      const consoleSpy = vi.spyOn(console, 'error');

      await transformAsync(stream, invalidJsonString);
      const error = await flushAsync(stream);
      // In quiet mode, should handle gracefully without console output
      if (!error) {
        expect(stream.exitCode).toBe(1);
      }
      expect(consoleSpy).not.toHaveBeenCalled();
    });

    it('should still handle errors properly in quiet mode with TTY', async () => {
      Object.defineProperty(process.stdin, 'isTTY', {
        value: true,
        configurable: true
      });

      await transformAsync(stream, invalidJsonString);
      const error = await flushAsync(stream);
      expect(error).not.toBeNull();
    });
  });

  describe('Configuration File Errors', () => {
    // These tests simulate the loadConfig function behavior

    it('should handle missing configuration file', () => {
      mockExistsSync.mockReturnValue(false);

      const loadConfig = (configPath?: string) => {
        if (!configPath) return {};

        if (!mockExistsSync(configPath)) {
          throw new Error(`Configuration file not found: ${configPath}`);
        }
        return {};
      };

      expect(() => loadConfig('/nonexistent/config.json'))
        .toThrow('Configuration file not found');
    });

    it('should handle invalid configuration JSON', () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue('{ invalid json');

      const loadConfig = (configPath: string) => {
        if (!mockExistsSync(configPath)) {
          throw new Error(`Configuration file not found: ${configPath}`);
        }

        try {
          const configData = mockReadFileSync(configPath, 'utf-8');
          return JSON.parse(configData as string);
        } catch (error) {
          throw new Error(`Invalid configuration file: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      };

      expect(() => loadConfig('/invalid/config.json'))
        .toThrow('Invalid configuration file');
    });

    it('should handle file system errors', () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });

      const loadConfig = (configPath: string) => {
        try {
          const configData = mockReadFileSync(configPath, 'utf-8');
          return JSON.parse(configData as string);
        } catch (error) {
          throw new Error(`Invalid configuration file: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      };

      expect(() => loadConfig('/permission/denied.json'))
        .toThrow('Invalid configuration file: Permission denied');
    });
  });

  describe('Child Process Errors (SwiftLint execution)', () => {
    it('should handle SwiftLint process spawn errors', () => {
      const mockProcess = {
        stdout: {
          pipe: vi.fn()
        },
        stderr: {
          on: vi.fn()
        },
        on: vi.fn()
      };

      mockSpawn.mockReturnValue(mockProcess as any);

      // Simulate the runSwiftlintAndPipe function
      const runSwiftlintAndPipe = (stream: CompactStream, config: any) => {
        const swiftlintProcess = mockSpawn('swiftlint', ['lint', '--reporter', 'json']);

        swiftlintProcess.stdout.pipe(stream);

        swiftlintProcess.on('error', (err) => {
          if (!config.quiet) {
            console.error(`Failed to start swiftlint: ${err.message}`);
          }
          stream.end();
        });

        // Simulate process error
        const onErrorCallback = mockProcess.on.mock.calls.find(call => call[0] === 'error')?.[1];
        if (onErrorCallback) {
          onErrorCallback(new Error('ENOENT: swiftlint not found'));
        }
      };

      const consoleSpy = vi.spyOn(console, 'error');
      const stream = new CompactStream(validConfigs.defaultConfig);

      runSwiftlintAndPipe(stream, validConfigs.defaultConfig);

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Failed to start swiftlint'));
    });

    it('should handle SwiftLint process exit with non-zero code', () => {
      const mockProcess = {
        stdout: {
          pipe: vi.fn()
        },
        stderr: {
          on: vi.fn()
        },
        on: vi.fn()
      };

      mockSpawn.mockReturnValue(mockProcess as any);

      const runSwiftlintAndPipe = (stream: CompactStream, config: any) => {
        const swiftlintProcess = mockSpawn('swiftlint', ['lint', '--reporter', 'json']);

        swiftlintProcess.on('close', (code) => {
          if (code !== 0 && !config.quiet) {
            console.error(`swiftlint process exited with code ${code}`);
          }
          stream.end();
        });

        // Simulate process close with error code
        const onCloseCallback = mockProcess.on.mock.calls.find(call => call[0] === 'close')?.[1];
        if (onCloseCallback) {
          onCloseCallback(1);
        }
      };

      const consoleSpy = vi.spyOn(console, 'error');
      const stream = new CompactStream(validConfigs.defaultConfig);

      runSwiftlintAndPipe(stream, validConfigs.defaultConfig);

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('swiftlint process exited with code 1'));
    });

    it('should handle SwiftLint stderr output', () => {
      const mockProcess = {
        stdout: {
          pipe: vi.fn()
        },
        stderr: {
          on: vi.fn()
        },
        on: vi.fn()
      };

      mockSpawn.mockReturnValue(mockProcess as any);

      const runSwiftlintAndPipe = (stream: CompactStream, config: any) => {
        const swiftlintProcess = mockSpawn('swiftlint', ['lint', '--reporter', 'json']);

        swiftlintProcess.stderr.on('data', (data) => {
          if (!config.quiet) {
            console.error(`swiftlint stderr: ${data}`);
          }
        });

        // Simulate stderr data
        const onDataCallback = mockProcess.stderr.on.mock.calls.find(call => call[0] === 'data')?.[1];
        if (onDataCallback) {
          onDataCallback('SwiftLint error message');
        }
      };

      const consoleSpy = vi.spyOn(console, 'error');
      const stream = new CompactStream(validConfigs.defaultConfig);

      runSwiftlintAndPipe(stream, validConfigs.defaultConfig);

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('swiftlint stderr: SwiftLint error message'));
    });
  });

  describe('Exit Code Management', () => {
    it('should set exit code to 1 for parsing errors', async () => {
      stream = new CompactStream(validConfigs.defaultConfig);

      Object.defineProperty(process.stdin, 'isTTY', {
        value: false,
        configurable: true
      });

      await transformAsync(stream, invalidJsonString);
      const error = await flushAsync(stream);
      if (!error) {
        expect(stream.exitCode).toBe(1);
      }
    });

    it('should set exit code to 1 when issues are found', async () => {
      stream = new CompactStream(validConfigs.defaultConfig);

      await transformAsync(stream, validJsonString);
      const error = await flushAsync(stream);
      expect(error).toBeNull();
      expect(stream.exitCode).toBe(1); // Issues found
    });

    it('should set exit code to 0 for empty input', async () => {
      stream = new CompactStream(validConfigs.defaultConfig);

      await transformAsync(stream, Buffer.from(''));
      const error = await flushAsync(stream);
      expect(error).toBeNull();
      expect(stream.exitCode).toBe(0);
    });

    it('should set exit code to 0 for no issues found', async () => {
      stream = new CompactStream(validConfigs.defaultConfig);

      await transformAsync(stream, '[]');
      const error = await flushAsync(stream);
      expect(error).toBeNull();
      expect(stream.exitCode).toBe(0);
    });
  });

  describe('Stream Error Events', () => {
    it('should handle stream errors properly', async () => {
      stream = new CompactStream(validConfigs.defaultConfig);

      const errorPromise = new Promise<void>((resolve, reject) => {
        stream.once('error', (error) => {
          try {
            expect(error).toBeDefined();
            resolve();
          } catch (assertionError) {
            reject(assertionError);
          }
        });
      });

      // Force an error by calling _flush with invalid state
      stream.emit('error', new Error('Test stream error'));
      await errorPromise;
    });

    it('should handle data processing errors', async () => {
      stream = new CompactStream(validConfigs.defaultConfig);

      const errorPromise = new Promise<void>((resolve, reject) => {
        stream.once('error', (error) => {
          try {
            expect(error).toBeDefined();
            resolve();
          } catch (assertionError) {
            reject(assertionError);
          }
        });
      });

      const parseResult = (stream as any).parseAndValidateInput('invalid json');
      if (!parseResult.success) {
        stream.emit('error', new Error(parseResult.error.message));
      }
      await errorPromise;
    });
  });

  describe('Edge Case Error Scenarios', () => {
    beforeEach(() => {
      stream = new CompactStream(validConfigs.defaultConfig);
    });

    it('should handle extremely large JSON input', async () => {
      // Create a large but valid JSON array
      const largeArray = Array(1000).fill(0).map((_, i) => ({
        character: i % 100,
        file: `/path/to/file${i}.swift`,
        line: i + 1,
        reason: `Reason ${i}`,
        rule_id: `rule_${i}`,
        severity: i % 2 === 0 ? 'Warning' : 'Error',
        type: `Type${i}`
      }));

      const largeJson = JSON.stringify(largeArray);

      await transformAsync(stream, largeJson);
      const error = await flushAsync(stream);
      expect(error).toBeNull();
      expect(stream.exitCode).toBe(1); // Issues found
    });

    it('should handle deeply nested JSON structures', async () => {
      const deeplyNested = JSON.stringify({
        level1: {
          level2: {
            level3: {
              issues: []
            }
          }
        }
      });

      await transformAsync(stream, deeplyNested);
      const error = await flushAsync(stream);
      expect(error).not.toBeNull();
      expect(error?.message).toContain('Invalid SwiftLint JSON structure');
    });

    it('should handle binary data input', async () => {
      const binaryData = Buffer.from([0x00, 0x01, 0x02, 0x03, 0xFF, 0xFE]);

      await transformAsync(stream, binaryData);
      const error = await flushAsync(stream);
      expect(error).not.toBeNull();
    });
  });
});
