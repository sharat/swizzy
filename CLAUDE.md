# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Swizzy is a pretty formatter for SwiftLint output, inspired by snazzy. It transforms SwiftLint's JSON output into a compact, readable, terminal-friendly format with colors and proper formatting.

The tool operates as a CLI that either:
1. Accepts piped SwiftLint JSON output: `swiftlint lint --reporter json | swizzy`
2. Automatically runs SwiftLint if no input is piped: `swizzy`

## Commands

### Build
```bash
npm run build
```
Compiles TypeScript to JavaScript in the `dist/` directory and makes the output executable.

### Lint
```bash
npm run lint        # Check for linting issues
npm run lint:fix    # Auto-fix linting issues
```

### Testing
There is no automated test suite (no jest config or test files). Manual testing is done using:
```bash
cat anonymized_lint.json | node dist/index.js
```

The `anonymized_lint.json` file contains real SwiftLint output with anonymized file paths for testing.

### Run Locally
```bash
npm start  # Runs the built version from dist/index.js
```

## Architecture

### Core Components

**src/index.ts** - Main entry point containing:
- `CompactStream` class: A Node.js Transform stream that processes SwiftLint JSON input
  - Buffers all input chunks in `_transform()`
  - Processes complete JSON in `_flush()` after all input is received
  - Validates JSON structure using Zod schema
  - Groups issues by file and formats them into a table
  - Sets process exit code (0 for no issues, 1 for issues found)
- `runSwiftlintAndPipe()`: Spawns SwiftLint process when no input is piped
- Main execution logic: Handles CLI args (--help, --version) and stream setup

**src/types.ts** - Type definitions and validation:
- `SwiftlintJsonIssue`: Interface for a single SwiftLint issue
- Zod schemas for runtime validation of SwiftLint JSON output
- Ensures input matches expected structure before processing

### Data Flow

1. Input arrives via stdin (piped) or spawned SwiftLint process
2. `CompactStream` buffers all input chunks
3. On stream end, complete buffer is parsed as JSON
4. Zod validates the JSON structure against `SwiftlintJsonOutputSchema`
5. Issues are grouped by file path
6. For each file, issues are formatted into a table with:
   - Line:character position (dimmed)
   - Severity (colored: yellow for warnings, red for errors)
   - Reason message
   - Rule ID (dimmed)
7. Summary line shows total issue count
8. Exit code reflects whether issues were found

### Key Dependencies

- **chalk**: Terminal styling and colors
- **text-table**: ASCII table formatting with custom alignment
- **ansicolor**: Strip ANSI codes for accurate string length calculation
- **zod**: Runtime JSON schema validation
- **minimist**: CLI argument parsing

## Code Style

ESLint is configured with strict TypeScript rules:
- 2-space indentation
- Single quotes (allow template literals)
- No semicolons omitted
- Max line length: 120 characters
- camelCase enforced (except rule_id from SwiftLint JSON uses snake_case)
- No `any` types allowed
- Unused vars prefixed with `_` are allowed

## Important Patterns

**JSON Validation**: All SwiftLint input is validated with Zod schemas before processing. Invalid structure throws descriptive errors.

**Exit Codes**: The stream tracks exit codes internally and sets process.exit() on completion:
- 0 = success (no issues or empty input)
- 1 = issues found or error occurred

**TTY Detection**: `process.stdin.isTTY` determines whether to spawn SwiftLint automatically or read from stdin.

**Error Handling**: The stream catches JSON parse errors and validation errors, providing helpful messages and printing usage info when appropriate.
