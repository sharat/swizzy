#!/usr/bin/env node

/**
 * Smoke test to verify integration test infrastructure is working
 * This is a quick verification script that can be run independently
 */

const { spawn } = require('child_process');
const { resolve } = require('path');

const CLI_PATH = resolve(__dirname, '../../dist/index.js');
const TEST_INPUT = JSON.stringify([
  {
    character: 10,
    file: '/test/file.swift',
    line: 15,
    reason: 'Test warning message',
    rule_id: 'test_rule',
    severity: 'Warning',
    type: 'Test'
  }
]);

console.log('🧪 Running smoke test for swizzy integration tests...\n');

async function runTest(description, args = [], input = TEST_INPUT) {
  return new Promise((resolve) => {
    console.log(`Testing: ${description}`);

    const child = spawn('node', [CLI_PATH, ...args], { stdio: 'pipe' });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => stdout += data.toString());
    child.stderr.on('data', (data) => stderr += data.toString());

    if (input) {
      child.stdin.write(input);
    }
    child.stdin.end();

    const timeout = setTimeout(() => {
      child.kill();
      resolve({ timedOut: true });
    }, 5000);

    child.on('close', (code) => {
      clearTimeout(timeout);
      resolve({ code, stdout, stderr, timedOut: false });
    });
  });
}

async function main() {
  const tests = [
    {
      description: 'Version flag',
      args: ['--version'],
      input: null,
      expectCode: 0
    },
    {
      description: 'Help flag',
      args: ['--help'],
      input: null,
      expectCode: 0
    },
    {
      description: 'Compact format (default)',
      args: [],
      expectCode: 1
    },
    {
      description: 'JSON format',
      args: ['--format', 'json'],
      expectCode: 1
    },
    {
      description: 'Table format',
      args: ['--format', 'table'],
      expectCode: 1
    },
    {
      description: 'Empty input',
      args: [],
      input: '[]',
      expectCode: 0
    }
  ];

  let passed = 0;
  let total = tests.length;

  for (const test of tests) {
    const result = await runTest(test.description, test.args, test.input);

    if (result.timedOut) {
      console.log(`❌ TIMEOUT\n`);
      continue;
    }

    const success = result.code === test.expectCode;
    console.log(`${success ? '✅' : '❌'} ${success ? 'PASS' : 'FAIL'} (exit code: ${result.code})`);

    if (test.description === 'Version flag' && success) {
      console.log(`   Version: ${result.stdout.trim()}`);
    }

    if (test.description === 'JSON format' && success) {
      try {
        const parsed = JSON.parse(result.stdout);
        console.log(`   JSON output: ${parsed.length} issues`);
      } catch (e) {
        console.log(`   JSON parse error: ${e.message}`);
      }
    }

    if (!success) {
      console.log(`   Expected exit code: ${test.expectCode}, got: ${result.code}`);
      if (result.stderr) {
        console.log(`   stderr: ${result.stderr.slice(0, 100)}...`);
      }
    }

    if (success) passed++;
    console.log('');
  }

  console.log(`\n📊 Test Results: ${passed}/${total} passed`);

  if (passed === total) {
    console.log('🎉 All smoke tests passed! Integration test infrastructure is ready.');
    process.exit(0);
  } else {
    console.log('❌ Some tests failed. Check the output above for details.');
    process.exit(1);
  }
}

main().catch(console.error);