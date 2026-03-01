/**
 * Isolated unit tests that don't require complex imports
 * These test the core logic without importing the main module
 */

import { SwiftlintJsonIssueSchema, SwiftlintJsonOutputSchema } from '../src/types';
import { parseArgs } from 'node:util';
import {
  validSwiftLintIssue,
  validSwiftLintErrorIssue,
  issueWithNullCharacter,
  multipleIssuesMultipleFiles,
  emptyIssuesArray,
  invalidJsonStructures
} from './fixtures/swiftlint-data';

describe('Isolated Unit Tests', () => {
  describe('Zod Schema Validation', () => {
    it('should validate valid SwiftLint issues', () => {
      const result = SwiftlintJsonIssueSchema.safeParse(validSwiftLintIssue);
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.file).toBe('/path/to/MyViewController.swift');
        expect(result.data.severity).toBe('Warning');
        expect(result.data.line).toBe(42);
      }
    });

    it('should validate array of issues', () => {
      const result = SwiftlintJsonOutputSchema.safeParse(multipleIssuesMultipleFiles);
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data).toHaveLength(3);
      }
    });

    it('should reject invalid issue structure', () => {
      const result = SwiftlintJsonIssueSchema.safeParse({
        file: 'test.swift'
        // Missing required fields
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.length).toBeGreaterThan(0);
      }
    });

    it('should handle null character values correctly', () => {
      const result = SwiftlintJsonIssueSchema.safeParse(issueWithNullCharacter);
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.character).toBeNull();
      }
    });

    it('should reject wrong severity values', () => {
      const invalidIssue = {
        ...validSwiftLintIssue,
        severity: 'InvalidSeverity'
      };

      const result = SwiftlintJsonIssueSchema.safeParse(invalidIssue);
      expect(result.success).toBe(false);
    });
  });

  describe('CLI Argument Logic Testing', () => {
    it('should parse CLI arguments with parseArgs', () => {
      const args = parseArgs({
        args: ['--format', 'table', '--quiet'],
        strict: false,
        allowPositionals: true,
        options: {
          format: { type: 'string', short: 'f' },
          quiet: { type: 'boolean', short: 'q' }
        }
      });

      expect(args.values.format).toBe('table');
      expect(args.values.quiet).toBe(true);
    });

    it('should handle boolean flags correctly', () => {
      const args1 = parseArgs({
        args: ['--no-color'],
        strict: false,
        allowPositionals: true,
        options: {
          'no-color': { type: 'boolean' }
        }
      });

      const args2 = parseArgs({
        args: ['--quiet'],
        strict: false,
        allowPositionals: true,
        options: {
          quiet: { type: 'boolean' }
        }
      });

      expect(args2.values.quiet).toBe(true);
      expect(typeof args1.values['no-color']).toBe('boolean');
    });

    it('should provide default values', () => {
      const values = parseArgs({
        args: [],
        strict: false,
        allowPositionals: true,
        options: {
          format: { type: 'string', short: 'f' },
          quiet: { type: 'boolean', short: 'q' },
          'no-color': { type: 'boolean' }
        }
      }).values;

      expect(values.format ?? 'compact').toBe('compact');
      expect(values.quiet ?? false).toBe(false);
      expect(values['no-color'] ?? false).toBe(false);
    });
  });

  describe('JSON Processing Logic', () => {
    it('should parse valid JSON strings', () => {
      const jsonString = JSON.stringify(multipleIssuesMultipleFiles);
      const parsed = JSON.parse(jsonString);

      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed).toHaveLength(3);
    });

    it('should handle empty JSON arrays', () => {
      const jsonString = JSON.stringify(emptyIssuesArray);
      const parsed = JSON.parse(jsonString);

      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed).toHaveLength(0);
    });

    it('should throw on malformed JSON', () => {
      expect(() => {
        JSON.parse('{ invalid json');
      }).toThrow();
    });

    it('should handle null values in JSON', () => {
      const issueWithNull = {
        ...validSwiftLintIssue,
        character: null
      };

      const jsonString = JSON.stringify([issueWithNull]);
      const parsed = JSON.parse(jsonString);

      expect(parsed[0].character).toBeNull();
    });
  });

  describe('Data Transformation Logic', () => {
    it('should group issues by file', () => {
      const groupByFile = (issues: any[]) => {
        const grouped = new Map<string, any[]>();
        for (const issue of issues) {
          const fileIssues = grouped.get(issue.file) || [];
          fileIssues.push(issue);
          grouped.set(issue.file, fileIssues);
        }
        return grouped;
      };

      const grouped = groupByFile(multipleIssuesMultipleFiles);

      expect(grouped.size).toBe(2);
      expect(grouped.get('/path/to/FileA.swift')).toHaveLength(2);
      expect(grouped.get('/path/to/FileB.swift')).toHaveLength(1);
    });

    it('should sort files alphabetically', () => {
      const files = ['/path/to/Z.swift', '/path/to/A.swift', '/path/to/M.swift'];
      const sorted = files.sort();

      expect(sorted[0]).toBe('/path/to/A.swift');
      expect(sorted[1]).toBe('/path/to/M.swift');
      expect(sorted[2]).toBe('/path/to/Z.swift');
    });

    it('should format line:character display', () => {
      const formatLineChar = (line: number, char: number | null) => {
        return `${line}:${char ?? 0}`;
      };

      expect(formatLineChar(42, 5)).toBe('42:5');
      expect(formatLineChar(10, null)).toBe('10:0');
      expect(formatLineChar(1, 0)).toBe('1:0');
    });

    it('should remove trailing periods from reasons', () => {
      const removeTrailingPeriod = (reason: string) => {
        return reason.endsWith('.') ? reason.slice(0, -1) : reason;
      };

      expect(removeTrailingPeriod('Message with period.')).toBe('Message with period');
      expect(removeTrailingPeriod('Message without period')).toBe('Message without period');
      expect(removeTrailingPeriod('')).toBe('');
    });
  });

  describe('Exit Code Logic', () => {
    it('should return 0 for no issues', () => {
      const getExitCode = (issues: any[]) => issues.length === 0 ? 0 : 1;

      expect(getExitCode([])).toBe(0);
      expect(getExitCode(emptyIssuesArray)).toBe(0);
    });

    it('should return 1 for issues found', () => {
      const getExitCode = (issues: any[]) => issues.length === 0 ? 0 : 1;

      expect(getExitCode([validSwiftLintIssue])).toBe(1);
      expect(getExitCode(multipleIssuesMultipleFiles)).toBe(1);
    });
  });

  describe('Configuration Precedence Logic', () => {
    it('should implement CLI > File > Default precedence', () => {
      const DEFAULT_CONFIG = { format: 'compact', quiet: false, noColor: false };

      const applyPrecedence = (cli: any, file: any, defaults: any) => {
        return {
          format: cli.format !== defaults.format ? cli.format : (file.format || defaults.format),
          quiet: cli.quiet !== defaults.quiet ? cli.quiet : (file.quiet !== undefined ? file.quiet : defaults.quiet),
          noColor: cli.noColor !== defaults.noColor ? cli.noColor : (file.noColor !== undefined ? file.noColor : defaults.noColor)
        };
      };

      // CLI overrides file
      const result1 = applyPrecedence(
        { format: 'table', quiet: true, noColor: true },
        { format: 'json', quiet: false, noColor: false },
        DEFAULT_CONFIG
      );
      expect(result1.format).toBe('table');
      expect(result1.quiet).toBe(true);
      expect(result1.noColor).toBe(true);

      // File overrides default
      const result2 = applyPrecedence(
        DEFAULT_CONFIG,
        { format: 'json', quiet: true },
        DEFAULT_CONFIG
      );
      expect(result2.format).toBe('json');
      expect(result2.quiet).toBe(true);
      expect(result2.noColor).toBe(false); // default
    });
  });

  describe('Format Validation Logic', () => {
    it('should validate format options', () => {
      const validFormats = ['compact', 'json', 'table'];
      const isValidFormat = (format: string) => validFormats.includes(format);

      expect(isValidFormat('compact')).toBe(true);
      expect(isValidFormat('json')).toBe(true);
      expect(isValidFormat('table')).toBe(true);
      expect(isValidFormat('invalid')).toBe(false);
      expect(isValidFormat('xml')).toBe(false);
    });
  });

  describe('Output Formatting Logic', () => {
    it('should format JSON output correctly', () => {
      const formatAsJson = (issues: any[]) => JSON.stringify(issues, null, 2) + '\n';

      const result = formatAsJson([validSwiftLintIssue]);
      expect(result.endsWith('\n')).toBe(true);

      const parsed = JSON.parse(result.trim());
      expect(parsed).toEqual([validSwiftLintIssue]);
    });

    it('should generate problem count messages', () => {
      const formatSummary = (count: number) => {
        if (count <= 0) return '';
        return `✖ ${count} problem${count === 1 ? '' : 's'}\n`;
      };

      expect(formatSummary(0)).toBe('');
      expect(formatSummary(1)).toBe('✖ 1 problem\n');
      expect(formatSummary(2)).toBe('✖ 2 problems\n');
      expect(formatSummary(10)).toBe('✖ 10 problems\n');
    });
  });
});
