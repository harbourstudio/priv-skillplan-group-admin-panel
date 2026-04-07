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
			<div className="attempt-header__content">
				<div className="attempt-header__title-row">
					<h1 className="attempt-header__quiz-title">{__('Quiz Title', 'bys')}</h1>
					<span className="status-badge status-badge--pass">{__('Pass', 'bys')}</span>
					<span className="status-badge status-badge--score">72/100 (72%)</span>
				</div>
				<div className="attempt-header__meta">
					<span className="attempt-header__meta-item">
						<i className="fa-light fa-user" /> {__('User Name', 'bys')}
					</span>
					<span className="attempt-header__meta-item">
						<i className="fa-light fa-list-ol" /> {__('Attempt 1', 'bys')}
					</span>
					<span className="attempt-header__meta-item">
						<i className="fa-light fa-calendar" /> Jan 14, 2026
					</span>
				</div>
			</div>
		</div>
	);
}
