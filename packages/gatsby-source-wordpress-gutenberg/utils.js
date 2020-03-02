const convertHrtime = require(`convert-hrtime`)
const { pascalize } = require(`humps`)

// outputs gatsby's style elapsed seconds
module.exports.elapsedSeconds = startTime => `${convertHrtime(process.hrtime(startTime)).seconds.toFixed(3)}s`

// converts wp block name to graphql type name
module.exports.typenameFromBlockName = blockName => {
  const split = blockName.split(`/`)
  return `${split.map(pascalize).join(``)}GutenbergBlock`
}
