/**
 * Unit tests for types.ts - Zod schema validation
 */

import { SwiftlintJsonIssueSchema, SwiftlintJsonOutputSchema } from '../src/types';
import {
  validSwiftLintIssue,
  validSwiftLintErrorIssue,
  issueWithNullCharacter,
  multipleIssuesMultipleFiles,
  emptyIssuesArray,
  invalidJsonStructures
} from './fixtures/swiftlint-data';

describe('SwiftlintJsonIssueSchema', () => {
  describe('valid issue validation', () => {
    it('should validate a complete valid warning issue', () => {
      const result = SwiftlintJsonIssueSchema.safeParse(validSwiftLintIssue);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validSwiftLintIssue);
        expect(result.data.severity).toBe('Warning');
        expect(result.data.character).toBe(5);
      }
    });

    it('should validate a complete valid error issue', () => {
      const result = SwiftlintJsonIssueSchema.safeParse(validSwiftLintErrorIssue);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validSwiftLintErrorIssue);
        expect(result.data.severity).toBe('Error');
      }
    });

    it('should validate issue with null character field', () => {
      const result = SwiftlintJsonIssueSchema.safeParse(issueWithNullCharacter);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.character).toBeNull();
        expect(result.data.file).toBe('/path/to/File.swift');
      }
    });

    it('should validate issue with zero line number', () => {
      const issueWithZeroLine = {
        ...validSwiftLintIssue,
        line: 0
      };

      const result = SwiftlintJsonIssueSchema.safeParse(issueWithZeroLine);
      expect(result.success).toBe(true);
    });
  });

  describe('invalid issue validation', () => {
    it('should reject issue with missing required fields', () => {
      const incompleteIssue = {
        file: '/path/to/file.swift',
        reason: 'Some reason'
        // Missing: line, severity, rule_id, type, character
      };

      const result = SwiftlintJsonIssueSchema.safeParse(incompleteIssue);
      expect(result.success).toBe(false);

      if (!result.success) {
        const errorPaths = result.error.issues.map(e => e.path[0]);
        expect(errorPaths).toContain('line');
        expect(errorPaths).toContain('severity');
        expect(errorPaths).toContain('rule_id');
        expect(errorPaths).toContain('type');
        expect(errorPaths).toContain('character');
      }
    });

    it('should reject issue with invalid severity', () => {
      const invalidSeverityIssue = {
        ...validSwiftLintIssue,
        severity: 'InvalidSeverity'
      };

      const result = SwiftlintJsonIssueSchema.safeParse(invalidSeverityIssue);
      expect(result.success).toBe(false);

      if (!result.success) {
        expect(result.error.issues[0]?.path).toEqual(['severity']);
        expect(result.error.issues[0]?.code).toContain('invalid');
      }
    });

    it('should reject issue with wrong field types', () => {
      const wrongTypesIssue = {
        character: 'not-a-number', // Should be number or null
        file: 123, // Should be string
        line: 'not-a-number', // Should be number
        reason: null, // Should be string
        rule_id: [], // Should be string
        severity: 'Warning',
        type: {} // Should be string
      };

      const result = SwiftlintJsonIssueSchema.safeParse(wrongTypesIssue);
      expect(result.success).toBe(false);

      if (!result.success) {
        expect(result.error.issues.length).toBeGreaterThan(0);
        const errorPaths = result.error.issues.map(e => e.path[0]);
        expect(errorPaths).toContain('character');
        expect(errorPaths).toContain('file');
        expect(errorPaths).toContain('line');
        expect(errorPaths).toContain('reason');
        expect(errorPaths).toContain('rule_id');
        expect(errorPaths).toContain('type');
      }
    });

    it('should reject non-object input', () => {
      const result = SwiftlintJsonIssueSchema.safeParse('not an object');
      expect(result.success).toBe(false);
    });

    it('should reject null input', () => {
      const result = SwiftlintJsonIssueSchema.safeParse(null);
      expect(result.success).toBe(false);
    });

    it('should reject undefined input', () => {
      const result = SwiftlintJsonIssueSchema.safeParse(undefined);
      expect(result.success).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle empty strings for required string fields', () => {
      const emptyStringIssue = {
        ...validSwiftLintIssue,
        file: '',
        reason: '',
        rule_id: '',
        type: ''
      };

      const result = SwiftlintJsonIssueSchema.safeParse(emptyStringIssue);
      expect(result.success).toBe(true); // Empty strings are valid
    });

    it('should handle negative line numbers', () => {
      const negativeLineIssue = {
        ...validSwiftLintIssue,
        line: -1
      };

      const result = SwiftlintJsonIssueSchema.safeParse(negativeLineIssue);
      expect(result.success).toBe(true); // Negative numbers are valid for line field
    });

    it('should handle negative character numbers', () => {
      const negativeCharIssue = {
        ...validSwiftLintIssue,
        character: -1
      };

      const result = SwiftlintJsonIssueSchema.safeParse(negativeCharIssue);
      expect(result.success).toBe(true);
    });
  });
});

