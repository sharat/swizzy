/**
 * Union type for SwiftLint issue severity levels
 * Using discriminated union for better type safety
 */
export type Severity = 'Warning' | 'Error';

/**
 * Valid output format options
 */
export type OutputFormat = 'compact' | 'json' | 'table';

/**
 * Represents the structure of a single issue from `swiftlint lint --reporter json`
 * This interface defines the expected format of SwiftLint issues in JSON output
 */
export interface SwiftlintJsonIssue {
  /** Character position where the issue occurs, can be null if not available */
  readonly character: number | null;
  /** Path to the file containing the issue */
  readonly file: string;
  /** Line number where the issue occurs */
  readonly line: number;
  /** Human-readable description of the issue */
  readonly reason: string;
  /** Identifier of the SwiftLint rule that triggered this issue */
  readonly rule_id: string;
  /** Severity level of the issue */
  readonly severity: Severity;
  /** Type classification of the issue */
  readonly type: string;
}

/**
 * CLI Configuration with strict typing
 */
export interface CliConfig {
  readonly format: OutputFormat;
  readonly quiet: boolean;
  readonly noColor: boolean;
  readonly configFile?: string;
}

/**
 * Result type for CLI argument parsing
 */
export type CliParseResult = CliConfig & {
  readonly showHelp?: boolean;
  readonly showVersion?: boolean;
};

/**
 * Error types for better error handling
 */
export type ProcessingError =
  | { readonly type: 'validation'; readonly message: string; readonly details?: string }
  | { readonly type: 'parsing'; readonly message: string; readonly cause?: Error }
  | { readonly type: 'config'; readonly message: string; readonly path?: string }
  | { readonly type: 'runtime'; readonly message: string; readonly code?: number };

/**
 * Type-safe result wrapper for operations that can fail
 */
export type Result<T, E = ProcessingError> =
  | { readonly success: true; readonly data: T }
  | { readonly success: false; readonly error: E };

/**
 * Helper to create success result
 */
export const ok = <T>(data: T): Result<T, never> => ({ success: true, data });

/**
 * Helper to create error result
 */
export const err = <E>(error: E): Result<never, E> => ({ success: false, error });

/**
 * Type guard for checking if result is successful
 */
export const isOk = <T>(result: Result<T>): result is { success: true; data: T } =>
  result.success;

/**
 * Type guard for checking if result is an error
 */
export const isErr = <T, E>(result: Result<T, E>): result is { success: false; error: E } =>
  !result.success;

/**
 * Type guard for validating a single SwiftLint issue from JSON
 * Ensures that input data matches the expected SwiftlintJsonIssue structure
 */
export const validateSwiftlintJsonIssue = (val: unknown): val is SwiftlintJsonIssue => {
  if (typeof val !== 'object' || val === null) return false;
  const obj = val as Record<string, unknown>;
  return (
    (typeof obj.character === 'number' || obj.character === null) &&
    typeof obj.file === 'string' &&
    typeof obj.line === 'number' &&
    typeof obj.reason === 'string' &&
    typeof obj.rule_id === 'string' &&
    (obj.severity === 'Warning' || obj.severity === 'Error') &&
    typeof obj.type === 'string'
  );
};

export interface SchemaIssue {
  readonly path: string[];
  readonly message: string;
  readonly code?: string;
}

/**
 * Schema object matching safeParse interface for validating a single SwiftLint issue
 */
export const SwiftlintJsonIssueSchema = {
  safeParse: (data: unknown): { success: true; data: SwiftlintJsonIssue } | { success: false; error: { issues: SchemaIssue[] } } => {
    if (typeof data !== 'object' || data === null) {
      return {
        success: false,
        error: { issues: [{ path: [], message: 'Input must be an object', code: 'invalid_type' }] }
      };
    }
    const obj = data as Record<string, unknown>;
    const issues: SchemaIssue[] = [];

    if (obj.character !== null && typeof obj.character !== 'number') {
      issues.push({ path: ['character'], message: 'character must be a number or null', code: 'invalid_type' });
    }
    if (typeof obj.file !== 'string') {
      issues.push({ path: ['file'], message: 'file must be a string', code: 'invalid_type' });
    }
    if (typeof obj.line !== 'number') {
      issues.push({ path: ['line'], message: 'line must be a number', code: 'invalid_type' });
    }
    if (typeof obj.reason !== 'string') {
      issues.push({ path: ['reason'], message: 'reason must be a string', code: 'invalid_type' });
    }
    if (typeof obj.rule_id !== 'string') {
      issues.push({ path: ['rule_id'], message: 'rule_id must be a string', code: 'invalid_type' });
    }
    if (obj.severity !== 'Warning' && obj.severity !== 'Error') {
      issues.push({ path: ['severity'], message: 'severity must be Warning or Error', code: 'invalid_enum_value' });
    }
    if (typeof obj.type !== 'string') {
      issues.push({ path: ['type'], message: 'type must be a string', code: 'invalid_type' });
    }

    if (issues.length > 0) {
      return { success: false, error: { issues } };
    }
    return { success: true, data: data as SwiftlintJsonIssue };
  }
};

/**
 * Native schema validator object matching safeParse interface for validating array of SwiftLint issues
 */
export const SwiftlintJsonOutputSchema = {
  safeParse: (data: unknown): { success: true; data: SwiftlintJsonIssue[] } | { success: false; error: { issues: SchemaIssue[] } } => {
    if (!Array.isArray(data)) {
      return {
        success: false,
        error: { issues: [{ path: [], message: 'Expected array of issues', code: 'invalid_type' }] }
      };
    }
    const issues: SchemaIssue[] = [];
    for (let i = 0; i < data.length; i++) {
      const issueResult = SwiftlintJsonIssueSchema.safeParse(data[i]);
      if (!issueResult.success) {
        for (const subIssue of issueResult.error.issues) {
          issues.push({
            path: [String(i), ...subIssue.path],
            message: subIssue.message,
            ...(subIssue.code !== undefined ? { code: subIssue.code } : {})
          });
        }
      }
    }
    if (issues.length > 0) {
      return { success: false, error: { issues } };
    }
    return { success: true, data: data as SwiftlintJsonIssue[] };
  }
};

/**
 * Default CLI configuration using const assertion for immutability
 */
export const DEFAULT_CLI_CONFIG = {
  format: 'compact',
  quiet: false,
  noColor: false
} as const satisfies CliConfig;

/**
 * Valid format options as const assertion for better type inference
 */
export const OUTPUT_FORMATS = ['compact', 'json', 'table'] as const;