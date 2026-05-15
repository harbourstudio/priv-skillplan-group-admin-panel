import { __ } from '@wordpress/i18n';
import { useEffect } from 'react';
import { useBlockProps } from '@wordpress/block-editor';
// import './editor.scss';

export default function Edit({ clientId, attributes, setAttributes }) {
	const { blockId } = attributes;

	useEffect(() => {
		if (blockId !== clientId) setAttributes({ blockId: clientId });
	}, [clientId]);

	const blockProps = useBlockProps()

	return (
		<div {...blockProps}>
			<div className="modal-editor-preview">
				<i className="fa-light fa-rectangle-history" />
				{__('Message Send Modal (opens as overlay) ', 'bys')}
			</div>
		</div>
	);
}