describe('SwiftlintJsonOutputSchema', () => {
  describe('valid array validation', () => {
    it('should validate empty array', () => {
      const result = SwiftlintJsonOutputSchema.safeParse(emptyIssuesArray);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual([]);
      }
    });

    it('should validate array with single issue', () => {
      const result = SwiftlintJsonOutputSchema.safeParse([validSwiftLintIssue]);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(1);
        expect(result.data[0]).toEqual(validSwiftLintIssue);
      }
    });

    it('should validate array with multiple issues', () => {
      const result = SwiftlintJsonOutputSchema.safeParse(multipleIssuesMultipleFiles);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(3);
        expect(result.data).toEqual(multipleIssuesMultipleFiles);
      }
    });
  });

  describe('invalid array validation', () => {
    it('should reject non-array input', () => {
      const result = SwiftlintJsonOutputSchema.safeParse(invalidJsonStructures.notArray);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.code).toBe('invalid_type');
      }
    });

    it('should reject array with invalid issues', () => {
      const result = SwiftlintJsonOutputSchema.safeParse(invalidJsonStructures.arrayWithInvalidIssue);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.length).toBeGreaterThan(0);
      }
    });

    it('should reject array with mixed valid and invalid issues', () => {
      const mixedArray = [
        validSwiftLintIssue,
        { invalid: 'issue' },
        validSwiftLintErrorIssue
      ];

      const result = SwiftlintJsonOutputSchema.safeParse(mixedArray);
      expect(result.success).toBe(false);
    });

    it('should reject string input', () => {
      const result = SwiftlintJsonOutputSchema.safeParse('not an array');
      expect(result.success).toBe(false);
    });

    it('should reject null input', () => {
      const result = SwiftlintJsonOutputSchema.safeParse(null);
      expect(result.success).toBe(false);
    });

    it('should reject object input', () => {
      const result = SwiftlintJsonOutputSchema.safeParse({ not: 'array' });
      expect(result.success).toBe(false);
    });
  });

  describe('comprehensive validation scenarios', () => {
    it('should validate large array of issues', () => {
      const largeArray = Array(100).fill(0).map((_, index) => ({
        ...validSwiftLintIssue,
        line: index + 1,
        file: `/path/to/file${index}.swift`
      }));

      const result = SwiftlintJsonOutputSchema.safeParse(largeArray);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(100);
      }
    });

    it('should provide detailed error information for invalid structures', () => {
      const complexInvalidArray = [
        validSwiftLintIssue, // Valid
        { // Invalid - missing fields
          file: 'test.swift',
          reason: 'test'
        },
        { // Invalid - wrong types
          ...validSwiftLintIssue,
          line: 'not-number',
          severity: 'InvalidSeverity'
        }
      ];

      const result = SwiftlintJsonOutputSchema.safeParse(complexInvalidArray);
      expect(result.success).toBe(false);

      if (!result.success) {
        // Should have errors for multiple issues in the array
        const errorsByIndex = result.error.issues.reduce((acc, error) => {
          const index = error.path[0] as number;
          if (!acc[index]) acc[index] = [];
          acc[index].push(error);
          return acc;
        }, {} as Record<number, any[]>);

        expect(Object.keys(errorsByIndex)).toContain('1'); // Second item has errors
        expect(Object.keys(errorsByIndex)).toContain('2'); // Third item has errors
      }
    });
  });
});
