const convertHrtime = require(`convert-hrtime`)

module.exports.elapsedSeconds = startTime => `${convertHrtime(process.hrtime(startTime)).seconds.toFixed(3)}s`
