import { __ } from '@wordpress/i18n';
import { useEffect } from 'react';
import { useBlockProps } from '@wordpress/block-editor';
import './editor.scss';

export default function Edit({ clientId, attributes, setAttributes }) {
	const { blockId } = attributes;

	useEffect(() => {
		if (blockId !== clientId) setAttributes({ blockId: clientId });
	}, [clientId]);

	return (
		<div {...useBlockProps()}>
			<div className="quiz-attempts-modal-editor-preview">
				<i className="fa-light fa-rectangle-history" />
				{__('Batch Send History Modal ', 'bys')}
				<span>{__('(opens as overlay)', 'bys')}</span>
			</div>
		</div>
	);
}
