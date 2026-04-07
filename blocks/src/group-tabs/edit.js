import { __ } from '@wordpress/i18n';
import { useEffect } from 'react';
import { useBlockProps } from '@wordpress/block-editor';
import './editor.scss';

const TABS = ['Overview', 'Enrolment', 'Curriculum', 'Communications', 'Grading'];

export default function Edit({ clientId, attributes, setAttributes }) {
	const { blockId } = attributes;

	useEffect(() => {
		if (blockId !== clientId) setAttributes({ blockId: clientId });
	}, [clientId]);

	return (
		<div {...useBlockProps()}>
			<nav className="group-tabs">
				{TABS.map((label, i) => (
					<span key={label} className={`group-tab${i === 0 ? ' group-tab--active' : ''}`}>
						{label}
					</span>
				))}
			</nav>
		</div>
	);
}
