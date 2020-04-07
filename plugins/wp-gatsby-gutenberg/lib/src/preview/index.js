/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';
import {
	useEffect,
	useContext,
	useState,
	createContext,
	useRef,
} from '@wordpress/element';
import { useRegistry, useDispatch, useSelect } from '@wordpress/data';
import { addFilter } from '@wordpress/hooks';
import { Toolbar, Button } from '@wordpress/components';
import {
	BlockControls,
	// InspectorControls
} from '@wordpress/block-editor';

import { postPreview } from '../api';

import BlockPreview from './block-preview';
import PreviewIcon from './icon';

import './store';

export const usePreview = () => {
	return {
		enabled: window.wpGatsbyGutenberg && window.wpGatsbyGutenberg.enabled,
	};
};

const CoreBlockContext = createContext( null );

addFilter(
	`editor.BlockEdit`,
	`plugin-wp-gatsby-gutenberg-preview/BlockEdit`,
	( Edit ) => {
		return ( props ) => {
			const { clientId } = props;
			const { enabled } = usePreview();
			const [ minHeight, setMinHeight ] = useState( 0 );
			const [ changedTime, setChangedTime ] = useState( new Date() );
			const [ isPreviewActive, setIsPreviewActive ] = useState( false );

			const { setBlocks, setPreviewUrl } = useDispatch(
				`wp-gatsby-gutenberg/preview`
			);

			const registry = useRegistry();
			const blocks = registry.select( `core/block-editor` ).getBlocks();
			const coreBlock = useContext( CoreBlockContext );

			const id = useSelect(
				( select ) => select( `core/editor` ).getCurrentPostId(),
				[]
			);
			const slug = useSelect(
				( select ) =>
					select( `core/editor` ).getEditedPostAttribute( `slug` ),
				[]
			);
			const link = useSelect(
				( select ) =>
					select( `core/editor` ).getEditedPostAttribute( `link` ),
				[]
			);

			const previewUrl = useSelect(
				( select ) =>
					select( `wp-gatsby-gutenberg/preview` ).getPreviewUrl(),
				[]
			);

			const coreBlockId =
				( coreBlock &&
					coreBlock.attributes.ref &&
					parseInt( coreBlock.attributes.ref, 10 ) ) ||
				null;

			useEffect( () => {
				if ( id ) {
					setBlocks( {
						id,
						blocks,
						coreBlockId,
						slug,
						link,
					} );
				}
			}, [ blocks, coreBlockId, id ] );

			const currentPromiseRef = useRef( null );
			const retryTimeoutRef = useRef( null );

			useEffect( () => {
				if ( enabled ) {
					const retry = () => {
						if ( retryTimeoutRef.current ) {
							clearTimeout( retryTimeoutRef.current );
						}

						const promise = postPreview( {
							id,
							data: {
								changedTime,
								clientId,
								coreBlockId,
								id,
							},
						} )
							.then( ( data ) => {
								if ( currentPromiseRef.current === promise ) {
									setPreviewUrl( {
										previewUrl: data.previewUrl,
									} );

									if ( ! data.previewUrl ) {
										retryTimeoutRef.current = setTimeout(
											retry,
											1000
										);
									}
								}
							} )
							.catch( () => {
								retryTimeoutRef.current = setTimeout(
									retry,
									1000 * 60
								);
							} );

						currentPromiseRef.current = promise;
					};

					retry();

					return () => {
						if ( retryTimeoutRef.current ) {
							clearTimeout( retryTimeoutRef.current );
						}
					};
				}
			}, [ changedTime, clientId, coreBlockId, enabled, id ] );

			useEffect( () => {
				setChangedTime( new Date() );
			}, [ blocks ] );

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
							<BlockPreview
								minHeight={ minHeight }
								changedTime={ changedTime }
								{ ...props }
								id={ id }
								previewUrl={ previewUrl }
							/>
						) : (
							<Edit { ...props } />
						) }
						<BlockControls>
							<Toolbar>
								<Button
									className="components-toolbar__control"
									label={ __( 'Gatsby Preview' ) }
									disabled={ ! previewUrl }
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
