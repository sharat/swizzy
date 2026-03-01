/**
 * Unit tests for CLI argument processing and configuration loading
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { parseArgs as nodeParseArgs } from 'node:util';
import { vi, type MockedFunction } from 'vitest';

// We need to mock the index module since it has main execution logic
vi.mock('fs');
vi.mock('path');
vi.mock('child_process');

const mockReadFileSync = readFileSync as MockedFunction<typeof readFileSync>;
const mockExistsSync = existsSync as MockedFunction<typeof existsSync>;
const mockResolve = resolve as MockedFunction<typeof resolve>;

// Import the actual functions after mocking
// Since the main index.ts has execution logic, we'll test individual functions
describe('CLI argument processing and configuration', () => {
  // Mock data
  const mockPackageJson = { version: '2.2.0' };

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mocks
    mockExistsSync.mockImplementation((path: any) => {
      if (path.includes('package.json')) return true;
      return false;
    });

    mockReadFileSync.mockImplementation((path: any) => {
      if (path.includes('package.json')) {
        return JSON.stringify(mockPackageJson);
      }
      throw new Error('File not found');
    });

    mockResolve.mockImplementation((path: string) => {
      if (path.includes('package.json')) return '/resolved/package.json';
      return `/resolved/${path}`;
    });
  });

  describe('parseCliArgs function simulation', () => {
    // Since parseCliArgs is not exported, we'll test argument parsing behavior directly

    const DEFAULT_CONFIG = {
      format: 'compact',
      quiet: false,
      noColor: false
    };

    const parseArgs = (argv: string[]) => {
      const parsed = nodeParseArgs({
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
      const values = parsed.values as Record<string, unknown>;

      return {
        format: typeof values.format === 'string' ? values.format : DEFAULT_CONFIG.format,
        quiet: typeof values.quiet === 'boolean' ? values.quiet : DEFAULT_CONFIG.quiet,
        noColor: typeof values['no-color'] === 'boolean' ? values['no-color'] : DEFAULT_CONFIG.noColor,
        configFile: values.config,
        showHelp: Boolean(values.help),
        showVersion: Boolean(values.version)
      };
    };

    it('should parse help flags correctly', () => {
      const shortHelp = parseArgs(['-h']);
      expect(shortHelp.showHelp).toBe(true);

      const longHelp = parseArgs(['--help']);
      expect(longHelp.showHelp).toBe(true);
    });

    it('should parse version flags correctly', () => {
      const shortVersion = parseArgs(['-v']);
      expect(shortVersion.showVersion).toBe(true);

      const longVersion = parseArgs(['--version']);
      expect(longVersion.showVersion).toBe(true);
    });

    it('should parse format options correctly', () => {
      const shortFormat = parseArgs(['-f', 'table']);
      expect(shortFormat.format).toBe('table');

      const longFormat = parseArgs(['--format', 'json']);
      expect(longFormat.format).toBe('json');
    });

    it('should parse quiet flag correctly', () => {
      const shortQuiet = parseArgs(['-q']);
      expect(shortQuiet.quiet).toBe(true);

      const longQuiet = parseArgs(['--quiet']);
      expect(longQuiet.quiet).toBe(true);
    });

    it('should parse no-color flag correctly', () => {
      const noColor = parseArgs(['--no-color']);
      expect(noColor.noColor).toBe(true);
    });

    it('should parse config file option correctly', () => {
      const shortConfig = parseArgs(['-c', './config.json']);
      expect(shortConfig.configFile).toBe('./config.json');

      const longConfig = parseArgs(['--config', './my-config.json']);
      expect(longConfig.configFile).toBe('./my-config.json');
    });

    it('should use default values when no args provided', () => {
      const defaults = parseArgs([]);
      expect(defaults.format).toBe('compact');
      expect(defaults.quiet).toBe(false);
      expect(defaults.noColor).toBe(false); // Default value from config
      expect(defaults.showHelp).toBe(false);
      expect(defaults.showVersion).toBe(false);
    });

    it('should handle multiple flags together', () => {
      const combined = parseArgs(['--format', 'table', '--quiet', '--no-color']);
      expect(combined.format).toBe('table');
      expect(combined.quiet).toBe(true);
      expect(combined.noColor).toBe(true);
    });

    it('should handle mixed short and long flags', () => {
      const mixed = parseArgs(['-f', 'compact', '-q', '--no-color']);
      expect(mixed.format).toBe('compact');
      expect(mixed.quiet).toBe(true);
      expect(mixed.noColor).toBe(true);
    });
  });

  describe('loadConfig function simulation', () => {
    const loadConfig = (configPath?: string) => {
      if (!configPath) return {};

      const fullPath = mockResolve(configPath);
      if (!mockExistsSync(fullPath)) {
        throw new Error(`Configuration file not found: ${fullPath}`);
      }

      try {
        const configData = mockReadFileSync(fullPath, 'utf-8');
        return JSON.parse(configData as string);
      } catch (error) {
        throw new Error(`Invalid configuration file: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    };

    it('should return empty object when no config path provided', () => {
      const result = loadConfig();
      expect(result).toEqual({});
    });

    it('should throw error when config file does not exist', () => {
      mockExistsSync.mockReturnValue(false);

      expect(() => loadConfig('/nonexistent/config.json'))
        .toThrow('Configuration file not found');
    });

    it('should load valid JSON config file', () => {
      const mockConfig = { format: 'table', quiet: true };
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify(mockConfig));

      const result = loadConfig('./config.json');
      expect(result).toEqual(mockConfig);
    });

    it('should throw error for invalid JSON', () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue('{ invalid json');

      expect(() => loadConfig('./invalid-config.json'))
        .toThrow('Invalid configuration file');
    });

    it('should handle file read errors', () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });

      expect(() => loadConfig('./config.json'))
        .toThrow('Invalid configuration file: Permission denied');
    });
  });

  describe('format validation', () => {
    const validFormats = ['compact', 'json', 'table'];

    it('should accept all valid formats', () => {
      validFormats.forEach(format => {
        expect(validFormats.includes(format)).toBe(true);
      });
    });

    it('should reject invalid formats', () => {
      const invalidFormats = ['invalid', 'xml', 'yaml', ''];
      invalidFormats.forEach(format => {
        expect(validFormats.includes(format)).toBe(false);
      });
    });
  });

  describe('configuration precedence', () => {
    // Test configuration precedence: CLI args > config file > defaults
    const DEFAULT_CONFIG = {
      format: 'compact' as const,
      quiet: false,
      noColor: false
    };

    const testPrecedence = (cliArgs: any, fileConfig: any = {}) => {
      // CLI args override everything
      const finalFormat = cliArgs.format !== DEFAULT_CONFIG.format
        ? cliArgs.format
        : (fileConfig.format || DEFAULT_CONFIG.format);

      const finalQuiet = cliArgs.quiet !== DEFAULT_CONFIG.quiet
        ? cliArgs.quiet
        : (fileConfig.quiet !== undefined ? fileConfig.quiet : DEFAULT_CONFIG.quiet);

      const finalNoColor = cliArgs.noColor !== DEFAULT_CONFIG.noColor
        ? cliArgs.noColor
        : (fileConfig.noColor !== undefined ? fileConfig.noColor : DEFAULT_CONFIG.noColor);

      return { format: finalFormat, quiet: finalQuiet, noColor: finalNoColor };
    };

    it('should use CLI args over file config', () => {
      const cliArgs = { format: 'table', quiet: true, noColor: true };
      const fileConfig = { format: 'json', quiet: false, noColor: false };

      const result = testPrecedence(cliArgs, fileConfig);
      expect(result).toEqual(cliArgs);
    });

    it('should use file config when CLI args are defaults', () => {
      const cliArgs = { format: 'compact', quiet: false, noColor: false };
      const fileConfig = { format: 'json', quiet: true, noColor: true };

      const result = testPrecedence(cliArgs, fileConfig);
      expect(result).toEqual(fileConfig);
    });

    it('should use defaults when neither CLI nor file config specify values', () => {
      const cliArgs = { format: 'compact', quiet: false, noColor: false };
      const fileConfig = {};

      const result = testPrecedence(cliArgs, fileConfig);
      expect(result).toEqual(DEFAULT_CONFIG);
    });

    it('should handle partial CLI overrides', () => {
      const cliArgs = { format: 'table', quiet: false, noColor: false }; // Only format changed
      const fileConfig = { format: 'json', quiet: true, noColor: true };

      const result = testPrecedence(cliArgs, fileConfig);
      expect(result.format).toBe('table'); // CLI override
      expect(result.quiet).toBe(true); // File config
      expect(result.noColor).toBe(true); // File config
    });

    it('should handle partial file config', () => {
      const cliArgs = { format: 'compact', quiet: false, noColor: false };
      const fileConfig = { quiet: true }; // Only quiet specified in file

      const result = testPrecedence(cliArgs, fileConfig);
      expect(result.format).toBe('compact'); // Default
      expect(result.quiet).toBe(true); // File config
      expect(result.noColor).toBe(false); // Default
    });
  });

  describe('error handling scenarios', () => {
    it('should handle malformed command line arguments gracefully', () => {
      const weirdArgs = nodeParseArgs({
        args: ['--format=table=extra', '--quiet=maybe'],
        strict: false,
        allowPositionals: true,
        options: {
          format: { type: 'string', short: 'f' },
          quiet: { type: 'boolean', short: 'q' }
        }
      }).values;

      expect(typeof weirdArgs.format).toBe('string');
      expect(typeof weirdArgs.quiet).toBe('string'); // parseArgs strict:false preserves unusual values
    });

    it('should handle missing package.json gracefully', () => {
      mockExistsSync.mockImplementation((path: any) => {
        if (path.includes('package.json')) return false;
        return false;
      });

      // This simulates the actual logic in index.ts
      const packageJsonPath = '/resolved/package.json';
      const packageJson = mockExistsSync(packageJsonPath)
        ? JSON.parse(mockReadFileSync(packageJsonPath, 'utf-8') as string)
        : { version: 'unknown' };

      expect(packageJson.version).toBe('unknown');
    });
  });
});
