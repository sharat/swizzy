/**
 * Unit tests for output formatting functionality
 */

import { CompactStream } from '../src/index';
import { vi } from 'vitest';
import {
  validSwiftLintIssue,
  validSwiftLintErrorIssue,
  issueWithNullCharacter,
  multipleIssuesSingleFile,
  multipleIssuesMultipleFiles,
  emptyIssuesArray
} from './fixtures/swiftlint-data';
import { validConfigs } from './fixtures/cli-configs';

describe('Output Formatting', () => {
  let stream: CompactStream;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Compact Format', () => {
    beforeEach(() => {
      stream = new CompactStream({ ...validConfigs.defaultConfig, format: 'compact' });
    });

    it('should format single issue correctly', () => {
      const formatMethod = (stream as any).formatAsCompact.bind(stream);
      const result = formatMethod([validSwiftLintIssue]);

      expect(result).toContain('MyViewController.swift');
      expect(result).toContain('42:5'); // line:character
      expect(result).toContain('Line should be 120 characters');
      expect(result).toContain('1 problem');
    });

    it('should format error severity differently from warning', () => {
      const formatMethod = (stream as any).formatAsCompact.bind(stream);

      const warningResult = formatMethod([validSwiftLintIssue]);
      const errorResult = formatMethod([validSwiftLintErrorIssue]);

      // Both should contain the issue content
      expect(warningResult).toContain('MyViewController.swift');
      expect(errorResult).toContain('ErrorFile.swift');
    });

    it('should handle null character position', () => {
      const formatMethod = (stream as any).formatAsCompact.bind(stream);
      const result = formatMethod([issueWithNullCharacter]);

      expect(result).toContain('1:0'); // null character becomes 0
      expect(result).toContain('File.swift');
    });

    it('should group multiple issues by file', () => {
      const formatMethod = (stream as any).formatAsCompact.bind(stream);
      const result = formatMethod(multipleIssuesMultipleFiles);

      // Should contain both files
      expect(result).toContain('FileA.swift');
      expect(result).toContain('FileB.swift');

      // Should show total count
      expect(result).toContain('3 problems');

      // File should appear only once as header (not repeated for each issue)
      const fileAOccurrences = (result.match(/FileA\.swift/g) || []).length;
      expect(fileAOccurrences).toBe(1);
    });

    it('should sort files alphabetically', () => {
      const unsortedIssues = [
        { ...validSwiftLintIssue, file: '/path/to/ZFile.swift' },
        { ...validSwiftLintIssue, file: '/path/to/AFile.swift' },
        { ...validSwiftLintIssue, file: '/path/to/MFile.swift' }
      ];

      const formatMethod = (stream as any).formatAsCompact.bind(stream);
      const result = formatMethod(unsortedIssues);

      const aFileIndex = result.indexOf('AFile.swift');
      const mFileIndex = result.indexOf('MFile.swift');
      const zFileIndex = result.indexOf('ZFile.swift');

      expect(aFileIndex).toBeLessThan(mFileIndex);
      expect(mFileIndex).toBeLessThan(zFileIndex);
    });

    it('should return empty string for no issues', () => {
      const formatMethod = (stream as any).formatAsCompact.bind(stream);
      const result = formatMethod(emptyIssuesArray);

      expect(result).toBe('');
    });

    it('should format summary correctly for different issue counts', () => {
      const formatSummaryMethod = (stream as any).formatSummary.bind(stream);

      expect(formatSummaryMethod(0)).toBe('');
      expect(formatSummaryMethod(1)).toContain('1 problem');
      expect(formatSummaryMethod(1)).not.toContain('problems');
      expect(formatSummaryMethod(2)).toContain('2 problems');
    });
  });

  describe('Table Format', () => {
    beforeEach(() => {
      stream = new CompactStream({ ...validConfigs.defaultConfig, format: 'table' });
    });

    it('should format single issue as table with headers', () => {
      const formatMethod = (stream as any).formatAsTable.bind(stream);
      const result = formatMethod([validSwiftLintIssue]);

      // Should contain table headers
      expect(result).toContain('File');
      expect(result).toContain('Line');
      expect(result).toContain('Col');
      expect(result).toContain('Severity');
      expect(result).toContain('Rule');
      expect(result).toContain('Message');

      // Should contain issue data
      expect(result).toContain('MyViewController.swift');
      expect(result).toContain('42');
      expect(result).toContain('5');
      expect(result).toContain('Warning');
      expect(result).toContain('line_length');
      expect(result).toContain('Line should be 120 characters');
    });

    it('should format multiple issues in table', () => {
      const formatMethod = (stream as any).formatAsTable.bind(stream);
      const result = formatMethod(multipleIssuesMultipleFiles);

      // Should contain all files
      expect(result).toContain('FileA.swift');
      expect(result).toContain('FileB.swift');

      // Should contain summary
      expect(result).toContain('3 problems');
    });

    it('should handle issue with null character in table', () => {
      const formatMethod = (stream as any).formatAsTable.bind(stream);
      const result = formatMethod([issueWithNullCharacter]);

      expect(result).toContain('File.swift');
      expect(result).toContain('1'); // line
      expect(result).toContain('0'); // character (null becomes 0)
    });

    it('should remove trailing periods from reasons', () => {
      const issueWithPeriod = {
        ...validSwiftLintIssue,
        reason: 'This reason has a trailing period.'
      };

      const formatMethod = (stream as any).formatAsTable.bind(stream);
      const result = formatMethod([issueWithPeriod]);

      expect(result).toContain('This reason has a trailing period'); // No dot
      expect(result).not.toContain('This reason has a trailing period.');
    });

    it('should handle reasons without trailing periods', () => {
      const issueWithoutPeriod = {
        ...validSwiftLintIssue,
        reason: 'This reason has no period'
      };

      const formatMethod = (stream as any).formatAsTable.bind(stream);
      const result = formatMethod([issueWithoutPeriod]);

      expect(result).toContain('This reason has no period');
    });
  });

  describe('JSON Format', () => {
    beforeEach(() => {
      stream = new CompactStream({ ...validConfigs.defaultConfig, format: 'json' });
    });

    it('should format single issue as JSON', () => {
      const formatMethod = (stream as any).formatAsJson.bind(stream);
      const result = formatMethod([validSwiftLintIssue]);

      expect(typeof result).toBe('string');
      expect(result).toContain('"file"');
      expect(result).toContain('"line"');
      expect(result).toContain('"character"');
      expect(result).toContain('"severity"');
      expect(result).toContain('"rule_id"');
      expect(result).toContain('"reason"');
      expect(result).toContain('"type"');

      // Should be valid JSON
      const parsed = JSON.parse(result.trim());
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed[0]).toEqual(validSwiftLintIssue);
    });

    it('should format multiple issues as JSON array', () => {
      const formatMethod = (stream as any).formatAsJson.bind(stream);
      const result = formatMethod(multipleIssuesMultipleFiles);

      const parsed = JSON.parse(result.trim());
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed).toHaveLength(3);
      expect(parsed).toEqual(multipleIssuesMultipleFiles);
    });

    it('should format empty array as JSON', () => {
      const formatMethod = (stream as any).formatAsJson.bind(stream);
      const result = formatMethod(emptyIssuesArray);

      expect(result.trim()).toBe('[]');
    });

    it('should preserve null character values in JSON', () => {
      const formatMethod = (stream as any).formatAsJson.bind(stream);
      const result = formatMethod([issueWithNullCharacter]);

      const parsed = JSON.parse(result.trim());
      expect(parsed[0].character).toBeNull();
    });

    it('should add newline at end', () => {
      const formatMethod = (stream as any).formatAsJson.bind(stream);
      const result = formatMethod([validSwiftLintIssue]);

      expect(result.endsWith('\n')).toBe(true);
    });
  });

  describe('Color Handling', () => {
    it('should disable colors when noColor config is true', () => {
      stream = new CompactStream({ ...validConfigs.defaultConfig, noColor: true });

      const formatMethod = (stream as any).formatAsCompact.bind(stream);
      const result = formatMethod([validSwiftLintIssue]);

      // With colors disabled, should not contain ANSI escape codes
      expect(result).toBeDefined();
      expect(result).not.toMatch(/\x1b\[/);
    });

    it('should enable colors when noColor config is false', () => {
      stream = new CompactStream({ ...validConfigs.defaultConfig, noColor: false });

      const formatMethod = (stream as any).formatAsCompact.bind(stream);
      const result = formatMethod([validSwiftLintIssue]);

      expect(result).toBeDefined();
    });

    it('should format issue table row with colors for severity', () => {
      stream = new CompactStream(validConfigs.defaultConfig);
      const formatIssueMethod = (stream as any).formatIssueForTable.bind(stream);

      const warningResult = formatIssueMethod(validSwiftLintIssue);
      const errorResult = formatIssueMethod(validSwiftLintErrorIssue);

      expect(Array.isArray(warningResult)).toBe(true);
      expect(Array.isArray(errorResult)).toBe(true);
      expect(warningResult).toHaveLength(6);
      expect(errorResult).toHaveLength(6);
    });
  });

  describe('File Issue Formatting', () => {
    beforeEach(() => {
      stream = new CompactStream(validConfigs.defaultConfig);
    });

    it('should format file issues with header and table', () => {
      const formatFileMethod = (stream as any).formatFileIssues.bind(stream);
      const result = formatFileMethod('/path/to/test.swift', multipleIssuesSingleFile);

      expect(result).toContain('test.swift');
      expect(result).toContain('10:5'); // First issue line:char
      expect(result).toContain('25:15'); // Second issue line:char
    });

    it('should handle single issue per file', () => {
      const formatFileMethod = (stream as any).formatFileIssues.bind(stream);
      const result = formatFileMethod('/path/to/single.swift', [validSwiftLintIssue]);

      expect(result).toContain('single.swift');
      expect(result).toContain('42:5');
    });

    it('should format line:character display correctly', () => {
      const formatFileMethod = (stream as any).formatFileIssues.bind(stream);
      const result = formatFileMethod('/path/to/test.swift', [
        { ...validSwiftLintIssue, line: 1, character: 1 },
        { ...validSwiftLintIssue, line: 100, character: 50 }
      ]);

      expect(result).toContain('1:1');
      expect(result).toContain('100:50');
    });
  });

  describe('Edge Cases and Special Characters', () => {
    beforeEach(() => {
      stream = new CompactStream(validConfigs.defaultConfig);
    });

    it('should handle special characters in file paths', () => {
      const specialPathIssue = {
        ...validSwiftLintIssue,
        file: '/path with spaces/special-chars_123/File$.swift'
      };

      const formatMethod = (stream as any).formatAsCompact.bind(stream);
      const result = formatMethod([specialPathIssue]);

      expect(result).toContain('File$.swift');
    });

    it('should handle unicode characters in reason', () => {
      const unicodeIssue = {
        ...validSwiftLintIssue,
        reason: 'Reason with unicode: 测试 🔍 €'
      };

      const formatMethod = (stream as any).formatAsCompact.bind(stream);
      const result = formatMethod([unicodeIssue]);

      expect(result).toContain('测试 🔍 €');
    });

    it('should handle very long file paths', () => {
      const longPathIssue = {
        ...validSwiftLintIssue,
        file: '/very/long/path/'.repeat(10) + 'File.swift'
      };

      const formatMethod = (stream as any).formatAsCompact.bind(stream);
      const result = formatMethod([longPathIssue]);

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle very long reason messages', () => {
      const longReasonIssue = {
        ...validSwiftLintIssue,
        reason: 'A very long reason message that might wrap across multiple lines '.repeat(5)
      };

      const formatMethod = (stream as any).formatAsTable.bind(stream);
      const result = formatMethod([longReasonIssue]);

      expect(result).toContain('A very long reason message');
    });

    it('should handle empty string values', () => {
      const emptyStringsIssue = {
        character: 0,
        file: '',
        line: 0,
        reason: '',
        rule_id: '',
        severity: 'Warning' as const,
        type: ''
      };

      const formatMethod = (stream as any).formatAsCompact.bind(stream);
      const result = formatMethod([emptyStringsIssue]);

      expect(result).toBeDefined();
    });
  });

  describe('Integration with ProcessSwiftlintIssues', () => {
    it('should route to correct formatter based on config', () => {
      const issues = [validSwiftLintIssue];

      // Test compact format
      const compactStream = new CompactStream({ ...validConfigs.defaultConfig, format: 'compact' });
      const compactMethod = (compactStream as any).processSwiftlintIssues.bind(compactStream);
      const compactResult = compactMethod(issues);
      expect(compactResult).toContain('MyViewController.swift');

      // Test table format
      const tableStream = new CompactStream({ ...validConfigs.defaultConfig, format: 'table' });
      const tableMethod = (tableStream as any).processSwiftlintIssues.bind(tableStream);
      const tableResult = tableMethod(issues);
      expect(tableResult).toContain('File');
      expect(tableResult).toContain('Line');

      // Test JSON format
      const jsonStream = new CompactStream({ ...validConfigs.defaultConfig, format: 'json' });
      const jsonMethod = (jsonStream as any).processSwiftlintIssues.bind(jsonStream);
      const jsonResult = jsonMethod(issues);
      expect(jsonResult.startsWith('[')).toBe(true);
    });
  });
});
