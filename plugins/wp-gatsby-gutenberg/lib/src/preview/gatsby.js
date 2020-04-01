import { getSaveContent } from "@wordpress/blocks"
import { debounce } from "lodash"
import apiFetch from "@wordpress/api-fetch"

const visitBlocks = (blocks, visitor) => {
  blocks.forEach(block => {
    visitor(block)

    if (block.innerBlocks) {
      visitBlocks(block.innerBlocks, visitor)
    }
  })

  return blocks
}

const visitor = block => {
  block.saveContent = getSaveContent(block.name, block.attributes, block.innerBlocks)
}

export const sendPreview = debounce(({ client, state }) => {
  const data = JSON.parse(JSON.stringify(state))

  Object.keys(data).forEach(id => {
    const { blocks, blocksByCoreBlockId } = data[id]

    visitBlocks(blocks, visitor)
    Object.keys(blocksByCoreBlockId).forEach(coreBlockId => {
      visitBlocks(blocksByCoreBlockId[coreBlockId], visitor)
    })
  })

  apiFetch({
    path: `/gatsby-gutenberg/v1/previews/batch`,
    method: `POST`,
    data: { batch: data },
  })
}, 500)
