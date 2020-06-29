import { Spinner, Button } from '@wordpress/components';
import { useState, useEffect, useRef, useCallback } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import apiFetch from '@wordpress/api-fetch';

export const useGatsbyBlockPreview = ( props ) => {
	const { postId, attributes, previewPostId, refresh } = props;

	const [ loading, setLoading ] = useState( false );
	const [ error, setError ] = useState( null );
	const [ data, setData ] = useState( null );
	const currentPromiseRef = useRef( null );
	const previousRefreshPreviewRef = useRef( null );
	const previousRefreshRef = useRef( null );

	const refreshPreview = useCallback( () => {
		setLoading( true );
		setError( null );

		const promise = apiFetch( {
			path: `/wp-gatsby-gutenberg/v1/previews/refresh`,
			method: `POST`,
			data: { postId, previewPostId },
		} )
			.then( ( data ) => {
				if ( promise === currentPromiseRef.current ) {
					setData( data );
				}
			} )

			.catch( ( error ) => {
				if ( promise === currentPromiseRef.current ) {
					setError( error );
				}
			} )

			.finally( () => {
				if ( promise === currentPromiseRef.current ) {
					setLoading( false );
				}
			} );

		currentPromiseRef.current = promise;
		return promise;
	}, [ postId, previewPostId, attributes, currentPromiseRef ] );

	useEffect( () => {
		if (
			refresh &&
			( previousRefreshPreviewRef.current !== refreshPreview ||
				( previousRefreshRef.current === false && error ) )
		) {
			previousRefreshPreviewRef.current = refreshPreview;

			refreshPreview();
		}

		previousRefreshRef.current = refresh;
	}, [ refresh, refreshPreview ] );

	return {
		loading,
		data,
		error,
		retry: refreshPreview,
		previewUUID: attributes.wpGatsbyGutenbergUUID,
	};
};

const Loader = ( { style, message } ) => (
	<div className="wp-block-embed is-loading" style={ style }>
		<Spinner />
		<p>{ message }</p>
	</div>
);

const ErrorMessage = ( { style, retry, message } ) => (
	<div className="wp-block-embed is-loading" style={ style }>
		<p>{ message }</p>
		<Button isLarge isPrimary onClick={ retry }>
			{ __( 'Retry' ) }
		</Button>
	</div>
);

const Preview = ( { src, style } ) => {
	const [ pageReady, setPageReady ] = useState( false );
	const fetchPromiseRef = useRef( null );
	const timeoutRef = useRef( null );
	const mountedRef = useRef( true );

	const cleanup = useCallback( () => {
		if ( timeoutRef.current ) {
			clearTimeout( timeoutRef.current );
			timeoutRef.current = null;
		}
	}, [ timeoutRef ] );

	const check = useCallback( () => {
		cleanup();

		const promise = fetch( src )
			.then( ( response ) => {
				if ( fetchPromiseRef.current === promise ) {
					if (
						response &&
						response.headers.get(
							'X-Theme-Wordpress-Gutenberg-Preview-Page'
						)
					) {
						setPageReady( true );
					} else {
						return Promise.reject( new Error() );
					}
				}
			} )
			.catch( () => {
				if ( fetchPromiseRef.current === promise ) {
					timeoutRef.current = setTimeout( () => {
						if ( mountedRef.current ) {
							check();
						}
					}, 1500 );
				}
			} );

		fetchPromiseRef.current = promise;

		return promise;
	}, [ src, mountedRef ] );

	useEffect( () => {
		check();

		return () => {
			mountedRef.current = false;
			cleanup();
		};
	}, [] );

	if ( pageReady ) {
		return <iframe title="gatsby-preview" style={ style } src={ src } />;
	}

	return (
		<Loader
			style={ style }
			message={ __(
				'Waiting for Gatsby to create preview page',
				'wp-gatsby-gutenberg'
			) }
		/>
	);
};

const GatsbyBlockPreview = ( props ) => {
	const { loading, error, data, minHeight, previewUUID, retry } = props;

	const [ src, setSrc ] = useState( null );

	useEffect( () => {
		if ( data && data.gatsby_preview_url ) {
			const url = new URL( data.gatsby_preview_url );
			const search = new URLSearchParams( url.search );
			search.set( 'previewUUID', previewUUID );
			search.set( 'timestamp', new Date().getTime() );

			url.search = search;

			setSrc( url.href );
		}
	}, [ data, previewUUID ] );

	if ( loading ) {
		return (
			<Loader
				style={ { minHeight } }
				message={ __(
					'Triggering preview hook',
					'wp-gatsby-gutenberg'
				) }
			/>
		);
	}

	if ( error ) {
		return (
			<ErrorMessage
				{ ...error }
				retry={ retry }
				style={ { minHeight } }
			/>
		);
	}

	return src ? <Preview src={ src } style={ { minHeight } } /> : null;
};

export default GatsbyBlockPreview;
