import { z } from 'zod';

export interface SwiftlintMessage {
  line: string;
  column: string;
  type: 'warning' | 'error';
  ruleId: string;
  message: string;
}

export interface SwiftlintResult {
  filePath: string;
  messages: SwiftlintMessage[];
}

// Represents the structure of a single issue from `swiftlint lint --reporter json`
export interface SwiftlintJsonIssue {
  character: number | null; // Can be null
  file: string;
  line: number;
  reason: string;
  rule_id: string;
  severity: 'Warning' | 'Error'; // Use specific literals if known
  type: string; // Renamed from 'type' in JSON via serde in Rust example, direct mapping here
}

// Zod schema for validating a single SwiftLint issue from JSON
export const SwiftlintJsonIssueSchema = z.object({
  character: z.number().nullable(), // Matches number | null
  file: z.string(),
  line: z.number(),
  reason: z.string(),
  rule_id: z.string(),
  severity: z.enum(['Warning', 'Error']), // Matches 'Warning' | 'Error'
  type: z.string(),
});

// Zod schema for validating the entire array of issues
export const SwiftlintJsonOutputSchema = z.array(SwiftlintJsonIssueSchema);

// Keep the TypeScript interface for type inference if preferred,
// or derive it from the schema: export type SwiftlintJsonIssue = z.infer<typeof SwiftlintJsonIssueSchema>;
