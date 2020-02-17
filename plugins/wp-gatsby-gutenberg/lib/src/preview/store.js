import { registerStore } from "@wordpress/data"

export default registerStore(`wp-gatsby-gutenberg/preview`, {
  reducer(state = {}, action) {
    const { type, ...payload } = action

    switch (type) {
      case `SET_BLOCKS`: {
        const { blocks, coreBlockId, id, ...rest } = payload

        const stateById = state[action.id] || {
          blocks: [],
          blocksByCoreBlockId: {},
        }

        if (coreBlockId) {
          return {
            ...state,
            [id]: {
              ...stateById,
              ...rest,
              blocksByCoreBlockId: {
                ...stateById.blocksByCoreBlockId,
                [coreBlockId]: blocks,
              },
            },
          }
        }

        return {
          ...state,
          [id]: {
            ...stateById,
            ...rest,
            blocks: blocks,
          },
        }
      }
    }

    return state
  },

  actions: {
    setBlocks(payload) {
      return {
        ...payload,
        type: `SET_BLOCKS`,
      }
    },
  },
})
