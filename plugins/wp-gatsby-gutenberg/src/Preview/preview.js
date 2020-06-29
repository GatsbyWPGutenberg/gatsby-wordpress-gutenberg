/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';
import {
	useContext,
	useState,
	createContext,
	useEffect,
} from '@wordpress/element';
import { useSelect } from '@wordpress/data';
import { addFilter } from '@wordpress/hooks';
import { Toolbar, Button } from '@wordpress/components';
import { BlockControls } from '@wordpress/block-editor';
import { v4 } from 'uuid';

import PreviewIcon from './icon';
import GatsbyBlockPreview, {
	useGatsbyBlockPreview,
} from './gatsby-block-preview';

const CoreBlockContext = createContext( null );

addFilter(
	'blocks.registerBlockType',
	'wpGraphqlGutenberg.registerBlockType',
	( blockType ) => {
		const result = {
			...blockType,
			attributes: {
				...blockType.attributes,
				wpGatsbyGutenbergUUID: {
					type: 'string',
				},
			},
		};

		return result;
	}
);

addFilter(
	'blocks.getBlockAttributes',
	'wpGraphqlGutenberg.getBlockAttributes',
	( attributes ) => {
		if ( ! attributes.wpGatsbyGutenbergUUID ) {
			attributes.wpGatsbyGutenbergUUID = v4();
		}

		return attributes;
	}
);

addFilter(
	`editor.BlockEdit`,
	`plugin-wp-gatsby-gutenberg-preview/BlockEdit`,
	( Edit ) => {
		return ( props ) => {
			const { attributes, setAttributes } = props;

			useEffect( () => {
				if ( ! attributes.wpGatsbyGutenbergUUID ) {
					setAttributes( { wpGatsbyGutenbergUUID: v4() } );
				}
			}, [ attributes ] );

			const enabled =
				window.wpGatsbyGutenberg &&
				window.wpGatsbyGutenberg.settings.enable_live_preview;

			const [ minHeight, setMinHeight ] = useState( 0 );
			const [ isPreviewActive, setIsPreviewActive ] = useState( false );

			const coreBlock = useContext( CoreBlockContext );

			const postId = useSelect(
				( select ) => select( `core/editor` ).getCurrentPostId(),
				[]
			);

			const coreBlockId =
				( coreBlock &&
					coreBlock.attributes.ref &&
					parseInt( coreBlock.attributes.ref, 10 ) ) ||
				null;

			const gatsbyBlockPreview = useGatsbyBlockPreview( {
				...props,
				refresh: isPreviewActive,
				postId: coreBlockId || postId,
				previewPostId: postId,
			} );

			if ( props.name === `core/block` ) {
				return (
					<CoreBlockContext.Provider value={ props }>
						<Edit { ...props }></Edit>
					</CoreBlockContext.Provider>
				);
			}

			if ( enabled ) {
				return (
					<>
						{ isPreviewActive ? (
							<GatsbyBlockPreview
								minHeight={ minHeight }
								{ ...gatsbyBlockPreview }
							/>
						) : (
							<Edit { ...props } />
						) }
						<BlockControls>
							<Toolbar>
								<Button
									className="components-toolbar__control"
									label={ __( 'Gatsby Preview' ) }
									onClick={ () => {
										if ( ! isPreviewActive ) {
											const el = document.querySelector(
												`div[data-block="${ props.clientId }"]`
											);

											if ( el ) {
												setMinHeight( el.clientHeight );
											}
										}

										setIsPreviewActive( ! isPreviewActive );
									} }
								>
									<PreviewIcon active={ isPreviewActive } />
								</Button>
							</Toolbar>
						</BlockControls>
					</>
				);
			}

			return <Edit { ...props } />;
		};
	}
);
