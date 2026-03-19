#!/usr/bin/env node

import { Transform } from 'stream';
import table from 'text-table';
import { parseArgs } from 'node:util';
import { createColors } from 'picocolors';
import {
  SwiftlintJsonIssue,
  SwiftlintJsonOutputSchema,
  CliConfig,
  CliParseResult,
  OutputFormat,
  ProcessingError,
  Result,
  ok,
  err,
  isOk,
  isErr,
  DEFAULT_CLI_CONFIG,
  OUTPUT_FORMATS
} from './types';
import { spawn } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const stripAnsi = (text: string): string => text.replace(/\x1b\[[0-9;]*m/g, '');

type Colorizer = ReturnType<typeof createColors>;
const getColors = (noColor: boolean): Colorizer => createColors(!noColor);

// Version detection with better error handling
const getVersion = (): string => {
  const packageJsonPath = resolve(__dirname, '../package.json');
  try {
    if (!existsSync(packageJsonPath)) {
      return 'unknown';
    }
    const packageJson: { version: string } = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
    return packageJson.version;
  } catch {
    return 'unknown';
  }
};

const VERSION = getVersion();

/**
 * Print comprehensive usage instructions for the swizzy CLI
 */
const printUsage = (noColor: boolean = false): void => {
  const c = getColors(noColor);
  // eslint-disable-next-line no-console
  console.log(`
${c.bold('swizzy')} v${VERSION}

${c.bold('USAGE:')}
  swizzy [options]

${c.bold('DESCRIPTION:')}
  A modern CLI tool that beautifies SwiftLint output into readable formats.
  Supports multiple output formats and integrates seamlessly with development workflows.

${c.bold('OPTIONS:')}
  ${c.cyan('--format, -f')}      Output format (compact, json, table) [default: compact]
  ${c.cyan('--config, -c')}      Path to configuration file
  ${c.cyan('--quiet, -q')}       Suppress non-essential output
  ${c.cyan('--no-color')}        Disable colored output
  ${c.cyan('--help, -h')}        Show this help message
  ${c.cyan('--version, -v')}     Show version number

${c.bold('EXAMPLES:')}
  ${c.dim('# Pipe SwiftLint output (JSON or default text reporter)')}
  swiftlint lint --reporter json | swizzy
  swiftlint . | swizzy

  ${c.dim('# Use table format')}
  swiftlint lint --reporter json | swizzy --format table

  ${c.dim('# Quiet mode for CI/CD')}
  swiftlint lint --reporter json | swizzy --quiet

  ${c.dim('# Run SwiftLint automatically (if swiftlint is in PATH)')}
  swizzy

  ${c.dim('# Use custom config file')}
  swizzy --config ./swizzy.config.json

  ${c.dim('# Output raw JSON for processing')}
  swiftlint lint --reporter json | swizzy --format json

${c.bold('EXIT CODES:')}
  0    No issues found or help/version displayed
  1    SwiftLint issues found or parsing errors
  2    Invalid arguments or configuration errors

${c.bold('CONFIG FILE:')}
  JSON file with options: {"format": "compact", "quiet": true}

For more information, visit: ${c.blue('https://github.com/sharat/swizzy')}
`);
};

/**
 * Load configuration from file with proper error handling
 */
const loadConfig = (configPath?: string): Result<Partial<CliConfig>> => {
  if (!configPath) {
    return ok({});
  }

  const fullPath = resolve(configPath);
  if (!existsSync(fullPath)) {
    return err({
      type: 'config',
      message: `Configuration file not found: ${fullPath}`,
      path: fullPath
    });
  }

  try {
    const configData = readFileSync(fullPath, 'utf-8');
    const parsed = JSON.parse(configData);
    return ok(parsed);
  } catch (error) {
    return err({
      type: 'config',
      message: `Invalid configuration file: ${error instanceof Error ? error.message : 'Unknown error'}`,
      path: fullPath,
      cause: error instanceof Error ? error : undefined
    });
  }
};

/**
 * Parse and validate CLI arguments with improved type safety and proper precedence
 */
const parseCliArgs = (argv: string[]): Result<CliParseResult> => {
  const parsed = parseArgs({
    args: argv,
    strict: false,
    allowPositionals: true,
    options: {
      help: { type: 'boolean', short: 'h' },
      version: { type: 'boolean', short: 'v' },
      format: { type: 'string', short: 'f' },
      config: { type: 'string', short: 'c' },
      quiet: { type: 'boolean', short: 'q' },
      'no-color': { type: 'boolean' }
    }
  });
  const args = parsed.values as Record<string, unknown>;
  const cliConfigPath = typeof args.config === 'string'
    ? args.config
    : args.config === true
      ? ''
      : undefined;

  // Load config file if specified
  let fileConfig: Partial<CliConfig> = {};
  if (cliConfigPath !== undefined) {
    const configResult = loadConfig(cliConfigPath);
    if (isErr(configResult)) {
      return err(configResult.error);
    }
    if (isOk(configResult)) {
      fileConfig = configResult.data;
    }
  }

  // Handle duplicate flags by taking the last value (if array)
  const getLastValue = (value: unknown): unknown => Array.isArray(value) ? value[value.length - 1] : value;

  // Determine final values with proper precedence: CLI args > config file > defaults
  const argFormat = getLastValue(args.format);
  const normalizedCliFormat = typeof argFormat === 'string'
    ? argFormat
    : argFormat === true
      ? ''
      : undefined;
  const finalFormat = normalizedCliFormat !== undefined
    ? normalizedCliFormat
    : (fileConfig.format || DEFAULT_CLI_CONFIG.format);
  const argQuiet = getLastValue(args.quiet);
  const normalizedCliQuiet = typeof argQuiet === 'boolean'
    ? argQuiet
    : argQuiet === 'true'
      ? true
      : argQuiet === 'false'
        ? false
        : undefined;
  const finalQuiet = normalizedCliQuiet !== undefined
    ? normalizedCliQuiet
    : (fileConfig.quiet !== undefined ? fileConfig.quiet : DEFAULT_CLI_CONFIG.quiet);
  const argNoColor = getLastValue(args['no-color']);
  const normalizedCliNoColor = typeof argNoColor === 'boolean'
    ? argNoColor
    : argNoColor === 'true'
      ? true
      : argNoColor === 'false'
        ? false
        : undefined;
  const finalNoColor = normalizedCliNoColor !== undefined
    ? normalizedCliNoColor
    : (fileConfig.noColor !== undefined ? fileConfig.noColor : DEFAULT_CLI_CONFIG.noColor);

  // Validate format option
  if (finalFormat && !OUTPUT_FORMATS.includes(finalFormat as OutputFormat)) {
    return err({
      type: 'config',
      message: `Invalid format: ${finalFormat}. Valid options: ${OUTPUT_FORMATS.join(', ')}`
    });
  }

  const parsedConfig: CliParseResult = {
    format: finalFormat as OutputFormat,
    quiet: finalQuiet,
    noColor: finalNoColor,
    ...(cliConfigPath !== undefined ? { configFile: cliConfigPath } : {}),
    showHelp: Boolean(args.help),
    showVersion: Boolean(args.version)
  };

  return ok(parsedConfig);
};

/**
 * Transform stream that formats SwiftLint JSON output into readable formats
 * Modernized with functional programming patterns
 */
export class CompactStream extends Transform {
  public exitCode: number;
  private buffer: Buffer[];
  private config: CliConfig;
  private colors: Colorizer;

  constructor(config: CliConfig) {
    super({ objectMode: false });
    this.exitCode = 0;
    this.buffer = [];
    this.config = config;
    this.colors = getColors(config.noColor);
  }

  override _transform(chunk: Buffer, _encoding: BufferEncoding, cb: () => void): void {
    this.buffer.push(chunk);
    cb();
  }

  /**
   * Parse and validate SwiftLint JSON input with Result pattern
   */
  private parseAndValidateInput(inputString: string): Result<SwiftlintJsonIssue[]> {
    const trimmedInput = inputString.trim();

    // Support default SwiftLint text reporter in pipelines (e.g. `swiftlint . | swizzy`).
    const textReporterIssues = this.parseSwiftlintTextReporter(trimmedInput);
    if (textReporterIssues.length > 0) {
      return ok(textReporterIssues);
    }

    try {
      const parsedJson = JSON.parse(trimmedInput);
      const validationResult = SwiftlintJsonOutputSchema.safeParse(parsedJson);

      if (!validationResult.success) {
        const errorDetails = validationResult.error.issues.map(e =>
          `Path: ${e.path.join('.') || ''} - Message: ${e.message}`
        ).join('; ');
        return err({
          type: 'validation',
          message: `Invalid SwiftLint JSON structure: ${errorDetails}`,
          details: errorDetails
        });
      }

      return ok(validationResult.data);
    } catch (error) {
      return err({
        type: 'parsing',
        message: `Failed to parse SwiftLint JSON input: expected JSON (--reporter json) or default text reporter format. ${error instanceof Error ? error.message : 'Unknown error'}`,
        cause: error instanceof Error ? error : undefined
      } as ProcessingError);
    }
  }

  /**
   * Parse default SwiftLint text reporter lines into issue objects.
   * Example: path/file.swift:12:8: warning: Message text (rule_id)
   */
  private parseSwiftlintTextReporter(input: string): SwiftlintJsonIssue[] {
    const issueLineRegex = /^(.*?):(\d+):(\d+):\s*(warning|error):\s*(.+)$/i;
    const issues: SwiftlintJsonIssue[] = [];

    const lines = stripAnsi(input)
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean);

    for (const line of lines) {
      const [, file, lineNumber, character, severityRaw, messageRaw] = line.match(issueLineRegex) ?? [];
      if (!file || !lineNumber || !character || !severityRaw || !messageRaw) {
        continue;
      }

      const message = messageRaw.trim();

      // Rule id is typically the last parenthesized token in SwiftLint output.
      const ruleMatch = message.match(/\(([^()]+)\)\s*$/);
      const reason = ruleMatch ? message.slice(0, ruleMatch.index).trim() : message;
      const ruleId = ruleMatch?.[1]?.trim() ?? '';

      issues.push({
        file: file.trim(),
        line: Number(lineNumber),
        character: Number(character),
        severity: severityRaw.toLowerCase() === 'error' ? 'Error' : 'Warning',
        reason,
        rule_id: ruleId,
        type: severityRaw.toLowerCase() === 'error' ? 'Error' : 'Warning'
      });
    }

    return issues;
  }

  /**
   * Handle processing errors with improved error management
   */
  private handleProcessingError(error: ProcessingError, cb: (error?: Error | null) => void): void {
    // Only print usage for piped input errors (if not in quiet mode)
    if (process.stdin.isTTY === false &&
        (error.type === 'validation' || error.type === 'parsing')) {
      if (!this.config.quiet) {
        printUsage(this.config.noColor);
      }
      this.exitCode = 1;
      cb(null);
      return;
    }

    // For other error types, pass the error
    cb(new Error(error.message));
  }

  override _flush(cb: (error?: Error | null) => void): void {
    const inputString = Buffer.concat(this.buffer).toString('utf8').trim();

    // Handle empty input (e.g., swiftlint found no files)
    if (inputString === '') {
      this.exitCode = 0;
      cb(null);
      return;
    }

    const parseResult = this.parseAndValidateInput(inputString);
    if (isErr(parseResult)) {
      this.handleProcessingError(parseResult.error, cb);
      return;
    }

    if (isOk(parseResult)) {
      const output = this.processSwiftlintIssues(parseResult.data);
      this.push(output);
      this.exitCode = output === '' ? 0 : 1;
    }
    cb(null);
  }

  /**
   * Group issues by file path using functional approach
   */
  private groupIssuesByFile = (issues: readonly SwiftlintJsonIssue[]): Map<string, SwiftlintJsonIssue[]> =>
    issues.reduce((acc, issue) => {
      const fileIssues = acc.get(issue.file) ?? [];
      acc.set(issue.file, [...fileIssues, issue]);
      return acc;
    }, new Map<string, SwiftlintJsonIssue[]>());

  /**
   * Format a single SwiftLint issue for table display
   */
  private formatIssueForTable = (issue: SwiftlintJsonIssue): string[] => {
    const c = this.colors;
    const messageType = issue.severity === 'Warning'
      ? c.yellow('warning')
      : c.red('error');

    return [
      '',
      issue.line?.toString() ?? '0',
      issue.character?.toString() ?? '0',
      messageType,
      issue.reason.endsWith('.') ? issue.reason.slice(0, -1) : issue.reason,
      c.dim(issue.rule_id ?? '')
    ];
  };

  /**
   * Format issues for a single file into a table string
   */
  private formatFileIssues = (filePath: string, fileIssues: readonly SwiftlintJsonIssue[]): string => {
    const c = this.colors;
    const fileHeader = c.underline(filePath) + '\n';

    const tableContent = table(
      fileIssues.map(this.formatIssueForTable),
      {
        align: [null, 'r', 'l'] as const,
        stringLength: (str: string) => stripAnsi(str).length
      }
    )
      .split('\n')
      .map(el => el.replace(/(\d+)\s+(\d+)/, (_, p1, p2) => c.dim(`${p1}:${p2}`)))
      .join('\n');

    return fileHeader + tableContent + '\n\n';
  };

  /**
   * Format the summary line showing total problem count
   */
  private formatSummary = (total: number): string =>
    total <= 0 ? '' : this.colors.bold(this.colors.red(`✖ ${total} problem${total === 1 ? '' : 's'}\n`));

  /**
   * Process SwiftLint issues and format them into a readable output
   */
  private processSwiftlintIssues(issues: readonly SwiftlintJsonIssue[]): string {
    if (issues.length === 0) {
      return '';
    }

    // Handle different output formats using discriminated union
    switch (this.config.format) {
      case 'json':
        return this.formatAsJson(issues);
      case 'table':
        return this.formatAsTable(issues);
      case 'compact':
      default:
        return this.formatAsCompact(issues);
    }
  }

  private formatAsJson = (issues: readonly SwiftlintJsonIssue[]): string =>
    JSON.stringify(issues, null, 2) + '\n';

  private formatAsTable = (issues: readonly SwiftlintJsonIssue[]): string => {
    const tableData = issues.map(issue => [
      issue.file,
      issue.line?.toString() ?? '0',
      issue.character?.toString() ?? '0',
      issue.severity,
      issue.rule_id ?? '',
      issue.reason.endsWith('.') ? issue.reason.slice(0, -1) : issue.reason
    ]);

    const tableHeaders = ['File', 'Line', 'Col', 'Severity', 'Rule', 'Message'];
    const fullTableData = [tableHeaders, ...tableData];

    return '\n' + table(fullTableData, {
      align: ['l', 'r', 'r', 'l', 'l', 'l'],
      stringLength: (str: string) => stripAnsi(str).length
    }) + `\n\n${this.colors.bold(this.colors.red(`✖ ${issues.length} problem${issues.length === 1 ? '' : 's'}`))}\n`;
  };

  private formatAsCompact = (issues: readonly SwiftlintJsonIssue[]): string => {
    if (issues.length === 0) {
      return '';
    }

    const issuesByFile = this.groupIssuesByFile(issues);
    const sortedFiles = Array.from(issuesByFile.keys()).sort();

    const fileOutputs = sortedFiles.map(filePath => {
      const fileIssues = issuesByFile.get(filePath)!;
      return this.formatFileIssues(filePath, fileIssues);
    });

    return '\n' + fileOutputs.join('') + this.formatSummary(issues.length);
  };
}

