# Integration Tests for Swizzy CLI

This directory contains comprehensive integration tests for the swizzy CLI tool. These tests verify the complete pipeline from stdin input to formatted stdout output, covering all supported formats, CLI flags, error conditions, and real-world usage patterns.

## Test Structure

### Test Categories

1. **End-to-End Pipeline Tests** (`e2e-pipeline.test.ts`)
   - Full workflow: stdin JSON input → parsing → formatting → stdout output
   - Format variations: compact, table, JSON
   - Real SwiftLint integration patterns
   - Unicode file path handling
   - Edge cases and performance

2. **CLI Flag Integration Tests** (`cli-flags.test.ts`)
   - Help and version flags (`--help`, `--version`)
   - Format options (`--format`, `-f`)
   - Quiet mode (`--quiet`, `-q`)
   - Color control (`--no-color`)
   - Configuration files (`--config`, `-c`)
   - Flag combination and precedence

3. **Error Handling Tests** (`error-handling.test.ts`)
   - Malformed JSON input
   - Invalid SwiftLint schema
   - Missing configuration files
   - Invalid CLI arguments
   - Timeout and resource handling
   - Graceful error recovery

4. **Real-World Usage Tests** (`real-world-usage.test.ts`)
   - CI/CD scenarios (quiet mode, JSON output, automation)
   - Developer workflows (interactive use, colored output)
   - Team collaboration (shared configs, Unicode support)
   - Pre-commit hook integration
   - IDE integration patterns
   - Script automation

5. **Performance Tests** (`performance.test.ts`)
   - Large input processing (1000+ violations)
   - Memory usage optimization
   - Concurrent execution
   - Performance regression testing
   - Resource cleanup

### Test Fixtures

Test fixtures are located in `test/fixtures/` and include:

- `warnings-only.json` - Sample warnings from SwiftLint
- `errors-and-warnings.json` - Mixed error and warning scenarios
- `empty-output.json` - Empty SwiftLint output
- `single-error.json` - Single error case
- `large-output.json` - Large dataset for performance testing
- `unicode-paths.json` - International file paths
- `malformed.json` - Invalid JSON for error testing
- `invalid-schema.json` - Wrong structure for validation testing
- `config/` - Configuration file examples

## Running Tests

### Basic Integration Tests

```bash
npm run test:integration
```

### Watch Mode (for development)

```bash
npm run test:integration:watch
```

### Coverage Report

```bash
npm run test:integration:coverage
```

### Performance Tests Only

```bash
npm run test:performance
```

### CI Mode

```bash
npm run test:ci
```

### Individual Test Suites

```bash
# Run specific test file
npx vitest run --config vitest.config.integration.ts test/integration/e2e-pipeline.test.ts

# Run tests matching pattern
npx vitest run --config vitest.config.integration.ts --testNamePattern="Format"

# Run with debugging output
DEBUG_INTEGRATION_TESTS=1 npx vitest run --config vitest.config.integration.ts test/integration/cli-flags.test.ts
```

## Test Helper Utilities

### `CliTestHelper` Class

The main test utility class provides:

- `runCli(config)` - Execute CLI with configuration
- `runCliSuccess(config)` - Expect exit code 0
- `runCliFailure(config)` - Expect exit code 1
- `runCliConfigError(config)` - Expect exit code 2
- `benchmarkCli(input, iterations)` - Performance measurement
- `createTempConfig(config)` - Temporary configuration files
- `stripColors(text)` - Remove ANSI escape sequences
- `normalizeLineEndings(text)` - Cross-platform compatibility

### Configuration Options

```typescript
interface CliTestConfig {
  args?: string[];           // CLI arguments
  input?: string;            // stdin input
  timeout?: number;          // test timeout (default: 10s)
  expectExit?: number;       // expected exit code
}
```

### Custom Jest Matchers

- `toContainExitCode(expected)` - Check exit codes
- `toHaveCompletedWithin(maxDuration)` - Performance assertions
- `toBeValidSwiftLintJSON()` - Validate SwiftLint JSON format

## Test Environment Setup

### Prerequisites

1. Build the CLI before running tests:
   ```bash
   npm run build
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

### Environment Variables

- `DEBUG_INTEGRATION_TESTS=1` - Enable verbose output
- `CI=true` - Enable CI-specific behaviors
- `NODE_ENV=test` - Set test environment

### Global Setup

The test suite includes:

- Automatic CLI building before tests
- Executable verification
- Environment configuration
- Cleanup procedures

## Test Patterns and Best Practices

### Testing CLI Tools

1. **Use child_process.spawn()** - Test the actual executable
2. **Pipe test data** - Use realistic input data
3. **Verify stdout/stderr** - Check complete output
4. **Test exit codes** - Ensure proper status codes
5. **Handle timeouts** - Set appropriate limits
6. **Clean isolation** - Independent test runs

### Performance Testing

1. **Measure multiple iterations** - Statistical significance
2. **Set realistic timeouts** - Allow for slower systems
3. **Test concurrent execution** - Resource contention
4. **Monitor memory usage** - Detect leaks
5. **Validate scalability** - Linear vs exponential growth

### Error Testing

1. **Test malformed input** - Invalid JSON, syntax errors
2. **Test edge cases** - Empty input, very large input
3. **Test configuration errors** - Missing files, wrong formats
4. **Test graceful degradation** - Partial failures
5. **Test error messages** - Helpful, actionable feedback

## Continuous Integration

### GitHub Actions

The integration tests are designed to run in CI environments:

```yaml
- name: Run Integration Tests
  run: npm run test:ci
  env:
    CI: true
```

### Coverage Reporting

Coverage reports are generated in:
- `coverage/integration/` - HTML reports
- `test-results/integration/` - JUnit XML

### Performance Monitoring

Performance tests help detect:
- Regression in processing time
- Memory leak issues
- Scalability problems
- Resource contention

## Troubleshooting

### Common Issues

1. **CLI not found** - Run `npm run build` first
2. **Permission errors** - Ensure executable permissions
3. **Timeout issues** - Increase timeout for slower systems
4. **Memory issues** - Reduce concurrent workers

### Debugging

1. Enable debug output:
   ```bash
   DEBUG_INTEGRATION_TESTS=1 npm run test:integration
   ```

2. Run single test:
   ```bash
   npx vitest run --config vitest.config.integration.ts test/integration/specific.test.ts
   ```

3. Check CLI output manually:
   ```bash
   echo '[]' | node dist/index.js --format json
   ```

### Platform Considerations

- **Line endings** - Tests normalize CRLF/LF differences
- **File paths** - Use cross-platform path handling
- **Performance** - Timeouts account for varying system speeds
- **Unicode** - Full international character support

## Contributing

When adding new integration tests:

1. Follow existing patterns and structure
2. Include comprehensive error cases
3. Add appropriate timeouts
4. Update documentation
5. Verify cross-platform compatibility
6. Include performance considerations

### Test Naming

- Use descriptive test names
- Group related tests in describe blocks
- Follow pattern: "should [behavior] when [condition]"

### Assertions

- Use specific assertions
- Include helpful error messages
- Test both positive and negative cases
- Verify complete output, not just presence

## Maintenance

### Regular Updates

1. **Update fixtures** - Keep test data current
2. **Performance baselines** - Adjust for improvements
3. **Error messages** - Sync with actual CLI output
4. **Dependencies** - Keep Jest and tools updated

### Monitoring

Watch for:
- Test flakiness
- Performance degradation
- Coverage gaps
- Platform-specific issues
