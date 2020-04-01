import { registerStore } from '@wordpress/data';

export default registerStore(`wp-gatsby-gutenberg/preview`, {
	reducer(
		state = {
			blocksById: {},
			previewUrl: null,
		},
		action
	) {
		const { type, ...payload } = action;

		switch (type) {
			case `SET_PREVIEW_URL`: {
				const { previewUrl } = payload;

				return {
					...state,
					previewUrl,
				};
			}

			case `SET_BLOCKS`: {
				const { blocks, coreBlockId, id, ...rest } = payload;

				const stateById = state.blocksById[action.id] || {
					blocks: [],
					blocksByCoreBlockId: {},
				};

				if (coreBlockId) {
					return {
						...state,
						blocksById: {
							...state.blocksById,
							[id]: {
								...stateById,
								...rest,
								blocksByCoreBlockId: {
									...stateById.blocksByCoreBlockId,
									[coreBlockId]: blocks,
								},
							},
						},
					};
				}

				return {
					...state,
					blocksById: {
						...state.blocksById,
						[id]: {
							...stateById,
							...rest,
							blocks,
						},
					},
				};
			}
		}

		return state;
	},

	actions: {
		setBlocks(payload) {
			return {
				...payload,
				type: `SET_BLOCKS`,
			};
		},
		setPreviewUrl(payload) {
			return {
				...payload,
				type: `SET_PREVIEW_URL`,
			};
		},
	},
	selectors: {
		getBatch: (state) => state.blocksById,
		getPreviewUrl: (state) => state.previewUrl,
	},
});
