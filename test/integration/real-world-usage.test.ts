import { describe, test, expect, beforeAll, afterEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { CliTestHelper, TestUtils } from './test-helper';

describe('Real-World Usage Pattern Tests', () => {
  let cli: CliTestHelper;
  let fixtures: Record<string, string>;
  let largeFixtureIssueCount: number;
  let warningsOnlyIssueCount: number;
  let unicodeIssueCount: number;
  const tempConfigFiles: string[] = [];

  beforeAll(async () => {
    cli = new CliTestHelper();

    // Load test fixtures
    const fixturesDir = resolve(__dirname, '../fixtures');
    fixtures = {
      warningsOnly: readFileSync(resolve(fixturesDir, 'warnings-only.json'), 'utf-8'),
      errorsAndWarnings: readFileSync(resolve(fixturesDir, 'errors-and-warnings.json'), 'utf-8'),
      empty: readFileSync(resolve(fixturesDir, 'empty-output.json'), 'utf-8'),
      large: readFileSync(resolve(fixturesDir, 'large-output.json'), 'utf-8'),
      unicode: readFileSync(resolve(fixturesDir, 'unicode-paths.json'), 'utf-8')
    };
    largeFixtureIssueCount = JSON.parse(fixtures.large).length;
    warningsOnlyIssueCount = JSON.parse(fixtures.warningsOnly).length;
    unicodeIssueCount = JSON.parse(fixtures.unicode).length;
  });

  afterEach(async () => {
    // Clean up temporary config files
    for (const configPath of tempConfigFiles) {
      await cli.cleanup(configPath);
    }
    tempConfigFiles.length = 0;
  });

  describe('CI/CD Integration Scenarios', () => {
    test('should work in CI with quiet mode and JSON output', async () => {
      const result = await cli.runCliFailure({
        args: ['--quiet', '--format', 'json', '--no-color'],
        input: fixtures.errorsAndWarnings
      });

      // Parse JSON output for automated processing
      const issues = JSON.parse(result.stdout);
      expect(Array.isArray(issues)).toBe(true);
      expect(issues.length).toBe(6);

      // No ANSI colors for CI systems
      expect(result.stdout).not.toMatch(/\x1b\[/);

      // Exit code indicates issues found
      expect(result.exitCode).toBe(TestUtils.EXIT_CODES.ISSUES_FOUND);

      // Should have minimal stderr in quiet mode
      expect(result.stderr).toBe('');
    });

    test('should handle zero issues in CI (success case)', async () => {
      const result = await cli.runCliSuccess({
        args: ['--quiet', '--format', 'json', '--no-color'],
        input: fixtures.empty
      });

      const issues = JSON.parse(result.stdout || '[]');
      expect(issues).toHaveLength(0);
      expect(result.exitCode).toBe(TestUtils.EXIT_CODES.SUCCESS);
    });

    test('should provide machine-readable output for CI parsing', async () => {
      const result = await cli.runCliFailure({
        args: ['--format', 'json'],
        input: fixtures.errorsAndWarnings
      });

      const issues = JSON.parse(result.stdout);

      // Verify structure is suitable for CI tools
      issues.forEach((issue: any) => {
        expect(issue).toHaveProperty('file');
        expect(issue).toHaveProperty('line');
        expect(issue).toHaveProperty('severity');
        expect(issue).toHaveProperty('rule_id');
        expect(issue).toHaveProperty('reason');
        expect(['Warning', 'Error']).toContain(issue.severity);
      });
    });

    test('should handle large codebase efficiently for CI', async () => {
      const result = await cli.runCliFailure({
        args: ['--quiet', '--format', 'json'],
        input: fixtures.large,
        timeout: TestUtils.PERFORMANCE_TIMEOUT
      });

      // Should complete within reasonable time for CI
      expect(result.duration).toBeLessThan(5000);
      expect(result.exitCode).toBe(TestUtils.EXIT_CODES.ISSUES_FOUND);

      const issues = JSON.parse(result.stdout);
      expect(issues.length).toBe(largeFixtureIssueCount);
    });

    test('should support CI configuration via config file', async () => {
      const configPath = await cli.createTempConfig({
        format: 'json',
        quiet: true,
        noColor: true
      });
      tempConfigFiles.push(configPath);

      const result = await cli.runCliFailure({
        args: ['--config', configPath],
        input: fixtures.warningsOnly
      });

      const issues = JSON.parse(result.stdout);
      expect(issues.length).toBe(4);
      expect(result.stdout).not.toMatch(/\x1b\[/);
    });
  });

  describe('Developer Workflow Scenarios', () => {
    test('should provide readable output for interactive development', async () => {
      const result = await cli.runCliFailure({
        args: ['--format', 'compact'],
        input: fixtures.errorsAndWarnings
      });

      // Should include colored output and file organization
      expect(result.stdout).toContain('AppDelegate.swift');
      expect(result.stdout).toContain('ViewController.swift');
      expect(result.stdout).toContain('✖ 6 problems');

      // Should group by files for readability
      const lines = result.stdout.split('\n');
      const fileHeaders = lines.filter(line => line.includes('.swift') && !line.includes('warning') && !line.includes('error'));
      expect(fileHeaders.length).toBeGreaterThan(0);
    });

    test('should work well for local development with warnings only', async () => {
      const result = await cli.runCliFailure({
        args: [],
        input: fixtures.warningsOnly
      });

      // Should be informative but not overwhelming
      expect(result.stdout).toContain('warning');
      expect(result.stdout).not.toContain('error');
      expect(result.stdout).toContain(`✖ ${warningsOnlyIssueCount} problems`);

      // Should show line:column format
      expect(cli.stripColors(result.stdout)).toMatch(/\d+:\d+/);
    });

    test('should handle mixed file types in project structure', async () => {
      const projectStructureInput = JSON.stringify([
        {
          character: 10,
          file: '/Users/dev/MyProject/Sources/Controllers/HomeViewController.swift',
          line: 25,
          reason: 'Line too long',
          rule_id: 'line_length',
          severity: 'Warning',
          type: 'Line Length'
        },
        {
          character: 15,
          file: '/Users/dev/MyProject/Sources/Models/User.swift',
          line: 45,
          reason: 'Variable unused',
          rule_id: 'unused_variable',
          severity: 'Warning',
          type: 'Unused Variable'
        },
        {
          character: 20,
          file: '/Users/dev/MyProject/Sources/Utils/NetworkManager.swift',
          line: 67,
          reason: 'Force unwrap',
          rule_id: 'force_unwrap',
          severity: 'Error',
          type: 'Force Unwrap'
        }
      ]);

      const result = await cli.runCliFailure({
        args: ['--format', 'compact'],
        input: projectStructureInput
      });

      // Should organize by file paths
      expect(result.stdout).toContain('Controllers/HomeViewController.swift');
      expect(result.stdout).toContain('Models/User.swift');
      expect(result.stdout).toContain('Utils/NetworkManager.swift');
    });

    test('should provide detailed table view for code review', async () => {
      const result = await cli.runCliFailure({
        args: ['--format', 'table'],
        input: fixtures.errorsAndWarnings
      });

      // Should have clear table structure
      expect(result.stdout).toContain('File');
      expect(result.stdout).toContain('Line');
      expect(result.stdout).toContain('Col');
      expect(result.stdout).toContain('Severity');
      expect(result.stdout).toContain('Rule');
      expect(result.stdout).toContain('Message');

      // Should be easy to scan
      const tableLines = result.stdout.split('\n').filter(line => line.trim());
      expect(tableLines.length).toBeGreaterThan(6); // Header + data rows
    });
  });

  describe('Team Collaboration Scenarios', () => {
    test('should work consistently across different environments', async () => {
      // Simulate different environment configurations
      const environments = [
        { args: ['--format', 'compact'], name: 'local_dev' },
        { args: ['--format', 'json', '--quiet'], name: 'ci_build' },
        { args: ['--format', 'table', '--no-color'], name: 'server_terminal' }
      ];

      const results = await Promise.all(
        environments.map(env =>
          cli.runCliFailure({
            args: env.args,
            input: fixtures.warningsOnly
          })
        )
      );

      // All should detect the same issues
      results.forEach(result => {
        expect(result.exitCode).toBe(TestUtils.EXIT_CODES.ISSUES_FOUND);
      });

      // JSON output should be parseable
      const jsonResult = results[1];
      const issues = JSON.parse(jsonResult.stdout);
      expect(issues.length).toBe(4);
    });

    test('should handle shared config file workflow', async () => {
      const sharedConfigPath = await cli.createTempConfig({
        format: 'compact',
        quiet: false,
        noColor: false
      });
      tempConfigFiles.push(sharedConfigPath);

      const result = await cli.runCliFailure({
        args: ['--config', sharedConfigPath],
        input: fixtures.errorsAndWarnings
      });

      expect(result.stdout).toContain('✖ 6 problems');
      expect(result.exitCode).toBe(TestUtils.EXIT_CODES.ISSUES_FOUND);
    });

    test('should handle Unicode file paths for international teams', async () => {
      const result = await cli.runCliFailure({
        args: ['--format', 'compact'],
        input: fixtures.unicode
      });

      // Should correctly display international characters
      expect(result.stdout).toContain('用户管理');
      expect(result.stdout).toContain('Configuración');
      expect(result.stdout).toContain('Pokémon');
      expect(result.stdout).toContain('日本語');
      expect(result.stdout).toContain(`✖ ${unicodeIssueCount} problems`);
    });
  });

  describe('Pre-commit Hook Integration', () => {
    test('should work as pre-commit hook with proper exit codes', async () => {
      // Simulate pre-commit hook usage
      const preCommitResult = await cli.runCliFailure({
        args: ['--quiet', '--format', 'compact'],
        input: fixtures.errorsAndWarnings
      });

      expect(preCommitResult.exitCode).toBe(TestUtils.EXIT_CODES.ISSUES_FOUND);
      expect(preCommitResult.stdout).toContain('✖ 6 problems');
    });

    test('should allow commits when no issues found', async () => {
      const cleanResult = await cli.runCliSuccess({
        args: ['--quiet'],
        input: fixtures.empty
      });

      expect(cleanResult.exitCode).toBe(TestUtils.EXIT_CODES.SUCCESS);
      expect(cleanResult.stdout).toBe('');
    });

    test('should handle pre-commit with specific format requirements', async () => {
      const configPath = await cli.createTempConfig({
        format: 'json',
        quiet: true
      });
      tempConfigFiles.push(configPath);

      const result = await cli.runCliFailure({
        args: ['--config', configPath],
        input: fixtures.warningsOnly
      });

      // Should produce JSON for further processing by other tools
      const issues = JSON.parse(result.stdout);
      expect(issues.length).toBe(4);
    });
  });

  describe('IDE Integration Scenarios', () => {
    test('should provide parseable output for IDE problem matchers', async () => {
      const result = await cli.runCliFailure({
        args: ['--format', 'compact'],
        input: fixtures.errorsAndWarnings
      });

      // Should contain file:line:column patterns for IDE parsing
      const compactOutput = cli.stripColors(result.stdout);
      expect(compactOutput).toMatch(/[^\s]+\.swift/);
      expect(compactOutput).toMatch(/\d+:\d+/);
      expect(compactOutput).toMatch(/(warning|error)/);
    });

    test('should work well with IDE terminal integration', async () => {
      const result = await cli.runCliFailure({
        args: ['--format', 'table'],
        input: fixtures.large
      });

      // Should be readable in IDE terminal windows
      expect(result.stdout).toContain('File');
      expect(result.stdout).toContain('Line');
      expect(result.duration).toBeLessThan(3000); // Fast enough for IDE responsiveness
    });
  });

  describe('Script Integration Scenarios', () => {
    test('should work in automated scripts with JSON output', async () => {
      const result = await cli.runCliFailure({
        args: ['--format', 'json', '--no-color'],
        input: fixtures.errorsAndWarnings
      });

      const issues = JSON.parse(result.stdout);

      // Easy to process programmatically
      const errorCount = issues.filter((issue: any) => issue.severity === 'Error').length;
      const warningCount = issues.filter((issue: any) => issue.severity === 'Warning').length;

      expect(errorCount).toBe(2);
      expect(warningCount).toBe(4);
    });

    test('should support batch processing of multiple runs', async () => {
      const inputs = [fixtures.warningsOnly, fixtures.errorsAndWarnings];

      const results = await Promise.all(
        inputs.map(input =>
          cli.runCli({
            args: ['--format', 'json', '--quiet'],
            input
          })
        )
      );

      // Should handle multiple runs consistently
      const issuesCounts = results.map(result => {
        if (result.exitCode === 0) return 0;
        return JSON.parse(result.stdout).length;
      });

      expect(issuesCounts).toEqual([4, 6]);
    });

    test('should handle script error recovery', async () => {
      // Test what happens when script encounters bad input
      const mixedInputs = [
        fixtures.warningsOnly, // good
        '{"invalid": "json"', // bad
        fixtures.empty // good
      ];

      const results = await Promise.allSettled(
        mixedInputs.map(input =>
          cli.runCli({
            args: ['--format', 'json', '--quiet'],
            input
          })
        )
      );

      // Should handle each independently
      expect(results[0].status).toBe('fulfilled');
      expect(results[1].status).toBe('fulfilled'); // Error handled gracefully
      expect(results[2].status).toBe('fulfilled');
    });
  });

  describe('Performance Under Load', () => {
    test('should handle concurrent execution', async () => {
      const concurrentRuns = Array.from({ length: 5 }, () =>
        cli.runCliFailure({
          args: ['--format', 'compact'],
          input: fixtures.large
        })
      );

      const results = await Promise.all(concurrentRuns);

      // All should complete successfully
      results.forEach(result => {
        expect(result.exitCode).toBe(TestUtils.EXIT_CODES.ISSUES_FOUND);
        expect(result.stdout).toContain(`✖ ${largeFixtureIssueCount} problems`);
      });
    });

    test('should maintain performance under different configurations', async () => {
      const configs = [
        ['--format', 'compact'],
        ['--format', 'json'],
        ['--format', 'table'],
        ['--format', 'compact', '--no-color'],
        ['--format', 'json', '--quiet']
      ];

      const results = await Promise.all(
        configs.map(config =>
          cli.runCliFailure({
            args: config,
            input: fixtures.large,
            timeout: TestUtils.PERFORMANCE_TIMEOUT
          })
        )
      );

      // All should complete within reasonable time
      results.forEach(result => {
        expect(result.duration).toBeLessThan(5000);
        expect(result.exitCode).toBe(TestUtils.EXIT_CODES.ISSUES_FOUND);
      });
    });
  });
});
