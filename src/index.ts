#!/usr/bin/env node

import chalk from 'chalk';
import { Transform } from 'stream';
import table from 'text-table';
import { strip } from 'ansicolor';
import { SwiftlintJsonIssue, SwiftlintJsonOutputSchema } from './types';
import { spawn } from 'child_process';
import minimist from 'minimist';
import { z } from 'zod';

// Read package.json to get the version
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pkg = require('../package.json');
const VERSION = pkg.version;

// --- Usage Function ---
function printUsage(): void {
  // eslint-disable-next-line no-console
  console.log(`
Usage: swizzy [options]

Formats SwiftLint JSON output into a compact, readable format.

Options:
  --help, -h     Show this help message.
  --version, -v  Show version number.

Examples:
  # Pipe swiftlint output (requires --reporter json)
  swiftlint lint --reporter json | npx swizzy

  # Run swiftlint automatically (if swiftlint is in PATH)
  npx swizzy
`);
}

export class CompactStream extends Transform {
  private exitCode: number;
  private buffer: Buffer[];

  constructor() {
    super({ objectMode: false });
    this.exitCode = 0;
    this.buffer = [];
  }

  _transform(chunk: Buffer, encoding: BufferEncoding, cb: () => void): void {
    this.buffer.push(chunk);
    cb();
  }

  _flush(cb: (error?: Error | null) => void): void {
    const inputString = Buffer.concat(this.buffer).toString().trim();

    // Handle empty input (e.g., swiftlint found no files)
    if (inputString === '') {
      this.exitCode = 0; // No issues found, exit cleanly
      cb(); // Signal flush is done
      return;
    }

    try {
      const parsedJson = JSON.parse(inputString);

      const validationResult = SwiftlintJsonOutputSchema.safeParse(parsedJson);

      if (!validationResult.success) {
        const errorDetails = validationResult.error.issues.map((e: z.ZodIssue) =>
          `Path: ${e.path.join('.') || ''} - Message: ${e.message}`
        ).join('; ');
        throw new Error(`Invalid SwiftLint JSON structure: ${errorDetails}`);
      }

      const issues: SwiftlintJsonIssue[] = validationResult.data;
      const output = this.processSwiftlintIssues(issues);
      this.push(output);
      this.exitCode = output === '' ? 0 : 1;
      cb();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (!process.stdin.isTTY && // Only print usage for piped input errors
          (errorMessage.startsWith('Invalid SwiftLint JSON structure:') ||
           errorMessage.startsWith('Failed to parse SwiftLint JSON input:')))
      {
        printUsage();
        this.exitCode = 1; // Set exit code for error
        cb(null); // Signal flush is done, but with an error state
        return; // Don't proceed further in the catch block
      }
      // For direct execution errors or other error types, pass the error
      if (errorMessage.startsWith('Invalid SwiftLint JSON structure:')) {
        cb(error instanceof Error ? error : new Error(errorMessage));
      } else {
        cb(new Error(`Failed to parse SwiftLint JSON input: ${errorMessage}`));
      }
    }
  }

  private processSwiftlintIssues(issues: SwiftlintJsonIssue[]): string {
    if (issues.length === 0) {
      return '';
    }

    const issuesByFile = new Map<string, SwiftlintJsonIssue[]>();
    for (const issue of issues) {
      const fileIssues = issuesByFile.get(issue.file) || [];
      fileIssues.push(issue);
      issuesByFile.set(issue.file, fileIssues);
    }

    let output = '\n';
    const total = issues.length;

    const sortedFiles = Array.from(issuesByFile.keys()).sort();

    for (const filePath of sortedFiles) {
      const fileIssues = issuesByFile.get(filePath)!;
      output += chalk.underline(filePath) + '\n';

      output += table(
        fileIssues.map(issue => {
          const messageType = issue.severity === 'Warning'
            ? chalk.yellow('warning')
            : chalk.red('error');

          return [
            '',
            issue.line?.toString() ?? '0',
            issue.character?.toString() ?? '0',
            messageType,
            issue.reason.replace(/\.$/, ''),
            chalk.dim(issue.rule_id ?? '')
          ];
        }),
        {
          align: [null, 'r', 'l'] as const,
          stringLength: (str: string) => strip(str).length
        }
      )
        .split('\n')
        .map(el => el.replace(/(\d+)\s+(\d+)/, (_, p1, p2) => chalk.dim(`${p1}:${p2}`)))
        .join('\n') + '\n\n';
    }

    if (total > 0) {
      output += chalk.red.bold(`\u2716 ${total} problem${total === 1 ? '' : 's'}\n`);
    }

    return output;
  }
}

// Helper function to run swiftlint and pipe its output
function runSwiftlintAndPipe(stream: CompactStream): void {
  console.error('No input piped. Running `swiftlint lint --reporter json`...');
  const swiftlintProcess = spawn('swiftlint', ['lint', '--reporter', 'json']);

  swiftlintProcess.stdout.pipe(stream); // Pipe swiftlint output to our stream

  // Log swiftlint errors to stderr
  swiftlintProcess.stderr.on('data', (data) => {
    console.error(`swiftlint stderr: ${data}`);
  });

  swiftlintProcess.on('close', (code) => {
    if (code !== 0) {
      console.error(`swiftlint process exited with code ${code}`);
      // Ensure the stream ends even if swiftlint fails early
      stream.end();
    }
  });

  swiftlintProcess.on('error', (err) => {
    console.error(`Failed to start swiftlint: ${err.message}`);
    console.error('Please ensure swiftlint is installed and in your PATH.');
    // Ensure the stream ends if swiftlint fails to start
    stream.end();
  });
}

// Main execution logic
if (require.main === module) {
  // Parse command line arguments
  const args = minimist(process.argv.slice(2));

  // Check for version flag
  if (args.version || args.v) {
    // eslint-disable-next-line no-console
    console.log(VERSION);
    process.exit(0);
  }

  // Check for help flag
  if (args.help || args.h) {
    printUsage();
    process.exit(0); // Exit cleanly after showing help
  }

  const compactStream = new CompactStream();

  // Pipe final output to stdout
  compactStream.pipe(process.stdout);

  // Handle process exit based on stream exit code
  compactStream.on('end', () => {
    // Access the exitCode property set in _flush
    // Need type assertion as Transform doesn't have exitCode by default
    const exitCode = (compactStream as unknown as { exitCode: number }).exitCode ?? 0;
    process.exit(exitCode);
  });
  compactStream.on('error', (err) => {
    console.error('Stream Error:', err);
    process.exit(1);
  });

  if (process.stdin.isTTY) {
    // No input piped, run swiftlint automatically
    runSwiftlintAndPipe(compactStream);
  } else {
    // Input is being piped, use stdin
    process.stdin.pipe(compactStream);
  }
}