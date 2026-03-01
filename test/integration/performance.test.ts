import { describe, test, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { CliTestHelper, TestUtils } from './test-helper';

describe('Performance and Large Input Tests', () => {
  let cli: CliTestHelper;
  let fixtures: Record<string, string>;
  let largeFixtureIssueCount: number;

  beforeAll(async () => {
    cli = new CliTestHelper();

    // Load test fixtures
    const fixturesDir = resolve(__dirname, '../fixtures');
    fixtures = {
      large: readFileSync(resolve(fixturesDir, 'large-output.json'), 'utf-8'),
      warningsOnly: readFileSync(resolve(fixturesDir, 'warnings-only.json'), 'utf-8')
    };
    largeFixtureIssueCount = JSON.parse(fixtures.large).length;
  });

  describe('Performance Benchmarks', () => {
    test('should process small input quickly', async () => {
      const durations = await cli.benchmarkCli(fixtures.warningsOnly, 5);

      // Small input should be processed very quickly
      const averageDuration = durations.reduce((a, b) => a + b) / durations.length;
      expect(averageDuration).toBeLessThan(1000); // Less than 1 second

      // Consistent performance
      const maxDuration = Math.max(...durations);
      const minDuration = Math.min(...durations);
      expect(maxDuration - minDuration).toBeLessThan(500); // Low variance
    });

    test('should process medium input efficiently', async () => {
      const durations = await cli.benchmarkCli(fixtures.large, 3);

      // Medium input should still be reasonably fast
      const averageDuration = durations.reduce((a, b) => a + b) / durations.length;
      expect(averageDuration).toBeLessThan(3000); // Less than 3 seconds

      // Performance should be stable
      durations.forEach(duration => {
        expect(duration).toBeLessThan(5000);
      });
    });

    test('should scale well with different output formats', async () => {
      const formats = TestUtils.FORMATS;
      const results: Record<string, number[]> = {};

      for (const format of formats) {
        const durations = await Promise.all([
          cli.runCliFailure({ args: ['--format', format], input: fixtures.large }),
          cli.runCliFailure({ args: ['--format', format], input: fixtures.large }),
          cli.runCliFailure({ args: ['--format', format], input: fixtures.large })
        ]);

        results[format] = durations.map(result => result.duration);
      }

      // All formats should complete within reasonable time
      Object.entries(results).forEach(([format, durations]) => {
        const avgDuration = durations.reduce((a, b) => a + b) / durations.length;
        expect(avgDuration).toBeLessThan(5000); // 5 seconds max average
      });

      // JSON format should be fastest (least processing)
      const avgJsonTime = results.json.reduce((a, b) => a + b) / results.json.length;
      const avgCompactTime = results.compact.reduce((a, b) => a + b) / results.compact.length;
      const avgTableTime = results.table.reduce((a, b) => a + b) / results.table.length;

      expect(avgJsonTime).toBeLessThanOrEqual(avgCompactTime * 1.5);
      expect(avgJsonTime).toBeLessThanOrEqual(avgTableTime * 1.5);
    });
  });

  describe('Large Input Stress Tests', () => {
    test('should handle 1000 issues efficiently', async () => {
      const largeIssues = Array.from({ length: 1000 }, (_, i) => ({
        character: i % 100,
        file: `/large/project/file${Math.floor(i / 10)}.swift`,
        line: (i % 200) + 1,
        reason: `Issue ${i}: ${'x'.repeat(50)}`, // Medium length reason
        rule_id: `rule_${i % 20}`,
        severity: i % 3 === 0 ? 'Error' : 'Warning',
        type: `Type ${i % 5}`
      }));

      const result = await cli.runCliFailure({
        args: ['--format', 'compact'],
        input: JSON.stringify(largeIssues),
        timeout: TestUtils.PERFORMANCE_TIMEOUT
      });

      expect(result.exitCode).toBe(TestUtils.EXIT_CODES.ISSUES_FOUND);
      expect(result.stdout).toContain('✖ 1000 problems');
      expect(result.duration).toBeLessThan(10000); // 10 seconds max
      expect(result.timedOut).toBe(false);
    });

    test('should handle 5000 issues without timing out', async () => {
      const massiveIssues = Array.from({ length: 5000 }, (_, i) => ({
        character: i % 100,
        file: `/massive/codebase/module${Math.floor(i / 100)}/file${i % 50}.swift`,
        line: (i % 500) + 1,
        reason: `Issue ${i}`,
        rule_id: `rule_${i % 50}`,
        severity: i % 4 === 0 ? 'Error' : 'Warning',
        type: `Type ${i % 10}`
      }));

      const result = await cli.runCliFailure({
        args: ['--format', 'json'], // JSON should be fastest for massive output
        input: JSON.stringify(massiveIssues),
        timeout: TestUtils.PERFORMANCE_TIMEOUT
      });

      expect(result.exitCode).toBe(TestUtils.EXIT_CODES.ISSUES_FOUND);
      expect(result.timedOut).toBe(false);
      expect(result.duration).toBeLessThan(20000); // 20 seconds max

      // Verify output is complete
      const parsedOutput = JSON.parse(result.stdout);
      expect(parsedOutput).toHaveLength(5000);
    });

    test('should handle very long file paths efficiently', async () => {
      const longPathIssues = Array.from({ length: 100 }, (_, i) => ({
        character: 10,
        file: `/very/deep/${'nested/'.repeat(50)}path/to/file${i}.swift`,
        line: i + 1,
        reason: `Issue in deeply nested file ${i}`,
        rule_id: 'nested_file_rule',
        severity: 'Warning',
        type: 'Deep Nesting'
      }));

      const result = await cli.runCliFailure({
        args: ['--format', 'compact'],
        input: JSON.stringify(longPathIssues),
        timeout: TestUtils.PERFORMANCE_TIMEOUT
      });

      expect(result.exitCode).toBe(TestUtils.EXIT_CODES.ISSUES_FOUND);
      expect(result.duration).toBeLessThan(5000);
      expect(result.stdout).toContain('nested/');
    });

    test('should handle very long reason messages', async () => {
      const longReasonIssues = Array.from({ length: 200 }, (_, i) => ({
        character: 10,
        file: `/project/file${i}.swift`,
        line: i + 1,
        reason: `This is a very long reason message that goes on and on ${'and on '.repeat(100)} issue ${i}`,
        rule_id: 'long_message_rule',
        severity: i % 2 === 0 ? 'Warning' : 'Error',
        type: 'Long Message'
      }));

      const result = await cli.runCliFailure({
        args: ['--format', 'table'],
        input: JSON.stringify(longReasonIssues),
        timeout: TestUtils.PERFORMANCE_TIMEOUT
      });

      expect(result.exitCode).toBe(TestUtils.EXIT_CODES.ISSUES_FOUND);
      expect(result.duration).toBeLessThan(8000);
      expect(result.stdout).toContain('File');
    });
  });

  describe('Memory and Resource Tests', () => {
    test('should handle rapid successive calls', async () => {
      const rapidCalls = Array.from({ length: 10 }, () =>
        cli.runCliFailure({
          args: ['--format', 'json'],
          input: fixtures.large,
          timeout: 5000
        })
      );

      const results = await Promise.all(rapidCalls);

      // All calls should succeed
      results.forEach(result => {
        expect(result.exitCode).toBe(TestUtils.EXIT_CODES.ISSUES_FOUND);
        expect(result.timedOut).toBe(false);
      });

      // Performance shouldn't degrade significantly
      const durations = results.map(r => r.duration);
      const avgDuration = durations.reduce((a, b) => a + b) / durations.length;
      const maxDuration = Math.max(...durations);

      expect(maxDuration).toBeLessThan(avgDuration * 2); // No duration should be more than 2x average
    });

    test('should handle concurrent execution without resource conflicts', async () => {
      const concurrentCalls = Array.from({ length: 5 }, (_, i) =>
        cli.runCliFailure({
          args: ['--format', 'compact'],
          input: fixtures.large,
          timeout: 10000
        })
      );

      const results = await Promise.all(concurrentCalls);

      // All should complete successfully
      results.forEach(result => {
        expect(result.exitCode).toBe(TestUtils.EXIT_CODES.ISSUES_FOUND);
        expect(result.stdout).toContain(`✖ ${largeFixtureIssueCount} problems`);
        expect(result.timedOut).toBe(false);
      });
    });

    test('should handle mixed large and small inputs concurrently', async () => {
      const mixedCalls = [
        cli.runCliFailure({ args: ['--format', 'json'], input: fixtures.large }),
        cli.runCliFailure({ args: ['--format', 'compact'], input: fixtures.warningsOnly }),
        cli.runCliFailure({ args: ['--format', 'table'], input: fixtures.large }),
        cli.runCliFailure({ args: ['--format', 'json'], input: fixtures.warningsOnly })
      ];

      const results = await Promise.all(mixedCalls);

      // Small inputs should complete quickly even when run with large ones
      expect(results[1].duration).toBeLessThan(2000); // Small input
      expect(results[3].duration).toBeLessThan(2000); // Small input

      // All should complete successfully
      results.forEach(result => {
        expect(result.exitCode).toBe(TestUtils.EXIT_CODES.ISSUES_FOUND);
        expect(result.timedOut).toBe(false);
      });
    });
  });

  describe('Edge Case Performance', () => {
    test('should handle many files with few issues efficiently', async () => {
      const manyFilesIssues = Array.from({ length: 1000 }, (_, i) => ({
        character: 1,
        file: `/project/src/module${Math.floor(i / 2)}/file${i}.swift`, // ~500 unique files
        line: 1,
        reason: 'Minor issue',
        rule_id: 'minor_rule',
        severity: 'Warning',
        type: 'Minor'
      }));

      const result = await cli.runCliFailure({
        args: ['--format', 'compact'],
        input: JSON.stringify(manyFilesIssues),
        timeout: TestUtils.PERFORMANCE_TIMEOUT
      });

      expect(result.exitCode).toBe(TestUtils.EXIT_CODES.ISSUES_FOUND);
      expect(result.duration).toBeLessThan(10000);

      // Should group by files efficiently
      const fileCount = (result.stdout.match(/\.swift/g) || []).length;
      expect(fileCount).toBeGreaterThan(400); // Should show many unique files
    });

    test('should handle few files with many issues efficiently', async () => {
      const fewFilesIssues = Array.from({ length: 1000 }, (_, i) => ({
        character: i % 100 + 1,
        file: `/project/problematic_file${i % 5}.swift`, // Only 5 files
        line: i + 1,
        reason: `Issue ${i} in this problematic file`,
        rule_id: `rule_${i % 10}`,
        severity: i % 3 === 0 ? 'Error' : 'Warning',
        type: 'Problematic'
      }));

      const result = await cli.runCliFailure({
        args: ['--format', 'compact'],
        input: JSON.stringify(fewFilesIssues),
        timeout: TestUtils.PERFORMANCE_TIMEOUT
      });

      expect(result.exitCode).toBe(TestUtils.EXIT_CODES.ISSUES_FOUND);
      expect(result.duration).toBeLessThan(8000);

      // Should efficiently group many issues per file
      expect(result.stdout).toContain('problematic_file');
      expect(result.stdout).toContain('✖ 1000 problems');
    });

    test('should handle Unicode-heavy content efficiently', async () => {
      const unicodeIssues = Array.from({ length: 500 }, (_, i) => ({
        character: 10,
        file: `/项目/源代码/文件${i}.swift`,
        line: i + 1,
        reason: `问题 ${i}: 这是一个包含很多Unicode字符的错误信息 🚫❌⚠️`,
        rule_id: 'unicode_rule',
        severity: i % 2 === 0 ? 'Warning' : 'Error',
        type: 'Unicode Test'
      }));

      const result = await cli.runCliFailure({
        args: ['--format', 'compact'],
        input: JSON.stringify(unicodeIssues),
        timeout: TestUtils.PERFORMANCE_TIMEOUT
      });

      expect(result.exitCode).toBe(TestUtils.EXIT_CODES.ISSUES_FOUND);
      expect(result.duration).toBeLessThan(8000);
      expect(result.stdout).toContain('项目');
      expect(result.stdout).toContain('问题');
    });
  });

  describe('Performance Regression Tests', () => {
    test('should maintain consistent performance across runs', async () => {
      const runs = 5;
      const durations: number[] = [];

      for (let i = 0; i < runs; i++) {
        const result = await cli.runCliFailure({
          args: ['--format', 'compact'],
          input: fixtures.large
        });
        durations.push(result.duration);
      }

      // Calculate performance metrics
      const avgDuration = durations.reduce((a, b) => a + b) / durations.length;
      const maxDuration = Math.max(...durations);
      const minDuration = Math.min(...durations);
      const variance = maxDuration - minDuration;

      // Performance should be consistent
      expect(variance).toBeLessThan(avgDuration * 1.2); // Allow small runtime jitter
      expect(maxDuration).toBeLessThan(avgDuration * 2); // No run should be more than 2x average
    });

    test('should not degrade with different configurations', async () => {
      const configs = [
        { args: ['--format', 'compact'], name: 'compact' },
        { args: ['--format', 'compact', '--no-color'], name: 'compact-no-color' },
        { args: ['--format', 'compact', '--quiet'], name: 'compact-quiet' },
        { args: ['--format', 'json'], name: 'json' },
        { args: ['--format', 'table'], name: 'table' }
      ];

      const results: Record<string, number> = {};

      for (const config of configs) {
        const result = await cli.runCliFailure({
          args: config.args,
          input: fixtures.large,
          timeout: TestUtils.PERFORMANCE_TIMEOUT
        });
        results[config.name] = result.duration;
      }

      // All configurations should complete within reasonable time
      Object.entries(results).forEach(([name, duration]) => {
        expect(duration).toBeLessThan(8000); // 8 seconds max for any config
      });

      // JSON should generally be fastest, table slowest
      expect(results.json).toBeLessThanOrEqual(results.table * 2);
    });

    test('should handle graceful performance degradation under load', async () => {
      // Create increasingly large inputs
      const sizes = [100, 500, 1000, 2000];
      const durations: number[] = [];

      for (const size of sizes) {
        const issues = Array.from({ length: size }, (_, i) => ({
          character: 10,
          file: `/test/file${i % 50}.swift`,
          line: i + 1,
          reason: `Issue ${i}`,
          rule_id: 'test_rule',
          severity: 'Warning',
          type: 'Test'
        }));

        const result = await cli.runCliFailure({
          args: ['--format', 'json'],
          input: JSON.stringify(issues),
          timeout: TestUtils.PERFORMANCE_TIMEOUT
        });

        durations.push(result.duration);
        expect(result.exitCode).toBe(TestUtils.EXIT_CODES.ISSUES_FOUND);
      }

      // Performance should scale reasonably (not exponentially)
      for (let i = 1; i < durations.length; i++) {
        const prevSize = sizes[i - 1];
        const currentSize = sizes[i];
        const sizeRatio = currentSize / prevSize;
        const durationRatio = durations[i] / durations[i - 1];

        // Duration growth should not be worse than O(n log n)
        expect(durationRatio).toBeLessThan(sizeRatio * Math.log2(sizeRatio) * 2);
      }
    });
  });
});
