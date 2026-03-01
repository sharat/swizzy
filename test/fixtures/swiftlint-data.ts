import { SwiftlintJsonIssue } from '../../src/types';

/**
 * Test fixtures for SwiftLint JSON data
 * These represent realistic SwiftLint output for comprehensive testing
 */

export const validSwiftLintIssue: SwiftlintJsonIssue = {
  character: 5,
  file: '/path/to/MyViewController.swift',
  line: 42,
  reason: 'Line should be 120 characters or less: currently 125 characters',
  rule_id: 'line_length',
  severity: 'Warning',
  type: 'Line Length'
};

export const validSwiftLintErrorIssue: SwiftlintJsonIssue = {
  character: 10,
  file: '/path/to/ErrorFile.swift',
  line: 15,
  reason: 'Force cast should be avoided.',
  rule_id: 'force_cast',
  severity: 'Error',
  type: 'Force Cast'
};

export const issueWithNullCharacter: SwiftlintJsonIssue = {
  character: null,
  file: '/path/to/File.swift',
  line: 1,
  reason: 'File should contain a newline at end of file.',
  rule_id: 'trailing_newline',
  severity: 'Warning',
  type: 'Trailing Newline'
};

export const multipleIssuesSingleFile: SwiftlintJsonIssue[] = [
  {
    character: 5,
    file: '/path/to/MyFile.swift',
    line: 10,
    reason: 'Line too long.',
    rule_id: 'line_length',
    severity: 'Warning',
    type: 'Line Length'
  },
  {
    character: 15,
    file: '/path/to/MyFile.swift',
    line: 25,
    reason: 'Variable name should be lowerCamelCase.',
    rule_id: 'identifier_name',
    severity: 'Warning',
    type: 'Identifier Name'
  }
];

export const multipleIssuesMultipleFiles: SwiftlintJsonIssue[] = [
  {
    character: 5,
    file: '/path/to/FileA.swift',
    line: 10,
    reason: 'Line too long.',
    rule_id: 'line_length',
    severity: 'Warning',
    type: 'Line Length'
  },
  {
    character: 15,
    file: '/path/to/FileB.swift',
    line: 25,
    reason: 'Variable name should be lowerCamelCase.',
    rule_id: 'identifier_name',
    severity: 'Error',
    type: 'Identifier Name'
  },
  {
    character: null,
    file: '/path/to/FileA.swift',
    line: 50,
    reason: 'Trailing whitespace.',
    rule_id: 'trailing_whitespace',
    severity: 'Warning',
    type: 'Trailing Whitespace'
  }
];

export const emptyIssuesArray: SwiftlintJsonIssue[] = [];

// Invalid JSON structures for error testing
export const invalidJsonStructures = {
  notArray: { error: 'not an array' },
  arrayWithInvalidIssue: [
    {
      // Missing required fields
      file: '/path/to/file.swift',
      reason: 'Some reason'
      // Missing: line, severity, rule_id, type, character
    }
  ],
  arrayWithWrongSeverity: [
    {
      character: 5,
      file: '/path/to/file.swift',
      line: 10,
      reason: 'Some reason',
      rule_id: 'some_rule',
      severity: 'InvalidSeverity', // Should be 'Warning' or 'Error'
      type: 'Some Type'
    }
  ],
  arrayWithWrongTypes: [
    {
      character: 'not-a-number', // Should be number or null
      file: 123, // Should be string
      line: 'not-a-number', // Should be number
      reason: null, // Should be string
      rule_id: [], // Should be string
      severity: 'Warning',
      type: {}  // Should be string
    }
  ]
};

// Raw JSON strings for testing
export const validJsonString = JSON.stringify(multipleIssuesMultipleFiles);
export const emptyJsonString = JSON.stringify(emptyIssuesArray);
export const invalidJsonString = '{ invalid json';
export const invalidSchemaJsonString = JSON.stringify(invalidJsonStructures.notArray);