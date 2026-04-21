import { __ } from '@wordpress/i18n';
import { useEffect } from 'react';
import { useBlockProps } from '@wordpress/block-editor';
import './editor.scss';

const TABS = [
	{ label: __('Overview', 'bys'),      active: true },
	{ label: __('Quiz Results', 'bys'),  active: false },
	{ label: __('Activity', 'bys'),      active: false },
	{ label: __('Progress', 'bys'),      active: false },
];

export default function Edit({ clientId, attributes, setAttributes }) {
	const { blockId } = attributes;

	useEffect(() => {
		if (blockId !== clientId) setAttributes({ blockId: clientId });
	}, [clientId]);

	return (
		<div {...useBlockProps()}>
			<div className="user-tabs-editor-preview">
				{TABS.map(({ label, active }) => (
					<span key={label} className={`user-tab-preview${active ? ' user-tab-preview--active' : ''}`}>
						{label}
					</span>
				))}
			</div>
		</div>
	);
}
