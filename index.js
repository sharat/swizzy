// @flow

var jsonify = require('./swiftlint-jsonify')
var chalk = require('chalk')
var table = require('text-table')
var stream = require('readable-stream')
var inherits = require('inherits')

inherits(CompactStream, stream.Transform)

function CompactStream () {
  if (!(this instanceof CompactStream)) {
    return new CompactStream()
  }
  stream.Transform.call(this)

  this.exitCode = 0
  this._buffer = []
}

CompactStream.prototype._transform = function (chunk, encoding, cb) {
  this._buffer.push(chunk)
  cb(null)
}

CompactStream.prototype._flush = function (cb) {
  var lines = Buffer.concat(this._buffer).toString()
  var json = jsonify(lines)
  var output = processResults(json)
  this.push(output)

  this.exitCode = output === '' ? 0 : 1
  cb(null)
}

function pluralize (word, count) {
  return (count === 1 ? word : word + 's')
}

function processResults (results) {
  var output = '\n'
  var total = 0

  results.forEach(function (result) {
    var messages = result.messages

    if (messages.length === 0) {
      return
    }

    total += messages.length
    output += chalk.underline(result.filePath) + '\n'

    output += table(
      messages.map(function (message) {
        var messageType
        if (message.type === 'warning') {
          messageType = chalk.yellow('warning')
        } else {
          messageType = chalk.red('error')
        }

        return [
          '',
          message.line || 0,
          message.column || 0,
          messageType,
          message.message.replace(/\.$/, ''),
          chalk.dim(message.ruleId || '')
        ]
      }),
      {
        align: ['', 'r', 'l'],
        stringLength: function (str) {
          return chalk.stripColor(str).length
        }
      }
    ).split('\n').map(function (el) {
      return el.replace(/(\d+)\s+(\d+)/, function (m, p1, p2) {
        return chalk.dim(p1 + ':' + p2)
      })
    }).join('\n') + '\n\n'
  })

  if (total > 0) {
    output += chalk.red.bold([
      '\u2716 ', total, pluralize(' problem', total), '\n'
    ].join(''))
  }

  return total > 0 ? output : ''
}

module.exports = CompactStream