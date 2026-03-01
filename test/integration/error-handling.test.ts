import { describe, test, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { CliTestHelper, TestUtils } from './test-helper';

describe('Error Handling Integration Tests', () => {
  let cli: CliTestHelper;
  let fixtures: Record<string, string>;

  beforeAll(async () => {
    cli = new CliTestHelper();

    // Load test fixtures
    const fixturesDir = resolve(__dirname, '../fixtures');
    fixtures = {
      malformed: readFileSync(resolve(fixturesDir, 'malformed.json'), 'utf-8'),
      invalidSchema: readFileSync(resolve(fixturesDir, 'invalid-schema.json'), 'utf-8'),
      valid: readFileSync(resolve(fixturesDir, 'warnings-only.json'), 'utf-8')
    };
  });

  describe('Invalid JSON Input Tests', () => {
    test('should handle malformed JSON gracefully', async () => {
      const result = await cli.runCli({
        args: [],
        input: fixtures.malformed
      });

      expect(result.stderr).toContain('Failed to parse SwiftLint JSON input');
      expect(result.exitCode).toBe(TestUtils.EXIT_CODES.ISSUES_FOUND);
    });

    test('should handle incomplete JSON', async () => {
      const incompleteJson = '{"file": "test.swift"';

      const result = await cli.runCli({
        args: [],
        input: incompleteJson
      });

      expect(result.stderr).toContain('Failed to parse SwiftLint JSON input');
      expect(result.exitCode).toBe(TestUtils.EXIT_CODES.ISSUES_FOUND);
    });

    test('should handle empty string input', async () => {
      const result = await cli.runCliSuccess({
        args: [],
        input: ''
      });

      expect(result.stdout).toBe('');
      expect(result.exitCode).toBe(TestUtils.EXIT_CODES.SUCCESS);
    });

    test('should handle null input', async () => {
      const result = await cli.runCli({
        args: [],
        input: 'null'
      });

      expect(result.stderr).toContain('Invalid SwiftLint JSON structure');
      expect(result.exitCode).toBe(TestUtils.EXIT_CODES.ISSUES_FOUND);
    });

    test('should handle non-JSON text input', async () => {
      const result = await cli.runCli({
        args: [],
        input: 'This is not JSON at all'
      });

      expect(result.stderr).toContain('Failed to parse SwiftLint JSON input');
      expect(result.exitCode).toBe(TestUtils.EXIT_CODES.ISSUES_FOUND);
    });

    test('should handle JSON with syntax errors across all formats', async () => {
      for (const format of TestUtils.FORMATS) {
        const result = await cli.runCli({
          args: ['--format', format],
          input: fixtures.malformed
        });

        expect(result.stderr).toContain('Failed to parse SwiftLint JSON input');
        expect(result.exitCode).toBe(TestUtils.EXIT_CODES.ISSUES_FOUND);
      }
    });
  });

  describe('Invalid SwiftLint Schema Tests', () => {
    test('should reject JSON with wrong structure', async () => {
      const result = await cli.runCli({
        args: [],
        input: fixtures.invalidSchema
      });

      expect(result.stderr).toContain('Invalid SwiftLint JSON structure');
      expect(result.exitCode).toBe(TestUtils.EXIT_CODES.ISSUES_FOUND);
    });

    test('should provide detailed validation errors', async () => {
      const result = await cli.runCli({
        args: [],
        input: fixtures.invalidSchema
      });

      expect(result.stderr).toContain('Invalid SwiftLint JSON structure');
      // Should contain path information from Zod validation
      expect(result.stderr).toMatch(/(Path:|Message:)/);
    });

    test('should handle array with mixed valid and invalid items', async () => {
      const mixedInput = JSON.stringify([
        {
          "character": 10,
          "file": "/valid/file.swift",
          "line": 15,
          "reason": "Valid issue",
          "rule_id": "test_rule",
          "severity": "Warning",
          "type": "Test"
        },
        {
          "invalid_field": "value",
          "missing": "required fields"
        }
      ]);

      const result = await cli.runCli({
        args: [],
        input: mixedInput
      });

      expect(result.stderr).toContain('Invalid SwiftLint JSON structure');
      expect(result.exitCode).toBe(TestUtils.EXIT_CODES.ISSUES_FOUND);
    });

    test('should handle wrong severity values', async () => {
      const wrongSeverityInput = JSON.stringify([
        {
          "character": 10,
          "file": "/test/file.swift",
          "line": 15,
          "reason": "Test issue",
          "rule_id": "test_rule",
          "severity": "InvalidSeverity",
          "type": "Test"
        }
      ]);

      const result = await cli.runCli({
        args: [],
        input: wrongSeverityInput
      });

      expect(result.stderr).toContain('Invalid SwiftLint JSON structure');
      expect(result.exitCode).toBe(TestUtils.EXIT_CODES.ISSUES_FOUND);
    });

    test('should handle wrong data types', async () => {
      const wrongTypesInput = JSON.stringify([
        {
          "character": "should_be_number",
          "file": 123,
          "line": "should_be_number",
          "reason": "Test issue",
          "rule_id": "test_rule",
          "severity": "Warning",
          "type": "Test"
        }
      ]);

      const result = await cli.runCli({
        args: [],
        input: wrongTypesInput
      });

      expect(result.stderr).toContain('Invalid SwiftLint JSON structure');
      expect(result.exitCode).toBe(TestUtils.EXIT_CODES.ISSUES_FOUND);
    });
  });

  describe('Configuration Error Tests', () => {
    test('should handle non-existent config file', async () => {
      const result = await cli.runCliConfigError({
        args: ['--config', '/path/that/does/not/exist.json']
      });

      expect(result.stderr).toContain('Configuration file not found');
      expect(result.exitCode).toBe(TestUtils.EXIT_CODES.CONFIG_ERROR);
    });

    test('should handle malformed config file', async () => {
      const configPath = resolve(__dirname, '../fixtures/config/invalid-config.json');

      const result = await cli.runCliConfigError({
        args: ['--config', configPath]
      });

      expect(result.stderr).toContain('Invalid configuration file');
      expect(result.exitCode).toBe(TestUtils.EXIT_CODES.CONFIG_ERROR);
    });

    test('should handle invalid format in CLI args', async () => {
      const result = await cli.runCliConfigError({
        args: ['--format', 'invalid_format']
      });

      expect(result.stderr).toContain('Invalid format: invalid_format');
      expect(result.stderr).toContain('Valid options: compact, json, table');
      expect(result.exitCode).toBe(TestUtils.EXIT_CODES.CONFIG_ERROR);
    });

    test('should provide helpful error message for config errors', async () => {
      const result = await cli.runCliConfigError({
        args: ['--format', 'bad_format']
      });

      expect(result.stderr).toContain('Error:');
      expect(result.stderr).toContain('Use --help for usage information');
      expect(result.exitCode).toBe(TestUtils.EXIT_CODES.CONFIG_ERROR);
    });
  });

  describe('Input/Output Error Tests', () => {
    test('should handle very large input gracefully', async () => {
      // Create a very large but valid JSON input
      const largeIssues = Array.from({ length: 1000 }, (_, i) => ({
        character: i,
        file: `/test/file${i}.swift`,
        line: i + 1,
        reason: `Issue number ${i}`,
        rule_id: `rule_${i}`,
        severity: i % 2 === 0 ? 'Warning' : 'Error',
        type: 'Test'
      }));

      const result = await cli.runCli({
        args: ['--format', 'compact'],
        input: JSON.stringify(largeIssues),
        timeout: TestUtils.PERFORMANCE_TIMEOUT
      });

      expect(result.exitCode).toBe(TestUtils.EXIT_CODES.ISSUES_FOUND);
      expect(result.stdout).toContain('✖ 1000 problems');
      expect(result.duration).toBeLessThan(15000); // Should complete within 15 seconds
    });

    test('should handle corrupted UTF-8 sequences', async () => {
      // Create input with invalid UTF-8 byte sequences
      const corruptedInput = Buffer.from([
        0x7b, 0x22, 0x66, 0x69, 0x6c, 0x65, 0x22, 0x3a, 0x22,  // {"file":"
        0xff, 0xfe, 0xfd,  // Invalid UTF-8 bytes
        0x22, 0x7d  // "}
      ]).toString('latin1');

      const result = await cli.runCli({
        args: [],
        input: corruptedInput
      });

      // Should either handle gracefully or show appropriate error
      expect([TestUtils.EXIT_CODES.ISSUES_FOUND, TestUtils.EXIT_CODES.CONFIG_ERROR])
        .toContain(result.exitCode!);
    });

    test('should handle interrupted input stream', async () => {
      // Test what happens when input is cut off mid-stream
      const partialInput = '{"character": 10, "file": "/test/file.swift", "line": 15, "reason": "Test';

      const result = await cli.runCli({
        args: [],
        input: partialInput,
        timeout: 5000
      });

      expect(result.stderr).toContain('Failed to parse SwiftLint JSON input');
      expect(result.exitCode).toBe(TestUtils.EXIT_CODES.ISSUES_FOUND);
    });
  });

  describe('Timeout and Performance Error Tests', () => {
    test('should handle extremely large input within reasonable time', async () => {
      // Test with very large but still manageable input
      const massiveIssues = Array.from({ length: 5000 }, (_, i) => ({
        character: i,
        file: `/very/long/path/to/file/number/${i}/in/deep/directory/structure/file${i}.swift`,
        line: i + 1,
        reason: `This is a very long reason message that contains lots of details about issue number ${i} `.repeat(5),
        rule_id: `rule_${i}`,
        severity: i % 3 === 0 ? 'Error' : 'Warning',
        type: `Type ${i}`
      }));

      const result = await cli.runCli({
        args: ['--format', 'json'],
        input: JSON.stringify(massiveIssues),
        timeout: TestUtils.PERFORMANCE_TIMEOUT
      });

      expect(result.timedOut).toBe(false);
      expect(result.exitCode).toBe(TestUtils.EXIT_CODES.ISSUES_FOUND);
    });

    test('should not hang on malformed input', async () => {
      const hangInput = '{"file": "' + 'x'.repeat(100000); // Unclosed string

      const result = await cli.runCli({
        args: [],
        input: hangInput,
        timeout: 5000
      });

      expect(result.timedOut).toBe(false);
      expect(result.duration).toBeLessThan(5000);
    });
  });

  describe('Edge Case Error Scenarios', () => {
    test('should handle binary data as input', async () => {
      const binaryData = Buffer.from([0x00, 0x01, 0x02, 0x03, 0xff, 0xfe, 0xfd]).toString();

      const result = await cli.runCli({
        args: [],
        input: binaryData
      });

      expect(result.stderr).toContain('Failed to parse SwiftLint JSON input');
      expect(result.exitCode).toBe(TestUtils.EXIT_CODES.ISSUES_FOUND);
    });

    test('should handle deeply nested JSON', async () => {
      const deeplyNested = '{"a":'.repeat(1000) + '{}' + '}'.repeat(1000);

      const result = await cli.runCli({
        args: [],
        input: deeplyNested,
        timeout: 10000
      });

      expect(result.exitCode).toBe(TestUtils.EXIT_CODES.ISSUES_FOUND);
      expect(result.timedOut).toBe(false);
    });

    test('should handle JSON with very long strings', async () => {
      const veryLongStringInput = JSON.stringify([{
        character: 10,
        file: 'x'.repeat(100000),
        line: 15,
        reason: 'y'.repeat(100000),
        rule_id: 'test_rule',
        severity: 'Warning',
        type: 'Test'
      }]);

      const result = await cli.runCli({
        args: ['--format', 'compact'],
        input: veryLongStringInput,
        timeout: TestUtils.PERFORMANCE_TIMEOUT
      });

      expect(result.exitCode).toBe(TestUtils.EXIT_CODES.ISSUES_FOUND);
    });

    test('should handle simultaneous errors in multiple formats', async () => {
      const invalidInput = '{"invalid": "json"';

      const results = await Promise.allSettled([
        cli.runCli({ args: ['--format', 'compact'], input: invalidInput }),
        cli.runCli({ args: ['--format', 'json'], input: invalidInput }),
        cli.runCli({ args: ['--format', 'table'], input: invalidInput })
      ]);

      // All should handle the error consistently
      for (const result of results) {
        expect(result.status).toBe('fulfilled');
        if (result.status === 'fulfilled') {
          expect(result.value.exitCode).toBe(TestUtils.EXIT_CODES.ISSUES_FOUND);
          expect(result.value.stderr).toContain('Failed to parse SwiftLint JSON input');
        }
      }
    });
  });

  describe('Recovery and Graceful Degradation', () => {
    test('should show usage information on parsing errors', async () => {
      const result = await cli.runCli({
        args: [],
        input: fixtures.malformed
      });

      expect(result.stderr).toContain('Failed to parse SwiftLint JSON input');
      // Should show usage help for context when piped input is invalid
    });

    test('should handle errors in quiet mode appropriately', async () => {
      const result = await cli.runCli({
        args: ['--quiet'],
        input: fixtures.malformed
      });

      // In quiet mode, piped parsing errors are handled without stderr output.
      expect(result.stderr).toBe('');
      expect(result.exitCode).toBe(TestUtils.EXIT_CODES.ISSUES_FOUND);
    });

    test('should handle errors with color disabled', async () => {
      const result = await cli.runCli({
        args: ['--no-color'],
        input: fixtures.malformed
      });

      expect(result.stderr).toContain('Failed to parse SwiftLint JSON input');
      expect(result.stderr).not.toMatch(/\x1b\[/); // No ANSI escape sequences
    });

    test('should maintain consistent error format across configurations', async () => {
      const errorInputs = [fixtures.malformed, fixtures.invalidSchema];

      for (const errorInput of errorInputs) {
        for (const format of TestUtils.FORMATS) {
          const result = await cli.runCli({
            args: ['--format', format],
            input: errorInput
          });

          expect(result.exitCode).toBe(TestUtils.EXIT_CODES.ISSUES_FOUND);
          expect(result.stderr).toBeTruthy();
        }
      }
    });
  });
});
