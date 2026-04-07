import { __ } from '@wordpress/i18n';
import { useEffect } from 'react';
import { useBlockProps } from '@wordpress/block-editor';

export default function Edit({ clientId, attributes, setAttributes }) {
	const { blockId } = attributes;

	useEffect(() => {
		if (blockId !== clientId) setAttributes({ blockId: clientId });
	}, [clientId]);

	const blockProps = useBlockProps();

	return (
		<div {...blockProps}>
			<div style={{
				display: 'flex',
				alignItems: 'center',
				gap: '0.75rem',
				padding: '0.625rem 1rem',
				background: '#FFFBEB',
				border: '1px solid #FDE68A',
				borderRadius: '0.5rem',
				fontSize: '0.875rem',
				color: '#92400E',
			}}>
				<i className="fa-solid fa-circle-exclamation" style={{ color: '#F59E0B' }} />
				<span><strong>N</strong> {__('quiz submissions still require manual grading', 'bys')}</span>
				<span style={{ marginLeft: 'auto', fontWeight: 600, textDecoration: 'underline', cursor: 'default' }}>
					{__('See all', 'bys')}
				</span>
			</div>
		</div>
	);
}
