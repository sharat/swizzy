const { jsonify } = require('../dist/swiftlint-jsonify');

/**
 * @typedef {Object} SwiftLintMessage
 * @property {string} line - Line number where violation occurred
 * @property {string} column - Column number where violation occurred
 * @property {string} type - Type of violation ('warning' or 'error')
 * @property {string} ruleId - Name of the violated rule
 * @property {string} message - Description of the violation
 */

/**
 * @typedef {Object} SwiftLintViolation
 * @property {string} filePath - Path to the file containing violations
 * @property {SwiftLintMessage[]} messages - Array of violation messages
 */

describe('swiftlint-jsonify', () => {
  test('should parse multiple warning types correctly', () => {
    const rawText = `/path/to/project/source/Components/Card1.swift:6:5: warning: File Header Violation: Header comments should be consistent with project patterns (file_header)
/path/to/project/source/Components/Card2.swift:1:1: warning: File Name Violation: File name should match a type or extension declared in the file (if any) (file_name)`;
    
    const result = jsonify(rawText);
    
    expect(result).toEqual([
      {
        filePath: '/path/to/project/source/Components/Card1.swift',
        messages: [{
          line: '6',
          column: '5',
          type: 'warning',
          ruleId: 'File Header Violation',
          message: 'Header comments should be consistent with project patterns (file_header)'
        }]
      },
      {
        filePath: '/path/to/project/source/Components/Card2.swift',
        messages: [{
          line: '1',
          column: '1',
          type: 'warning',
          ruleId: 'File Name Violation',
          message: 'File name should match a type or extension declared in the file (if any) (file_name)'
        }]
      }
    ]);
  });

  test('should handle warnings with different line lengths', () => {
    const rawText = `/path/to/project/source/Views/CardView.swift:146:1: warning: Line Length Violation: Line should be 120 characters or less; currently it has 174 characters (line_length)`;
    
    const result = jsonify(rawText);
    
    expect(result).toEqual([
      {
        filePath: '/path/to/project/source/Views/CardView.swift',
        messages: [{
          line: '146',
          column: '1',
          type: 'warning',
          ruleId: 'Line Length Violation',
          message: 'Line should be 120 characters or less; currently it has 174 characters (line_length)'
        }]
      }
    ]);
  });

  test('should handle error-level violations', () => {
    const rawText = `/path/to/project/source/ViewModels/ViewModel.swift:71:44: error: Attribute Name Spacing Violation: \`@escaping\` must have a trailing space before the associated type (attribute_name_spacing)`;
    
    const result = jsonify(rawText);
    
    expect(result).toEqual([
      {
        filePath: '/path/to/project/source/ViewModels/ViewModel.swift',
        messages: [{
          line: '71',
          column: '44',
          type: 'error',
          ruleId: 'Attribute Name Spacing Violation',
          message: '`@escaping` must have a trailing space before the associated type (attribute_name_spacing)'
        }]
      }
    ]);
  });

  test('should handle empty input', () => {
    const result = jsonify('');
    expect(result).toEqual([]);
  });

  test('should handle input with invalid format', () => {
    const rawText = 'This is not a valid SwiftLint output';
    expect(() => jsonify(rawText)).not.toThrow();
    expect(jsonify(rawText)).toEqual([]);
  });

  test('should handle multiple lines with mixed errors and warnings', () => {
    const rawText = `/path/to/project/source/Core/Model1.swift:251:48: error: Attribute Name Spacing Violation: \`@escaping\` must have a trailing space before the associated type (attribute_name_spacing)
/path/to/project/source/Core/Model2.swift:31:9: warning: Implicit Getter Violation: Computed read-only properties should avoid using the get keyword (implicit_getter)`;
    
    const result = jsonify(rawText);
    
    expect(result).toEqual([
      {
        filePath: '/path/to/project/source/Core/Model1.swift',
        messages: [{
          line: '251',
          column: '48',
          type: 'error',
          ruleId: 'Attribute Name Spacing Violation',
          message: '`@escaping` must have a trailing space before the associated type (attribute_name_spacing)'
        }]
      },
      {
        filePath: '/path/to/project/source/Core/Model2.swift',
        messages: [{
          line: '31',
          column: '9',
          type: 'warning',
          ruleId: 'Implicit Getter Violation',
          message: 'Computed read-only properties should avoid using the get keyword (implicit_getter)'
        }]
      }
    ]);
  });

  test('should handle violations with special characters in messages', () => {
    const rawText = `/path/to/project/source/Utils/Utilities.swift:18:1: warning: Operator Function Whitespace Violation: Operators should be surrounded by a single whitespace when defining them (operator_whitespace)`;
    
    const result = jsonify(rawText);
    
    expect(result).toEqual([
      {
        filePath: '/path/to/project/source/Utils/Utilities.swift',
        messages: [{
          line: '18',
          column: '1',
          type: 'warning',
          ruleId: 'Operator Function Whitespace Violation',
          message: 'Operators should be surrounded by a single whitespace when defining them (operator_whitespace)'
        }]
      }
    ]);
  });

  test('should handle multiple violations in the same file', () => {
    const rawText = `/path/to/project/source/Common/Helper.swift:6:5: warning: File Header Violation: Header comments should be consistent with project patterns (file_header)
/path/to/project/source/Common/Helper.swift:1:1: warning: File Name Violation: File name should match a type or extension declared in the file (if any) (file_name)
/path/to/project/source/Common/Helper.swift:21:14: warning: Function Body Length Violation: Function body should span 50 lines or less excluding comments and whitespace: currently spans 85 lines (function_body_length)`;
    
    const result = jsonify(rawText);
    
    expect(result).toHaveLength(1);
    expect(result[0].filePath.endsWith('Helper.swift')).toBe(true);
    expect(result[0].messages).toHaveLength(3);
    expect(result[0].messages.map(m => m.ruleId)).toEqual([
      'File Header Violation',
      'File Name Violation', 
      'Function Body Length Violation'
    ]);
  });
});