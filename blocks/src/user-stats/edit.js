import { __ } from '@wordpress/i18n';
import { useEffect } from 'react';
import { useBlockProps } from '@wordpress/block-editor';

const STATS = [
	{ label: __('Courses Enrolled', 'bys'),  value: '—' },
	{ label: __('Courses Completed', 'bys'), value: '—' },
	{ label: __('Quizzes Passed', 'bys'),    value: '—' },
	{ label: __('Avg. Score', 'bys'),         value: '—' },
];

export default function Edit({ clientId, attributes, setAttributes }) {
	const { blockId } = attributes;

	useEffect(() => {
		if (blockId !== clientId) setAttributes({ blockId: clientId });
	}, [clientId]);

	return (
		<div {...useBlockProps()}>
			<div className="stats__grid">
				{STATS.map(({ label, value }) => (
					<div key={label} className="stat__box">
						<div className="stat__content">
							<span className="stat__number">{value}</span>
							<span>{label}</span>
						</div>
					</div>
				))}
			</div>
		</div>
	);
}
