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
			<div className="group-archive__card">
				<h3 className="group-archive__title">{__('Archive Group', 'bys')}</h3>
				<p className="group-archive__description">
					{__('Lock group in current state. New members and new activity will not be populated into administrator dashboard for archived groups.', 'bys')}
				</p>
				<button className="group-archive__button" type="button" disabled>
					{__('Archive Group', 'bys')}
				</button>
			</div>
		</div>
	);
}
