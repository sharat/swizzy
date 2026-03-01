# SwiftLint Test Fixtures

This directory contains comprehensive synthetic SwiftLint JSON test fixtures for testing the swizzy CLI modernization project.

## Test Fixture Categories

### Basic Scenarios

1. **`warnings-only.json`** (4 violations)
   - SwiftLint output containing only warnings
   - Includes: file_name, line_length, trailing_whitespace, identifier_name violations
   - Use for testing warning-only scenarios

2. **`errors-only.json`** (3 violations)
   - SwiftLint output containing only errors
   - Includes: force_cast, force_unwrapping, file_length violations
   - Use for testing error-only scenarios

3. **`mixed-violations.json`** (6 violations)
   - Mixed errors and warnings from multiple files
   - Includes both Error and Warning severities
   - Use for testing mixed violation handling

4. **`empty-results.json`** (0 violations)
   - Valid SwiftLint JSON with no violations
   - Empty array `[]`
   - Use for testing clean code scenarios

5. **`single-violation.json`** (1 violation)
   - Minimal case with one line_length warning
   - Use for testing single violation parsing

### Edge Cases

6. **`malformed-json.json`** (Invalid JSON)
   - Intentionally broken JSON structure
   - Missing commas and braces
   - Use for testing JSON parsing error handling

7. **`invalid-swiftlint.json`** (2 violations, Invalid Schema)
   - Valid JSON but invalid SwiftLint schema
   - Contains invalid fields, wrong types, missing required fields
   - Use for testing schema validation

8. **`large-output.json`** (120 violations)
   - Large dataset with 120+ violations across 22 files
   - Realistic file paths and violation types
   - Use for performance testing and stress testing

### Unicode and Special Character Support

9. **`unicode-paths.json`** (5 violations)
   - File paths with unicode characters
   - Includes Chinese (用户管理), Spanish (Configuración), French (Français), Japanese (日本語)
   - Emoji in filenames (🎮)
   - Use for testing international character support

10. **`special-characters.json`** (6 violations)
    - File paths with special characters: `&`, `[]`, `()`, `'`, `"`, `@`, `#`, `!`
    - Escape sequences in violation messages
    - Use for testing special character handling

### Real-World Patterns

11. **`typical-project.json`** (14 violations)
    - Realistic SwiftLint output from a medium iOS Todo app
    - Common project structure and violation patterns
    - Use for testing typical development scenarios

12. **`xcode-project.json`** (16 violations)
    - Violations from typical Xcode project structure
    - Includes standard iOS app folders and files
    - Supporting Files and Info.plist violations
    - Use for testing Xcode project integration

13. **`swift-package.json`** (13 violations)
    - SwiftLint output from Swift Package Manager project
    - Sources/Tests directory structure
    - Public/Internal API violations
    - Use for testing Swift Package Manager projects

## SwiftLint JSON Schema Reference

All valid fixtures follow the SwiftLint JSON output format:

```json
[
  {
    "character": number | null,
    "file": "string (absolute file path)",
    "line": number,
    "reason": "string (violation description)",
    "rule_id": "string (rule identifier)",
    "severity": "Warning" | "Error",
    "type": "string (human-readable rule type)"
  }
]
```

## Common Rule Types Included

- **File Name**: `file_name`
- **Line Length**: `line_length`
- **Trailing Whitespace**: `trailing_whitespace`
- **Force Cast**: `force_cast`
- **Force Unwrapping**: `force_unwrapping`
- **Identifier Name**: `identifier_name`
- **Unused Variable**: `unused_variable`
- **File Length**: `file_length`
- **Function Body Length**: `function_body_length`
- **Cyclomatic Complexity**: `cyclomatic_complexity`

## Usage in Tests

```typescript
// Example test usage
import fs from 'fs';

// Load test fixture
const warningsOnly = JSON.parse(fs.readFileSync('test/fixtures/warnings-only.json', 'utf8'));

// Test warning filtering
expect(warningsOnly.every(v => v.severity === 'Warning')).toBe(true);

// Test large dataset performance
const largeOutput = JSON.parse(fs.readFileSync('test/fixtures/large-output.json', 'utf8'));
console.time('Process large dataset');
processSwiftLintOutput(largeOutput);
console.timeEnd('Process large dataset');
```

## Coverage Summary

- **Total Fixtures**: 13 valid JSON files + 2 invalid for error testing
- **Total Violations**: 220+ across all valid fixtures
- **File Path Variations**: 50+ unique file paths
- **Rule Coverage**: 10+ different SwiftLint rules
- **Character Encoding**: ASCII, UTF-8, Unicode, Emoji
- **Project Types**: iOS Apps, Swift Packages, Xcode Projects
- **Performance Testing**: Up to 120 violations in single file

These fixtures provide comprehensive coverage for testing the swizzy CLI's SwiftLint JSON processing capabilities.