import { __ } from '@wordpress/i18n';
import { useEffect } from 'react';
import { useBlockProps } from '@wordpress/block-editor';

export default function Edit({ clientId, attributes, setAttributes }) {
	const { blockId } = attributes;

	useEffect(() => {
		if (blockId !== clientId) setAttributes({ blockId: clientId });
	}, [clientId]);

	return (
		<div {...useBlockProps()}>
			<div className="ungraded-alert">
				<i className="fa-solid fa-circle-exclamation ungraded-alert__icon" aria-hidden="true" />
				<span className="ungraded-alert__text">
					<span className="ungraded-alert__count">N</span>{' '}
					{__('quiz submissions still require manual grading', 'bys')}
				</span>
				<span className="ungraded-alert__btn">{__('See all', 'bys')}</span>
			</div>
		</div>
	);
}
