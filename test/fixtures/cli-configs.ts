/**
 * Test fixtures for CLI configuration testing
 */

export const validConfigs = {
  defaultConfig: {
    format: 'compact',
    quiet: false,
    noColor: false
  },

  compactFormat: {
    format: 'compact',
    quiet: true,
    noColor: true
  },

  tableFormat: {
    format: 'table',
    quiet: false,
    noColor: false
  },

  jsonFormat: {
    format: 'json',
    quiet: true,
    noColor: true
  }
};

export const invalidConfigs = {
  invalidFormat: {
    format: 'invalid-format'
  },

  wrongTypes: {
    format: 123,
    quiet: 'not-boolean',
    noColor: []
  }
};

// CLI argument test cases
export const cliArguments = {
  helpShort: ['-h'],
  helpLong: ['--help'],
  versionShort: ['-v'],
  versionLong: ['--version'],
  formatShort: ['-f', 'table'],
  formatLong: ['--format', 'json'],
  quietShort: ['-q'],
  quietLong: ['--quiet'],
  noColor: ['--no-color'],
  configShort: ['-c', './test-config.json'],
  configLong: ['--config', './test-config.json'],
  combined: ['--format', 'table', '--quiet', '--no-color'],
  invalidFormat: ['--format', 'invalid'],
  mixedValid: ['-f', 'compact', '-q', '--no-color']
};

export const configFileContents = {
  valid: {
    format: 'table',
    quiet: true,
    noColor: false
  },

  invalidJson: '{ invalid json content',

  validButWrongSchema: {
    unknownOption: 'value',
    format: 'invalid-format'
  }
};