/**
 * Run SwiftLint as a child process and pipe its output to the provided stream
 */
const runSwiftlintAndPipe = (stream: CompactStream, config: CliConfig): void => {
  if (!config.quiet) {
    console.error('No input piped. Running `swiftlint lint --reporter json`...');
  }
  const swiftlintProcess = spawn('swiftlint', ['lint', '--reporter', 'json']);

  swiftlintProcess.stdout.pipe(stream);

  swiftlintProcess.stderr.on('data', (data) => {
    if (!config.quiet) {
      console.error(`swiftlint stderr: ${data}`);
    }
  });

  swiftlintProcess.on('close', (code) => {
    if (code !== 0) {
      if (!config.quiet) {
        console.error(`swiftlint process exited with code ${code}`);
      }
      stream.end();
    }
  });

  swiftlintProcess.on('error', (err) => {
    if (!config.quiet) {
      console.error(`Failed to start swiftlint: ${err.message}`);
      console.error('Please ensure swiftlint is installed and in your PATH.');
    }
    stream.end();
  });
};

// Main execution logic
if (require.main === module) {
  const parseResult = parseCliArgs(process.argv.slice(2));

  if (isErr(parseResult)) {
    const colors = getColors(false);
    console.error(colors.red('Error:'), parseResult.error.message);
    console.error(colors.dim('Use --help for usage information.'));
    process.exit(2);
  }

  if (!isOk(parseResult)) {
    process.exit(2);
  }

  const config = parseResult.data;

  // Check for version flag
  if (config.showVersion) {
    // eslint-disable-next-line no-console
    console.log(VERSION);
    process.exit(0);
  }

  // Check for help flag
  if (config.showHelp) {
    printUsage(config.noColor);
    process.exit(0);
  }

  const compactStream = new CompactStream(config);

  // Pipe final output to stdout
  compactStream.pipe(process.stdout);

  // Handle process exit based on stream exit code
  compactStream.on('end', () => {
    process.exit(compactStream.exitCode);
  });

  compactStream.on('error', (err) => {
    if (!config.quiet) {
      console.error('Stream Error:', err);
    }
    process.exit(1);
  });

  if (process.stdin.isTTY) {
    // No input piped, run swiftlint automatically
    runSwiftlintAndPipe(compactStream, config);
  } else {
    // Input is being piped, use stdin
    process.stdin.pipe(compactStream);
  }
}
