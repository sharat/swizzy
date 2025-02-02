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
