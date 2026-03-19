import { z } from 'zod';

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
 * Zod schema for validating a single SwiftLint issue from JSON
 * Ensures that input data matches the expected SwiftlintJsonIssue structure
 */
export const SwiftlintJsonIssueSchema = z.object({
  character: z.number().nullable(),
  file: z.string(),
  line: z.number(),
  reason: z.string(),
  // eslint-disable-next-line camelcase
  rule_id: z.string(),
  severity: z.enum(['Warning', 'Error'] as const),
  type: z.string()
}) satisfies z.ZodType<SwiftlintJsonIssue>;

/**
 * Zod schema for validating the entire array of SwiftLint issues
 * Used to validate the complete JSON output from SwiftLint
 */
export const SwiftlintJsonOutputSchema = z.array(SwiftlintJsonIssueSchema);

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