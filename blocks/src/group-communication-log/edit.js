import { __ } from '@wordpress/i18n';
import { useEffect } from 'react';
import { useBlockProps } from '@wordpress/block-editor';
import './editor.scss';

const PREVIEW_ENTRIES = [
	{ date: 'Mar 15', label: 'Quiz reminder: Jane Doe',            type: 'prompt' },
	{ date: 'Mar 12', label: 'Assessment reminder: Entire group',  type: 'prompt' },
	{ date: 'Mar 8',  label: 'Great progress this week!: John Doe', type: 'custom' },
	{ date: 'Feb 28', label: 'Inactivity nudge: Entire group',     type: 'prompt' },
	{ date: 'Feb 15', label: 'Quiz reminder: John Doe',            type: 'prompt' },
];

export default function Edit({ clientId, attributes, setAttributes }) {
	const { blockId } = attributes;

	useEffect(() => {
		if (blockId !== clientId) setAttributes({ blockId: clientId });
	}, [clientId]);

	return (
		<div {...useBlockProps()}>
			<h5>{__('Sent message log', 'bys')}</h5>
			<div className="gcl">
				<div className="gcl__list">
					{PREVIEW_ENTRIES.map((entry, i) => (
						<div key={i} className="gcl__item">
							<span className="gcl__date">{entry.date}</span>
							<span className="gcl__label">{entry.label}</span>
							<span className={`gcl__badge gcl__badge--${entry.type}`}>
								{entry.type.charAt(0).toUpperCase() + entry.type.slice(1)}
							</span>
						</div>
					))}
				</div>
				<div className="gcl__show-more">{__('Show more', 'bys')}</div>
			</div>
		</div>
	);
}
