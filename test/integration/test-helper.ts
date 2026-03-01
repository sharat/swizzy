import { spawn, ChildProcess } from 'child_process';
import { resolve } from 'path';

/**
 * Configuration for CLI test execution
 */
export interface CliTestConfig {
  args?: string[];
  input?: string;
  timeout?: number;
  expectExit?: number;
}

/**
 * Result from CLI test execution
 */
export interface CliTestResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  duration: number;
  timedOut: boolean;
}

/**
 * Helper class for running integration tests against the swizzy CLI
 */
export class CliTestHelper {
  private readonly cliPath: string;

  constructor(cliPath?: string) {
    this.cliPath = cliPath || resolve(__dirname, '../../dist/index.js');
  }

  /**
   * Execute the CLI with given configuration and return results
   */
  async runCli(config: CliTestConfig = {}): Promise<CliTestResult> {
    const {
      args = [],
      input,
      timeout = 10000,
      expectExit
    } = config;

    const startTime = Date.now();
    let timedOut = false;

    const child = spawn('node', [this.cliPath, ...args], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    const result: Partial<CliTestResult> = {
      stdout: '',
      stderr: '',
      exitCode: null,
      timedOut: false
    };

    // Collect stdout
    child.stdout.on('data', (data) => {
      result.stdout += data.toString();
    });

    // Collect stderr
    child.stderr.on('data', (data) => {
      result.stderr += data.toString();
    });

    // Set up timeout
    const timeoutHandle = setTimeout(() => {
      timedOut = true;
      child.kill('SIGTERM');
    }, timeout);

    // Send input if provided
    if (input !== undefined) {
      child.stdin.write(input);
      child.stdin.end();
    }

    return new Promise((resolve) => {
      child.on('close', (code, signal) => {
        clearTimeout(timeoutHandle);
        const duration = Date.now() - startTime;

        const finalResult: CliTestResult = {
          stdout: result.stdout || '',
          stderr: result.stderr || '',
          exitCode: code,
          duration,
          timedOut
        };

        // Validate expected exit code if specified
        if (expectExit !== undefined && code !== expectExit) {
          const error = new Error(
            `Expected exit code ${expectExit}, got ${code}. ` +
            `stdout: ${finalResult.stdout.slice(0, 200)}... ` +
            `stderr: ${finalResult.stderr.slice(0, 200)}...`
          );
          throw error;
        }

        resolve(finalResult);
      });

      child.on('error', (error) => {
        clearTimeout(timeoutHandle);
        const duration = Date.now() - startTime;

        resolve({
          stdout: result.stdout || '',
          stderr: result.stderr || error.message,
          exitCode: null,
          duration,
          timedOut: false
        });
      });
    });
  }

  /**
   * Run CLI and expect success (exit code 0)
   */
  async runCliSuccess(config: CliTestConfig = {}): Promise<CliTestResult> {
    return this.runCli({ ...config, expectExit: 0 });
  }

  /**
   * Run CLI and expect failure (exit code 1)
   */
  async runCliFailure(config: CliTestConfig = {}): Promise<CliTestResult> {
    return this.runCli({ ...config, expectExit: 1 });
  }

  /**
   * Run CLI and expect configuration error (exit code 2)
   */
  async runCliConfigError(config: CliTestConfig = {}): Promise<CliTestResult> {
    return this.runCli({ ...config, expectExit: 2 });
  }

  /**
   * Create temporary config file for testing
   */
  async createTempConfig(config: object): Promise<string> {
    const fs = await import('fs/promises');
    const path = await import('path');
    const os = await import('os');

    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'swizzy-test-'));
    const configPath = path.join(tempDir, 'swizzy.config.json');

    await fs.writeFile(configPath, JSON.stringify(config, null, 2));
    return configPath;
  }

  /**
   * Clean up temporary files
   */
  async cleanup(tempPath: string): Promise<void> {
    const fs = await import('fs/promises');
    const path = await import('path');

    try {
      if (path.basename(tempPath) === 'swizzy.config.json') {
        // Remove the config file and its directory
        await fs.unlink(tempPath);
        await fs.rmdir(path.dirname(tempPath));
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  }

  /**
   * Measure CLI performance with large input
   */
  async benchmarkCli(input: string, iterations: number = 3): Promise<number[]> {
    const durations: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const result = await this.runCli({ input, timeout: 30000 });
      durations.push(result.duration);
    }

    return durations;
  }

  /**
   * Strip ANSI colors from output for easier testing
   */
  stripColors(text: string): string {
    // Simple ANSI escape sequence removal
    return text.replace(/\x1b\[[0-9;]*m/g, '');
  }

  /**
   * Normalize line endings for cross-platform compatibility
   */
  normalizeLineEndings(text: string): string {
    return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  }

  /**
   * Extract exit code from process result, handling null case
   */
  getExitCode(result: CliTestResult): number {
    return result.exitCode ?? -1;
  }

  /**
   * Check if output contains specific patterns (case-insensitive)
   */
  outputContains(result: CliTestResult, pattern: string | RegExp): boolean {
    const output = result.stdout + result.stderr;
    if (typeof pattern === 'string') {
      return output.toLowerCase().includes(pattern.toLowerCase());
    }
    return pattern.test(output);
  }

  /**
   * Count number of lines in output
   */
  countOutputLines(result: CliTestResult): number {
    return result.stdout.split('\n').filter(line => line.length > 0).length;
  }
}

/**
 * Common test utilities and constants
 */
export const TestUtils = {
  /**
   * Default timeout for CLI tests (10 seconds)
   */
  DEFAULT_TIMEOUT: 10000,

  /**
   * Performance test timeout (30 seconds)
   */
  PERFORMANCE_TIMEOUT: 30000,

  /**
   * Expected formats
   */
  FORMATS: ['compact', 'json', 'table'] as const,

  /**
   * Common CLI flags
   */
  FLAGS: {
    HELP: ['--help', '-h'],
    VERSION: ['--version', '-v'],
    QUIET: ['--quiet', '-q'],
    NO_COLOR: ['--no-color'],
    FORMAT: ['--format', '-f'],
    CONFIG: ['--config', '-c']
  },

  /**
   * Expected exit codes
   */
  EXIT_CODES: {
    SUCCESS: 0,
    ISSUES_FOUND: 1,
    CONFIG_ERROR: 2
  }
};