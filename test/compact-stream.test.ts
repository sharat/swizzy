/**
 * Unit tests for CompactStream class
 */

import { Transform } from 'stream';
import { CompactStream } from '../src/index';
import { vi } from 'vitest';
import {
  validJsonString,
  emptyJsonString,
  invalidJsonString,
  invalidSchemaJsonString,
  multipleIssuesMultipleFiles,
  validSwiftLintIssue,
  emptyIssuesArray
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

// Mock console to avoid output during tests
vi.mock('console', () => ({
  log: vi.fn(),
  error: vi.fn(),
  warn: vi.fn()
}));

describe('CompactStream', () => {
  let stream: CompactStream;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor and basic properties', () => {
    it('should create instance with default config', () => {
      stream = new CompactStream(validConfigs.defaultConfig);

      expect(stream).toBeInstanceOf(Transform);
      expect(stream).toBeInstanceOf(CompactStream);
      expect(stream.exitCode).toBe(0);
    });

    it('should initialize with provided config', () => {
      stream = new CompactStream(validConfigs.tableFormat);
      expect(stream).toBeDefined();
    });

    it('should implement StreamWithExitCode interface', () => {
      stream = new CompactStream(validConfigs.defaultConfig);
      expect(typeof stream.exitCode).toBe('number');
    });
  });

  describe('_transform method', () => {
    beforeEach(() => {
      stream = new CompactStream(validConfigs.defaultConfig);
    });

    it('should buffer incoming chunks', async () => {
      const testData = Buffer.from('test data');
      await transformAsync(stream, testData);
    });

    it('should handle multiple chunks', async () => {
      await transformAsync(stream, 'chunk1');
      await transformAsync(stream, 'chunk2');
      await transformAsync(stream, 'chunk3');
    });

    it('should handle empty chunks', async () => {
      await transformAsync(stream, Buffer.from(''));
    });
  });

  describe('_flush method - valid input processing', () => {
    it('should process valid SwiftLint JSON and set exit code correctly', async () => {
      stream = new CompactStream(validConfigs.defaultConfig);
      let outputData = '';

      stream.on('data', (chunk) => {
        outputData += chunk;
      });

      const endPromise = new Promise<void>((resolve, reject) => {
        stream.once('end', () => {
          try {
            expect(outputData.length).toBeGreaterThan(0);
            expect(stream.exitCode).toBe(1); // Issues found
            resolve();
          } catch (error) {
            reject(error);
          }
        });
      });

      // Simulate buffering valid JSON data
      await transformAsync(stream, validJsonString);
      const error = await flushAsync(stream);
      expect(error).toBeNull();
      stream.end();
      await endPromise;
    });

    it('should handle empty input gracefully', async () => {
      stream = new CompactStream(validConfigs.defaultConfig);
      let outputData = '';

      stream.on('data', (chunk) => {
        outputData += chunk;
      });

      const endPromise = new Promise<void>((resolve, reject) => {
        stream.once('end', () => {
          try {
            expect(outputData).toBe('');
            expect(stream.exitCode).toBe(0); // No issues
            resolve();
          } catch (error) {
            reject(error);
          }
        });
      });

      await transformAsync(stream, Buffer.from(''));
      const error = await flushAsync(stream);
      expect(error).toBeNull();
      stream.end();
      await endPromise;
    });

    it('should handle empty SwiftLint output (no issues)', async () => {
      stream = new CompactStream(validConfigs.defaultConfig);
      let outputData = '';

      stream.on('data', (chunk) => {
        outputData += chunk;
      });

      const endPromise = new Promise<void>((resolve, reject) => {
        stream.once('end', () => {
          try {
            expect(outputData).toBe('');
            expect(stream.exitCode).toBe(0);
            resolve();
          } catch (error) {
            reject(error);
          }
        });
      });

      await transformAsync(stream, emptyJsonString);
      const error = await flushAsync(stream);
      expect(error).toBeNull();
      stream.end();
      await endPromise;
    });

    it('should handle whitespace-only input', async () => {
      stream = new CompactStream(validConfigs.defaultConfig);

      await transformAsync(stream, '   \n\t  ');
      const error = await flushAsync(stream);
      expect(error).toBeNull();
      expect(stream.exitCode).toBe(0);
    });
  });

  describe('_flush method - error handling', () => {
    it('should handle invalid JSON input', async () => {
      stream = new CompactStream(validConfigs.defaultConfig);

      await transformAsync(stream, invalidJsonString);
      const error = await flushAsync(stream);
      expect(error).not.toBeNull();
      expect(error?.message).toContain('Failed to parse SwiftLint JSON input');
    });

    it('should handle invalid SwiftLint schema', async () => {
      stream = new CompactStream(validConfigs.defaultConfig);

      await transformAsync(stream, invalidSchemaJsonString);
      const error = await flushAsync(stream);
      expect(error).not.toBeNull();
      expect(error?.message).toContain('Invalid SwiftLint JSON structure');
    });

    it('should set appropriate exit codes for errors', async () => {
      stream = new CompactStream(validConfigs.defaultConfig);

      // Mock process.stdin.isTTY to simulate piped input
      Object.defineProperty(process.stdin, 'isTTY', {
        value: false,
        configurable: true
      });

      await transformAsync(stream, invalidJsonString);
      const error = await flushAsync(stream);
      if (!error) {
        // When handling piped input errors gracefully
        expect(stream.exitCode).toBe(1);
      }
    });
  });

  describe('parseAndValidateInput method', () => {
    beforeEach(() => {
      stream = new CompactStream(validConfigs.defaultConfig);
    });

    it('should parse valid JSON successfully', () => {
      // Access private method for testing (using bracket notation)
      const parseMethod = (stream as any).parseAndValidateInput.bind(stream);
      const result = parseMethod(validJsonString);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(Array.isArray(result.data)).toBe(true);
        expect(result.data).toEqual(multipleIssuesMultipleFiles);
      }
    });

    it('should validate against SwiftLint schema', () => {
      const parseMethod = (stream as any).parseAndValidateInput.bind(stream);
      const result = parseMethod(JSON.stringify([validSwiftLintIssue]));

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(1);
        expect(result.data[0]).toEqual(validSwiftLintIssue);
      }
    });

    it('should return parsing error for malformed JSON', () => {
      const parseMethod = (stream as any).parseAndValidateInput.bind(stream);
      const result = parseMethod(invalidJsonString);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('Failed to parse SwiftLint JSON input');
      }
    });

    it('should return validation error for invalid schema', () => {
      const parseMethod = (stream as any).parseAndValidateInput.bind(stream);
      const result = parseMethod(invalidSchemaJsonString);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('Invalid SwiftLint JSON structure');
      }
    });

    it('should provide detailed schema validation errors', () => {
      const parseMethod = (stream as any).parseAndValidateInput.bind(stream);
      const invalidStructure = JSON.stringify([{ file: 'test.swift' }]); // Missing required fields

      const result = parseMethod(invalidStructure);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toMatch(/Invalid SwiftLint JSON structure:.*Path:.*Message:/);
      }
    });
  });

  describe('groupIssuesByFile method', () => {
    beforeEach(() => {
      stream = new CompactStream(validConfigs.defaultConfig);
    });

    it('should group issues by file path correctly', () => {
      const groupMethod = (stream as any).groupIssuesByFile.bind(stream);
      const grouped = groupMethod(multipleIssuesMultipleFiles);

      expect(grouped instanceof Map).toBe(true);
      expect(grouped.size).toBe(2); // Two different files

      const fileAIssues = grouped.get('/path/to/FileA.swift');
      const fileBIssues = grouped.get('/path/to/FileB.swift');

      expect(fileAIssues).toHaveLength(2);
      expect(fileBIssues).toHaveLength(1);
    });

    it('should handle empty issues array', () => {
      const groupMethod = (stream as any).groupIssuesByFile.bind(stream);
      const grouped = groupMethod(emptyIssuesArray);

      expect(grouped instanceof Map).toBe(true);
      expect(grouped.size).toBe(0);
    });

    it('should handle single issue', () => {
      const groupMethod = (stream as any).groupIssuesByFile.bind(stream);
      const grouped = groupMethod([validSwiftLintIssue]);

      expect(grouped.size).toBe(1);
      expect(grouped.get('/path/to/MyViewController.swift')).toHaveLength(1);
    });
  });

  describe('output format methods', () => {
    beforeEach(() => {
      stream = new CompactStream(validConfigs.defaultConfig);
    });

    describe('formatAsJson', () => {
      it('should format issues as JSON string', () => {
        const formatMethod = (stream as any).formatAsJson.bind(stream);
        const result = formatMethod([validSwiftLintIssue]);

        expect(typeof result).toBe('string');
        expect(result).toContain('"file"');
        expect(result).toContain('"severity"');
        expect(result.endsWith('\n')).toBe(true);

        // Verify it's valid JSON
        const parsed = JSON.parse(result.trim());
        expect(Array.isArray(parsed)).toBe(true);
        expect(parsed[0]).toEqual(validSwiftLintIssue);
      });

      it('should handle empty issues array', () => {
        const formatMethod = (stream as any).formatAsJson.bind(stream);
        const result = formatMethod(emptyIssuesArray);

        expect(result).toBe('[]\n');
      });
    });

    describe('formatAsTable', () => {
      it('should format issues as table with headers', () => {
        const formatMethod = (stream as any).formatAsTable.bind(stream);
        const result = formatMethod([validSwiftLintIssue]);

        expect(typeof result).toBe('string');
        expect(result).toContain('File');
        expect(result).toContain('Line');
        expect(result).toContain('Col');
        expect(result).toContain('Severity');
        expect(result).toContain('Rule');
        expect(result).toContain('Message');
        expect(result).toContain('1 problem');
      });

      it('should handle multiple issues', () => {
        const formatMethod = (stream as any).formatAsTable.bind(stream);
        const result = formatMethod(multipleIssuesMultipleFiles);

        expect(result).toContain('3 problems');
      });
    });

    describe('formatAsCompact', () => {
      it('should format issues in compact format with file grouping', () => {
        const formatMethod = (stream as any).formatAsCompact.bind(stream);
        const result = formatMethod(multipleIssuesMultipleFiles);

        expect(typeof result).toBe('string');
        expect(result).toContain('/path/to/FileA.swift');
        expect(result).toContain('/path/to/FileB.swift');
        expect(result).toContain('3 problems');
      });

      it('should handle single file with multiple issues', () => {
        const formatMethod = (stream as any).formatAsCompact.bind(stream);
        const singleFileIssues = [
          { ...validSwiftLintIssue, line: 10 },
          { ...validSwiftLintIssue, line: 20 }
        ];
        const result = formatMethod(singleFileIssues);

        // Should appear only once as header
        const fileOccurrences = (result.match(/\/path\/to\/MyViewController\.swift/g) || []).length;
        expect(fileOccurrences).toBe(1);
        expect(result).toContain('2 problems');
      });
    });
  });

  describe('processSwiftlintIssues method', () => {
    it('should return empty string for no issues', () => {
      stream = new CompactStream(validConfigs.defaultConfig);
      const processMethod = (stream as any).processSwiftlintIssues.bind(stream);
      const result = processMethod(emptyIssuesArray);

      expect(result).toBe('');
    });

    it('should use correct format based on config - compact', () => {
      stream = new CompactStream({ ...validConfigs.defaultConfig, format: 'compact' });
      const processMethod = (stream as any).processSwiftlintIssues.bind(stream);
      const result = processMethod([validSwiftLintIssue]);

      expect(result).toContain('MyViewController.swift');
      expect(result).toContain('1 problem');
    });

    it('should use correct format based on config - json', () => {
      stream = new CompactStream({ ...validConfigs.defaultConfig, format: 'json' });
      const processMethod = (stream as any).processSwiftlintIssues.bind(stream);
      const result = processMethod([validSwiftLintIssue]);

      expect(result.startsWith('[')).toBe(true);
      expect(result.endsWith(']\n')).toBe(true);
    });

    it('should use correct format based on config - table', () => {
      stream = new CompactStream({ ...validConfigs.defaultConfig, format: 'table' });
      const processMethod = (stream as any).processSwiftlintIssues.bind(stream);
      const result = processMethod([validSwiftLintIssue]);

      expect(result).toContain('File');
      expect(result).toContain('Line');
      expect(result).toContain('Severity');
    });
  });

  describe('error handling with quiet mode', () => {
    it('should handle errors silently in quiet mode', async () => {
      stream = new CompactStream({ ...validConfigs.defaultConfig, quiet: true });

      // Mock process.stdin.isTTY for piped input simulation
      Object.defineProperty(process.stdin, 'isTTY', {
        value: false,
        configurable: true
      });

      await transformAsync(stream, invalidJsonString);
      const error = await flushAsync(stream);
      // In quiet mode with piped input, should handle gracefully
      if (!error) {
        expect(stream.exitCode).toBe(1);
      }
    });
  });

  describe('integration scenarios', () => {
    it('should handle end-to-end processing of valid input', async () => {
      stream = new CompactStream(validConfigs.defaultConfig);
      let outputBuffer = '';

      stream.on('data', (chunk) => {
        outputBuffer += chunk;
      });

      const endPromise = new Promise<void>((resolve, reject) => {
        stream.once('end', () => {
          try {
            expect(outputBuffer.length).toBeGreaterThan(0);
            expect(outputBuffer).toContain('FileA.swift');
            expect(outputBuffer).toContain('FileB.swift');
            expect(stream.exitCode).toBe(1);
            resolve();
          } catch (error) {
            reject(error);
          }
        });
      });

      // Write data and end stream
      stream.write(validJsonString);
      stream.end();
      await endPromise;
    });

    it('should handle streaming with multiple writes', async () => {
      stream = new CompactStream(validConfigs.defaultConfig);
      const data1 = validJsonString.slice(0, 100);
      const data2 = validJsonString.slice(100);

      let outputBuffer = '';

      stream.on('data', (chunk) => {
        outputBuffer += chunk;
      });

      const endPromise = new Promise<void>((resolve, reject) => {
        stream.once('end', () => {
          try {
            expect(outputBuffer).toContain('problems');
            resolve();
          } catch (error) {
            reject(error);
          }
        });
      });

      stream.write(data1);
      stream.write(data2);
      stream.end();
      await endPromise;
    });
  });
});
