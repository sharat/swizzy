#!/usr/bin/env node

const CompactStream = require('../')
const minimist = require('minimist')

const argv = minimist(process.argv.slice(2), {
  boolean: [
    'stdin'
  ]
})

if (!process.stdin.isTTY || argv._[0] === '-' || argv.stdin) {
  const swizzy = new CompactStream()

  // Set the process exit code based on whether pretty found errors
  process.on('exit', function (code) {
    if (code === 0 && swizzy.exitCode !== 0) {
      process.exitCode = swizzy.exitCode
    }
  })

  process.stdin.pipe(swizzy).pipe(process.stdout)
} else {
  console.error(`
snazzy: ('brew install swiftlint') then run 'swiftlint lint | swiftlintpretty' instead.
  `)
  process.exitCode = 1
}
