const convertHrtime = require(`convert-hrtime`)

// outputs gatsby's style elapsed seconds
module.exports.elapsedSeconds = startTime => `${convertHrtime(process.hrtime(startTime)).seconds.toFixed(3)}s`
