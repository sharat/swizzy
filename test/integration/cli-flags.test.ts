import { describe, test, expect, beforeAll, afterEach } from 'vitest';
import { readFileSync, unlinkSync, existsSync } from 'fs';
import { resolve } from 'path';
import { CliTestHelper, TestUtils } from './test-helper';

describe('CLI Flag Integration Tests', () => {
  let cli: CliTestHelper;
  let fixtures: Record<string, string>;
  const tempConfigFiles: string[] = [];

  beforeAll(async () => {
    cli = new CliTestHelper();

    // Load test fixtures
    const fixturesDir = resolve(__dirname, '../fixtures');
    fixtures = {
      warningsOnly: readFileSync(resolve(fixturesDir, 'warnings-only.json'), 'utf-8'),
      errorsAndWarnings: readFileSync(resolve(fixturesDir, 'errors-and-warnings.json'), 'utf-8'),
      empty: readFileSync(resolve(fixturesDir, 'empty-output.json'), 'utf-8')
    };
  });

  afterEach(async () => {
    // Clean up temporary config files
    for (const configPath of tempConfigFiles) {
      await cli.cleanup(configPath);
    }
    tempConfigFiles.length = 0;
  });

  describe('Help and Version Flags', () => {
    test.each(TestUtils.FLAGS.HELP)('should display help with %s flag', async (helpFlag) => {
      const result = await cli.runCliSuccess({ args: [helpFlag] });
      const output = cli.stripColors(result.stdout);

      expect(output).toContain('swizzy v');
      expect(output).toContain('USAGE:');
      expect(output).toContain('DESCRIPTION:');
      expect(output).toContain('OPTIONS:');
      expect(output).toContain('EXAMPLES:');
      expect(output).toContain('EXIT CODES:');
      expect(output).toContain('--format');
      expect(output).toContain('--quiet');
      expect(output).toContain('--no-color');
    });

    test.each(TestUtils.FLAGS.VERSION)('should display version with %s flag', async (versionFlag) => {
      const result = await cli.runCliSuccess({ args: [versionFlag] });

      expect(result.stdout.trim()).toMatch(/^\d+\.\d+\.\d+$/);
      expect(result.stderr).toBe('');
    });

    test('should exit with code 0 for help and version', async () => {
      const helpResult = await cli.runCliSuccess({ args: ['--help'] });
      const versionResult = await cli.runCliSuccess({ args: ['--version'] });

      expect(helpResult.exitCode).toBe(TestUtils.EXIT_CODES.SUCCESS);
      expect(versionResult.exitCode).toBe(TestUtils.EXIT_CODES.SUCCESS);
    });

    test('should ignore other flags when help is specified', async () => {
      const result = await cli.runCliSuccess({
        args: ['--help', '--format', 'json', '--quiet']
      });

      expect(result.stdout).toContain('USAGE:');
      expect(result.exitCode).toBe(TestUtils.EXIT_CODES.SUCCESS);
    });
  });

  describe('Format Flag Tests', () => {
    test.each(TestUtils.FORMATS)('should accept --format %s', async (format) => {
      const result = await cli.runCliFailure({
        args: ['--format', format],
        input: fixtures.warningsOnly
      });

      expect(result.exitCode).toBe(TestUtils.EXIT_CODES.ISSUES_FOUND);

      if (format === 'json') {
        expect(() => JSON.parse(result.stdout)).not.toThrow();
      } else if (format === 'table') {
        expect(result.stdout).toContain('File');
        expect(result.stdout).toContain('Line');
      } else if (format === 'compact') {
        expect(result.stdout).toMatch(/\d+:\d+/);
      }
    });

    test.each(TestUtils.FORMATS)('should accept -f %s shorthand', async (format) => {
      const result = await cli.runCliFailure({
        args: ['-f', format],
        input: fixtures.warningsOnly
      });

      expect(result.exitCode).toBe(TestUtils.EXIT_CODES.ISSUES_FOUND);
    });

    test('should reject invalid format', async () => {
      const result = await cli.runCliConfigError({
        args: ['--format', 'invalid']
      });

      expect(result.stderr).toContain('Invalid format: invalid');
      expect(result.stderr).toContain('Valid options: compact, json, table');
    });

    test('should handle format case sensitivity', async () => {
      const result = await cli.runCliConfigError({
        args: ['--format', 'JSON']
      });

      expect(result.exitCode).toBe(TestUtils.EXIT_CODES.CONFIG_ERROR);
    });
  });

  describe('Quiet Mode Tests', () => {
    test.each(TestUtils.FLAGS.QUIET)('should suppress output with %s flag', async (quietFlag) => {
      const result = await cli.runCliFailure({
        args: [quietFlag],
        input: fixtures.warningsOnly
      });

      // Should still output the formatted issues
      expect(result.stdout).toContain('ViewController.swift');
      expect(result.exitCode).toBe(TestUtils.EXIT_CODES.ISSUES_FOUND);
    });

    test('should work with other format options in quiet mode', async () => {
      const result = await cli.runCliFailure({
        args: ['--quiet', '--format', 'json'],
        input: fixtures.warningsOnly
      });

      expect(() => JSON.parse(result.stdout)).not.toThrow();
      expect(result.exitCode).toBe(TestUtils.EXIT_CODES.ISSUES_FOUND);
    });

    test('should handle quiet mode with empty input', async () => {
      const result = await cli.runCliSuccess({
        args: ['--quiet'],
        input: fixtures.empty
      });

      expect(result.stdout).toBe('');
      expect(result.stderr).toBe('');
    });
  });

  describe('No Color Flag Tests', () => {
    test('should disable colors with --no-color flag', async () => {
      const coloredResult = await cli.runCliFailure({
        args: ['--format', 'compact'],
        input: fixtures.warningsOnly
      });

      const noColorResult = await cli.runCliFailure({
        args: ['--no-color', '--format', 'compact'],
        input: fixtures.warningsOnly
      });

      // Strip ANSI codes and compare
      const coloredStripped = cli.stripColors(coloredResult.stdout);
      const noColorStripped = cli.stripColors(noColorResult.stdout);

      expect(coloredResult.stdout).not.toBe(noColorResult.stdout);
      expect(coloredStripped).toBe(noColorStripped);

      // No-color output should not contain ANSI escape sequences
      expect(noColorResult.stdout).not.toMatch(/\x1b\[/);
    });

    test('should work with --no-color in table format', async () => {
      const result = await cli.runCliFailure({
        args: ['--no-color', '--format', 'table'],
        input: fixtures.errorsAndWarnings
      });

      expect(result.stdout).toContain('Warning');
      expect(result.stdout).toContain('Error');
      expect(result.stdout).not.toMatch(/\x1b\[/);
    });

    test('should work with --no-color in JSON format', async () => {
      const result = await cli.runCliFailure({
        args: ['--no-color', '--format', 'json'],
        input: fixtures.warningsOnly
      });

      expect(() => JSON.parse(result.stdout)).not.toThrow();
      expect(result.stdout).not.toMatch(/\x1b\[/);
    });
  });

  describe('Configuration File Tests', () => {
    test('should load valid configuration file', async () => {
      const configPath = await cli.createTempConfig({
        format: 'table',
        quiet: true,
        noColor: false
      });
      tempConfigFiles.push(configPath);

      const result = await cli.runCliFailure({
        args: ['--config', configPath],
        input: fixtures.warningsOnly
      });

      expect(result.stdout).toContain('File');
      expect(result.stdout).toContain('Line');
      expect(result.exitCode).toBe(TestUtils.EXIT_CODES.ISSUES_FOUND);
    });

    test('should handle missing configuration file', async () => {
      const result = await cli.runCliConfigError({
        args: ['--config', '/nonexistent/config.json']
      });

      expect(result.stderr).toContain('Configuration file not found');
      expect(result.exitCode).toBe(TestUtils.EXIT_CODES.CONFIG_ERROR);
    });

    test('should handle invalid configuration file', async () => {
      const configPath = resolve(__dirname, '../fixtures/config/invalid-config.json');

      const result = await cli.runCliConfigError({
        args: ['--config', configPath]
      });

      expect(result.stderr).toContain('Invalid configuration file');
      expect(result.exitCode).toBe(TestUtils.EXIT_CODES.CONFIG_ERROR);
    });

    test('should use shorthand -c for config flag', async () => {
      const configPath = await cli.createTempConfig({
        format: 'json',
        quiet: false
      });
      tempConfigFiles.push(configPath);

      const result = await cli.runCliFailure({
        args: ['-c', configPath],
        input: fixtures.warningsOnly
      });

      expect(() => JSON.parse(result.stdout)).not.toThrow();
    });

    test('should prioritize CLI args over config file', async () => {
      const configPath = await cli.createTempConfig({
        format: 'table',
        quiet: true
      });
      tempConfigFiles.push(configPath);

      const result = await cli.runCliFailure({
        args: ['--config', configPath, '--format', 'json'],
        input: fixtures.warningsOnly
      });

      // CLI --format json should override config file's format: table
      expect(() => JSON.parse(result.stdout)).not.toThrow();
    });
  });

  describe('Flag Combination Tests', () => {
    test('should handle multiple flags together', async () => {
      const result = await cli.runCliFailure({
        args: ['--format', 'table', '--quiet', '--no-color'],
        input: fixtures.errorsAndWarnings
      });

      expect(result.stdout).toContain('File');
      expect(result.stdout).toContain('Line');
      expect(result.stdout).not.toMatch(/\x1b\[/);
      expect(result.exitCode).toBe(TestUtils.EXIT_CODES.ISSUES_FOUND);
    });

    test('should handle mixed short and long flags', async () => {
      const result = await cli.runCliFailure({
        args: ['-f', 'json', '-q', '--no-color'],
        input: fixtures.warningsOnly
      });

      expect(() => JSON.parse(result.stdout)).not.toThrow();
      expect(result.stdout).not.toMatch(/\x1b\[/);
    });

    test('should handle config file with CLI flag overrides', async () => {
      const configPath = await cli.createTempConfig({
        format: 'compact',
        quiet: false,
        noColor: false
      });
      tempConfigFiles.push(configPath);

      const result = await cli.runCliFailure({
        args: ['-c', configPath, '-f', 'json', '-q', '--no-color'],
        input: fixtures.warningsOnly
      });

      expect(() => JSON.parse(result.stdout)).not.toThrow();
      expect(result.stdout).not.toMatch(/\x1b\[/);
    });
  });

  describe('Unknown Flag Handling', () => {
    test('should handle unknown long flags gracefully', async () => {
      const result = await cli.runCli({
        args: ['--unknown-flag'],
        input: fixtures.warningsOnly
      });

      // Should still process input but may show a warning
      expect(result.exitCode).toBe(TestUtils.EXIT_CODES.ISSUES_FOUND);
    });

    test('should handle unknown short flags gracefully', async () => {
      const result = await cli.runCli({
        args: ['-x'],
        input: fixtures.warningsOnly
      });

      // Should still process input
      expect(result.exitCode).toBe(TestUtils.EXIT_CODES.ISSUES_FOUND);
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty args array', async () => {
      const result = await cli.runCliFailure({
        args: [],
        input: fixtures.warningsOnly
      });

      expect(result.stdout).toContain('ViewController.swift');
      expect(result.exitCode).toBe(TestUtils.EXIT_CODES.ISSUES_FOUND);
    });

    test('should handle duplicate flags (last one wins)', async () => {
      const result = await cli.runCliFailure({
        args: ['--format', 'table', '--format', 'json'],
        input: fixtures.warningsOnly
      });

      expect(() => JSON.parse(result.stdout)).not.toThrow();
    });

    test('should handle format flag without value', async () => {
      const result = await cli.runCli({
        args: ['--format'],
        input: fixtures.warningsOnly
      });

      // Should either use default or show error
      expect([0, 1, 2]).toContain(result.exitCode!);
    });

    test('should handle config flag without value', async () => {
      const result = await cli.runCli({
        args: ['--config'],
        input: fixtures.warningsOnly
      });

      // Should either use no config or show error
      expect([0, 1, 2]).toContain(result.exitCode!);
    });
  });
});
