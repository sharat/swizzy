// @flow

function jsonify (rawText: string) {
  var lines = rawText.split('\n')
  if (lines[lines.length - 1] === '') lines.pop()
  var resultMap = {}
  var results = []

  lines.forEach(function (line) {
    var re = /\s*([^:]+):([^:]+):([^:]+): ([^:]+): ([^:]+): (.*?)?$/.exec(line)

    if (!re) return console.error(line)

    var noColums = false

    // Cases like where there are no columns in the string, 
    // just line numbers like length of the line
    if(isNaN(parseInt(re[3]))) {
      re.splice(3, 0, '0')
    }

    var filePath = re[1]
    var result = resultMap[filePath]
    if (!result) {
      result = resultMap[filePath] = {
        filePath: re[1],
        messages: []
      }
      results.push(result)
    }

    result.messages.push({
      line: re[2],
      column: re[3],
      type: re[4],
      ruleId: re[5],
      message: re[6]
    })
  })

  return results
}

module.exports = jsonify
