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
