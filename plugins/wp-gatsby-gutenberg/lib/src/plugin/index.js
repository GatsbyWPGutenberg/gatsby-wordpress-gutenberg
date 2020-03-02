/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';
import { useEffect, useCallback } from '@wordpress/element';
import { useSelect } from '@wordpress/data';
import { Button } from '@wordpress/components';

import { registerPlugin } from '@wordpress/plugins';
import { PluginDocumentSettingPanel } from '@wordpress/edit-post';
import { PluginSidebar } from '@wordpress/edit-post';

import { debounce } from 'lodash';
import styled from 'styled-components';

import { usePreview } from '../preview';
import { postBatch } from '../api';

const PreviewButton = styled(Button)`
	&& {
		&:not([disabled]) {
			background-color: #663399;
			border-color: #663399;
			color: white;

			:hover {
				background-color: #4d2673;
				border-color: #402060;
			}
		}
	}
`;

const noIcon = () => null;

const GatsbyWordpressGutenbergPreview = () => {
	const { enabled } = usePreview();

	const id = useSelect(
		(select) => select(`core/editor`).getCurrentPostId(),
		[]
	);

	const sendBatch = useCallback(
		debounce(({ batch }) => {
			postBatch({
				batch,
			});
		}, 500),
		[enabled, id]
	);

	const batch = useSelect(
		(select) => select(`wp-gatsby-gutenberg/preview`).getBatch(),
		[]
	);

	const previewUrl = useSelect(
		(select) => select(`wp-gatsby-gutenberg/preview`).getPreviewUrl(),
		[]
	);

	useEffect(() => {
		sendBatch({ batch });
	}, [sendBatch, batch]);

	if (enabled) {
		return (
			<>
				<PluginDocumentSettingPanel
					name="wp-gatsby-gutenberg-document-setting-panel"
					title={__('Gatsby', 'wp-gatsby-gutenberg')}
					icon={noIcon}
				>
					<PreviewButton
						disabled={!previewUrl}
						href={previewUrl}
						target="_blank"
						isLarge
					>
						{__('Preview', 'wp-gatsby-gutenberg')}
					</PreviewButton>
				</PluginDocumentSettingPanel>
			</>
		);
	}

	return null;
};

registerPlugin(`plugin-wp-gatsby-gutenberg-preview`, {
	render: GatsbyWordpressGutenbergPreview,
});
