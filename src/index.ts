#!/usr/bin/env node

import chalk from 'chalk';
import { Transform } from 'stream';
import table from 'text-table';
import { jsonify } from './swiftlint-jsonify';
import { strip } from 'ansicolor';
import { SwiftlintResult } from './types';

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
      const lines = Buffer.concat(this.buffer).toString();
      const json = jsonify(lines);
      const output = this.processResults(json);
      this.push(output);
      this.exitCode = output === '' ? 0 : 1;
      cb();
    } catch (error) {
      cb(error instanceof Error ? error : new Error(String(error)));
    }
  }

  private processResults(results: SwiftlintResult[]): string {
    let output = '\n';
    let total = 0;

    for (const result of results) {
      if (result.messages.length === 0) continue;

      total += result.messages.length;
      output += chalk.underline(result.filePath) + '\n';

      output += table(
        result.messages.map(message => {
          const messageType = message.type === 'warning' 
            ? chalk.yellow('warning') 
            : chalk.red('error');

          return [
            '',
            message.line || '0',
            message.column || '0',
            messageType,
            message.message.replace(/\.$/, ''),
            chalk.dim(message.ruleId || '')
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

    return total > 0 ? output : '';
  }
}

// At the end of index.ts
if (require.main === module) {
  const { CompactStream } = require('./index');
  const compactStream = new CompactStream();
  process.stdin.pipe(compactStream).pipe(process.stdout);
}