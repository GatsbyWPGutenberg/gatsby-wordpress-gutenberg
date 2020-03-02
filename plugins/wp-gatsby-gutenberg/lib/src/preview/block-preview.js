/**
 * WordPress dependencies
 */
import { useState, useEffect } from '@wordpress/element';

export default (props) => {
	const { id, clientId, minHeight, changedTime, previewUrl } = props;
	const [src, setSrc] = useState(null);

	useEffect(() => {
		const url = new URL(previewUrl);
		url.searchParams.set('clientId', clientId);
		url.searchParams.set('changedTime', changedTime.toISOString());
		setSrc(url.href);
	}, [id, previewUrl]);

	return src ? (
		<iframe title="gatsby-preview" style={{ minHeight }} src={src} />
	) : null;
};
