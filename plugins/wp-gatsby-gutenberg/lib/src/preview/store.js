import { registerStore } from "@wordpress/data"

export default registerStore(`wp-gatsby-gutenberg/preview`, {
  reducer(state = {}, action) {
    switch (action.type) {
      case `SET_BLOCKS`: {
        const stateById = state[action.id] || {
          blocks: [],
          blocksByCoreBlockId: {},
        }

        if (action.coreBlockId) {
          return {
            ...state,
            [action.id]: {
              ...stateById,
              blocksByCoreBlockId: {
                ...stateById.blocksByCoreBlockId,
                [action.coreBlockId]: action.blocks,
              },
            },
          }
        }

        return {
          ...state,
          [action.id]: {
            ...stateById,
            blocks: action.blocks,
          },
        }
      }
    }

    return state
  },

  actions: {
    setBlocks({ id, blocks, coreBlockId }) {
      return {
        type: `SET_BLOCKS`,
        id,
        blocks,
        coreBlockId,
      }
    },
  },
})
