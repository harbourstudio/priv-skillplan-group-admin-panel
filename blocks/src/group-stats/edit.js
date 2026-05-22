import { __ } from '@wordpress/i18n';
import { useEffect } from 'react';
import { useBlockProps } from '@wordpress/block-editor';

const STATS = [
	{ label: __('Total Participants', 'bys'),         value: '—' },
	{ label: __('Completed Courses', 'bys'),     value: '—' },
	{ label: __('Incomplete Courses', 'bys'),          value: '—' },
	{ label: __('Inactive Participants', 'bys'),  value: '—' },
];

export default function Edit({ clientId, attributes, setAttributes }) {
	const { blockId } = attributes;

	useEffect(() => {
		if (blockId !== clientId) setAttributes({ blockId: clientId });
	}, [clientId]);

	const blockProps = useBlockProps();

	return (
		<div {...blockProps}>
			<div className="group-stats__grid">
				{STATS.map(({ label, value }) => (
					<div key={label} className="group-stats__box">
						<div className="group-stats__content">
							<span className="group-stats__number">{value}</span>
							<span className="group-stats__label">{label}</span>
						</div>
					</div>
				))}
			</div>
		</div>
	);
}
