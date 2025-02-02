import { SwiftlintResult, SwiftlintMessage } from './types';

const LINE_REGEX = /^\s*([^:]+):(\d+)(?::(\d+))?: ([^:]+): ([^:]+): (.*)$/;

export function jsonify(rawText: string): SwiftlintResult[] {
  const lines = rawText.split('\n').filter(line => line.trim());
  const resultsMap = new Map<string, SwiftlintResult>();

  for (const line of lines) {
    const match = LINE_REGEX.exec(line);
    if (!match) {
      console.error('Unparseable line:', line);
      continue;
    }

    const [, filePath, lineNum, column = '0', type, ruleId, message] = match;
    
    if (!resultsMap.has(filePath)) {
      resultsMap.set(filePath, {
        filePath,
        messages: []
      });
    }

    // Add type assertion here
    const messageType = type as 'warning' | 'error';
    
    resultsMap.get(filePath)!.messages.push({
      line: lineNum,
      column,
      type: messageType,
      ruleId,
      message
    });
  }

  return Array.from(resultsMap.values());
}
