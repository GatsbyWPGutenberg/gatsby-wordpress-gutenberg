import { getSaveContent } from '@wordpress/blocks';
import apiFetch from '@wordpress/api-fetch';

const visitBlocks = (blocks, visitor) => {
	blocks.forEach((block) => {
		visitor(block);

		if (block.innerBlocks) {
			visitBlocks(block.innerBlocks, visitor);
		}
	});

	return blocks;
};

const visitor = (block) => {
	block.saveContent = getSaveContent(
		block.name,
		block.attributes,
		block.innerBlocks
	);
};

export const postBatch = ({ batch }) => {
	const data = JSON.parse(JSON.stringify(batch));

	Object.keys(data).forEach((id) => {
		const { blocks, blocksByCoreBlockId } = data[id];

		visitBlocks(blocks, visitor);
		Object.keys(blocksByCoreBlockId).forEach((coreBlockId) => {
			visitBlocks(blocksByCoreBlockId[coreBlockId], visitor);
		});
	});

	return apiFetch({
		path: `/gatsby-gutenberg/v1/previews/batch`,
		method: `POST`,
		data: { batch: data },
	});
};

export const postPreview = ({ id, data }) => {
	return apiFetch({
		path: `/gatsby-gutenberg/v1/previews/${id}`,
		method: `POST`,
		data,
	});
};
