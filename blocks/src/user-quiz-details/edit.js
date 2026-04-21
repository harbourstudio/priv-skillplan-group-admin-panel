import { __ } from '@wordpress/i18n';
import { useEffect } from 'react';
import { useBlockProps } from '@wordpress/block-editor';

const ROWS = [
	{ quiz: 'Module 1 Quiz',      attempts: 3, best: '85%',  status: 'Pass' },
	{ quiz: 'Module 2 Quiz',      attempts: 1, best: '42%',  status: 'Fail' },
	{ quiz: 'Final Assessment',   attempts: 2, best: '91%',  status: 'Pass' },
];

export default function Edit({ clientId, attributes, setAttributes }) {
	const { blockId } = attributes;

	useEffect(() => {
		if (blockId !== clientId) setAttributes({ blockId: clientId });
	}, [clientId]);

	return (
		<div {...useBlockProps()}>
			<table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
				<thead>
					<tr style={{ background: 'var(--wp--preset--color--primary)', color: 'white' }}>
						<th style={{ padding: '0.5rem 0.75rem', textAlign: 'left', fontWeight: 500 }}>{__('Quiz', 'bys')}</th>
						<th style={{ padding: '0.5rem 0.75rem', textAlign: 'left', fontWeight: 500 }}>{__('Attempts', 'bys')}</th>
						<th style={{ padding: '0.5rem 0.75rem', textAlign: 'left', fontWeight: 500 }}>{__('Best Score', 'bys')}</th>
						<th style={{ padding: '0.5rem 0.75rem', textAlign: 'left', fontWeight: 500 }}>{__('Status', 'bys')}</th>
					</tr>
				</thead>
				<tbody>
					{ROWS.map(({ quiz, attempts, best, status }) => (
						<tr key={quiz} style={{ borderBottom: '1px solid #E5E7EB' }}>
							<td style={{ padding: '0.5rem 0.75rem' }}>{quiz}</td>
							<td style={{ padding: '0.5rem 0.75rem' }}>{attempts}</td>
							<td style={{ padding: '0.5rem 0.75rem' }}>{best}</td>
							<td style={{ padding: '0.5rem 0.75rem' }}>{status}</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}
