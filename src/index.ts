#!/usr/bin/env node

import chalk from 'chalk';
import { Transform } from 'stream';
import table from 'text-table';
import { strip } from 'ansicolor';
import { SwiftlintJsonIssue } from './types';

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
    try {
      const inputString = Buffer.concat(this.buffer).toString();
      const issues: SwiftlintJsonIssue[] = JSON.parse(inputString);
      const output = this.processSwiftlintIssues(issues);
      this.push(output);
      this.exitCode = output === '' ? 0 : 1;
      cb();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      cb(new Error(`Failed to parse SwiftLint JSON output: ${errorMessage}`));
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
    let total = issues.length;

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

// At the end of index.ts
if (require.main === module) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { CompactStream } = require('./index');
  const compactStream = new CompactStream();
  process.stdin.pipe(compactStream).pipe(process.stdout);
}