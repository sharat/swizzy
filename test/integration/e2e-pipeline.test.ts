import { describe, test, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { CliTestHelper, TestUtils } from './test-helper';

describe('End-to-End Pipeline Tests', () => {
  let cli: CliTestHelper;
  let fixtures: Record<string, string>;
  let largeFixtureIssueCount: number;

  beforeAll(async () => {
    cli = new CliTestHelper();

    // Load test fixtures
    const fixturesDir = resolve(__dirname, '../fixtures');
    fixtures = {
      warningsOnly: readFileSync(resolve(fixturesDir, 'warnings-only.json'), 'utf-8'),
      errorsAndWarnings: readFileSync(resolve(fixturesDir, 'errors-and-warnings.json'), 'utf-8'),
      empty: readFileSync(resolve(fixturesDir, 'empty-output.json'), 'utf-8'),
      singleError: readFileSync(resolve(fixturesDir, 'single-error.json'), 'utf-8'),
      large: readFileSync(resolve(fixturesDir, 'large-output.json'), 'utf-8'),
      unicode: readFileSync(resolve(fixturesDir, 'unicode-paths.json'), 'utf-8')
    };
    largeFixtureIssueCount = JSON.parse(fixtures.large).length;
  });

  describe('Compact Format Tests', () => {
    test('should format warnings-only output in compact format', async () => {
      const result = await cli.runCliFailure({
        args: ['--format', 'compact'],
        input: fixtures.warningsOnly
      });

      expect(result.stdout).toContain('ViewController.swift');
      expect(result.stdout).toContain('warning');
      expect(result.stdout).toContain('file_name');
      expect(result.stdout).toContain('✖ 4 problems');
      expect(cli.stripColors(result.stdout)).toMatch(/\d+:\d+/); // Line:column format
    });

    test('should format errors and warnings in compact format', async () => {
      const result = await cli.runCliFailure({
        args: ['--format', 'compact'],
        input: fixtures.errorsAndWarnings
      });

      expect(result.stdout).toContain('error');
      expect(result.stdout).toContain('warning');
      expect(result.stdout).toContain('AppDelegate.swift');
      expect(result.stdout).toContain('ViewController.swift');
      expect(result.stdout).toContain('✖ 6 problems');
    });

    test('should handle empty input gracefully', async () => {
      const result = await cli.runCliSuccess({
        args: ['--format', 'compact'],
        input: fixtures.empty
      });

      expect(result.stdout.trim()).toBe('');
    });

    test('should format single error properly', async () => {
      const result = await cli.runCliFailure({
        args: ['--format', 'compact'],
        input: fixtures.singleError
      });

      expect(result.stdout).toContain('main.swift');
      expect(result.stdout).toContain('error');
      expect(result.stdout).toContain('✖ 1 problem');
    });

    test('should handle Unicode file paths correctly', async () => {
      const result = await cli.runCliFailure({
        args: ['--format', 'compact'],
        input: fixtures.unicode
      });

      expect(result.stdout).toContain('用户管理');
      expect(result.stdout).toContain('Configuración');
      expect(result.stdout).toContain('Pokémon');
      expect(result.stdout).toContain('✖ 5 problems');
    });

    test('should parse default SwiftLint text output from piped input', async () => {
      const swiftlintTextOutput = [
        '/Users/dev/MyApp/ViewController.swift:12:8: warning: Line should be 120 characters or less: currently 135 characters (line_length)',
        '/Users/dev/MyApp/AppDelegate.swift:27:5: error: Force unwrapping should be avoided (force_unwrapping)',
        'Done linting! Found 2 violations, 1 serious in 2 files.'
      ].join('\n');

      const result = await cli.runCliFailure({
        args: ['--format', 'compact'],
        input: swiftlintTextOutput
      });

      expect(result.stdout).toContain('ViewController.swift');
      expect(result.stdout).toContain('AppDelegate.swift');
      expect(result.stdout).toContain('warning');
      expect(result.stdout).toContain('error');
      expect(result.stdout).toContain('line_length');
      expect(result.stdout).toContain('force_unwrapping');
      expect(result.stdout).toContain('✖ 2 problems');
    });
  });

  describe('JSON Format Tests', () => {
    test('should output valid JSON for warnings-only input', async () => {
      const result = await cli.runCliFailure({
        args: ['--format', 'json'],
        input: fixtures.warningsOnly
      });

      const parsedOutput = JSON.parse(result.stdout);
      expect(Array.isArray(parsedOutput)).toBe(true);
      expect(parsedOutput).toHaveLength(4);
      expect(parsedOutput[0]).toHaveProperty('file');
      expect(parsedOutput[0]).toHaveProperty('severity', 'Warning');
    });

    test('should output valid JSON for mixed errors and warnings', async () => {
      const result = await cli.runCliFailure({
        args: ['--format', 'json'],
        input: fixtures.errorsAndWarnings
      });

      const parsedOutput = JSON.parse(result.stdout);
      expect(Array.isArray(parsedOutput)).toBe(true);
      expect(parsedOutput).toHaveLength(6);

      const errors = parsedOutput.filter(issue => issue.severity === 'Error');
      const warnings = parsedOutput.filter(issue => issue.severity === 'Warning');

      expect(errors).toHaveLength(2);
      expect(warnings).toHaveLength(4);
    });

    test('should output empty array for empty input', async () => {
      const result = await cli.runCliSuccess({
        args: ['--format', 'json'],
        input: fixtures.empty
      });

      const parsedOutput = JSON.parse(result.stdout || '[]');
      expect(Array.isArray(parsedOutput)).toBe(true);
      expect(parsedOutput).toHaveLength(0);
    });

    test('should preserve all original fields in JSON output', async () => {
      const result = await cli.runCliFailure({
        args: ['--format', 'json'],
        input: fixtures.singleError
      });

      const parsedOutput = JSON.parse(result.stdout);
      const issue = parsedOutput[0];

      expect(issue).toHaveProperty('character', 25);
      expect(issue).toHaveProperty('file');
      expect(issue).toHaveProperty('line', 12);
      expect(issue).toHaveProperty('reason');
      expect(issue).toHaveProperty('rule_id', 'unresolved_identifier');
      expect(issue).toHaveProperty('severity', 'Error');
      expect(issue).toHaveProperty('type', 'Compilation Error');
    });
  });

  describe('Table Format Tests', () => {
    test('should format warnings-only output as table', async () => {
      const result = await cli.runCliFailure({
        args: ['--format', 'table'],
        input: fixtures.warningsOnly
      });

      expect(result.stdout).toContain('File');
      expect(result.stdout).toContain('Line');
      expect(result.stdout).toContain('Col');
      expect(result.stdout).toContain('Severity');
      expect(result.stdout).toContain('Rule');
      expect(result.stdout).toContain('Message');
      expect(result.stdout).toContain('✖ 4 problems');
    });

    test('should format mixed errors and warnings as table', async () => {
      const result = await cli.runCliFailure({
        args: ['--format', 'table'],
        input: fixtures.errorsAndWarnings
      });

      expect(result.stdout).toContain('Warning');
      expect(result.stdout).toContain('Error');
      expect(result.stdout).toContain('✖ 6 problems');

      // Check table structure
      const lines = result.stdout.split('\n').filter(line => line.trim());
      expect(lines.some(line => line.includes('AppDelegate.swift'))).toBe(true);
      expect(lines.some(line => line.includes('ViewController.swift'))).toBe(true);
    });

    test('should handle empty input gracefully in table format', async () => {
      const result = await cli.runCliSuccess({
        args: ['--format', 'table'],
        input: fixtures.empty
      });

      expect(result.stdout.trim()).toBe('');
    });

    test('should format large output as table efficiently', async () => {
      const result = await cli.runCliFailure({
        args: ['--format', 'table'],
        input: fixtures.large,
        timeout: TestUtils.PERFORMANCE_TIMEOUT
      });

      expect(result.stdout).toContain('File');
      expect(result.stdout).toContain(`✖ ${largeFixtureIssueCount} problems`);
      expect(result.duration).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });

  describe('Format Comparison Tests', () => {
    test('should process same input differently across formats', async () => {
      const input = fixtures.errorsAndWarnings;

      const [compactResult, jsonResult, tableResult] = await Promise.all([
        cli.runCliFailure({ args: ['--format', 'compact'], input }),
        cli.runCliFailure({ args: ['--format', 'json'], input }),
        cli.runCliFailure({ args: ['--format', 'table'], input })
      ]);

      // All should have same exit code
      expect(compactResult.exitCode).toBe(1);
      expect(jsonResult.exitCode).toBe(1);
      expect(tableResult.exitCode).toBe(1);

      // Each format should be different
      expect(compactResult.stdout).not.toBe(jsonResult.stdout);
      expect(compactResult.stdout).not.toBe(tableResult.stdout);
      expect(jsonResult.stdout).not.toBe(tableResult.stdout);

      // JSON should be parseable
      expect(() => JSON.parse(jsonResult.stdout)).not.toThrow();

      // All should contain key information
      const outputs = [compactResult.stdout, jsonResult.stdout, tableResult.stdout];
      outputs.forEach(output => {
        expect(output).toContain('AppDelegate.swift');
        expect(output).toContain('missing_required_method');
      });
    });

    test('should handle Unicode correctly across all formats', async () => {
      const input = fixtures.unicode;

      const [compactResult, jsonResult, tableResult] = await Promise.all([
        cli.runCliFailure({ args: ['--format', 'compact'], input }),
        cli.runCliFailure({ args: ['--format', 'json'], input }),
        cli.runCliFailure({ args: ['--format', 'table'], input })
      ]);

      // All should handle Unicode paths
      const unicodeFile = '用户管理';
      expect(compactResult.stdout).toContain(unicodeFile);
      expect(jsonResult.stdout).toContain(unicodeFile);
      expect(tableResult.stdout).toContain(unicodeFile);
    });
  });

  describe('Default Behavior Tests', () => {
    test('should default to compact format when no format specified', async () => {
      const input = fixtures.warningsOnly;

      const [defaultResult, explicitCompactResult] = await Promise.all([
        cli.runCliFailure({ input }),
        cli.runCliFailure({ args: ['--format', 'compact'], input })
      ]);

      expect(defaultResult.stdout).toBe(explicitCompactResult.stdout);
    });

    test('should handle large input efficiently by default', async () => {
      const result = await cli.runCliFailure({
        input: fixtures.large,
        timeout: TestUtils.PERFORMANCE_TIMEOUT
      });

      expect(result.stdout).toContain(`✖ ${largeFixtureIssueCount} problems`);
      expect(result.duration).toBeLessThan(3000); // Default format should be fast
    });
  });

  describe('Edge Cases', () => {
    test('should handle input with null character positions', async () => {
      const input = fixtures.warningsOnly;

      const result = await cli.runCliFailure({
        args: ['--format', 'compact'],
        input
      });

      // Should not crash on null character values
      expect(result.stdout).toContain('ViewController.swift');
      expect(result.exitCode).toBe(1);
    });

    test('should handle very long file paths', async () => {
      const longPathInput = JSON.stringify([{
        character: 10,
        file: '/Users/dev/' + 'very/'.repeat(50) + 'long/path/to/file.swift',
        line: 123,
        reason: 'Some issue with very long path',
        rule_id: 'test_rule',
        severity: 'Warning',
        type: 'Test'
      }]);

      const result = await cli.runCliFailure({
        args: ['--format', 'compact'],
        input: longPathInput
      });

      expect(result.stdout).toContain('long/path/to/file.swift');
      expect(result.exitCode).toBe(1);
    });

    test('should handle issues with very long reason messages', async () => {
      const longReasonInput = JSON.stringify([{
        character: 10,
        file: '/Users/dev/file.swift',
        line: 123,
        reason: 'This is a very long reason message that '.repeat(10) + 'should still be handled properly',
        rule_id: 'test_rule',
        severity: 'Warning',
        type: 'Test'
      }]);

      const result = await cli.runCliFailure({
        args: ['--format', 'table'],
        input: longReasonInput
      });

      expect(result.stdout).toContain('very long reason');
      expect(result.exitCode).toBe(1);
    });
  });
});
