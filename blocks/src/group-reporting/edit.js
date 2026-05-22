import { __ } from '@wordpress/i18n';
import { useEffect } from 'react';
import { useBlockProps } from '@wordpress/block-editor';

const ROWS = [
	{ user: 'Adam Stephenson', activity: 'Quiz Completed',   resource: 'Module 1 Quiz',       date: 'Jan 14, 2026' },
	{ user: 'Julia S.',        activity: 'Lesson Completed',  resource: 'Introduction',         date: 'Jan 13, 2026' },
	{ user: 'Sam T.',          activity: 'Course Completed',  resource: 'Crane Safety',         date: 'Jan 12, 2026' },
];

export default function Edit({ clientId, attributes, setAttributes }) {
	const { blockId } = attributes;

	useEffect(() => {
		if (blockId !== clientId) setAttributes({ blockId: clientId });
	}, [clientId]);

	return (
		<div {...useBlockProps()}>
			<div className="table-wrapper group-reporting__results">
				<table>
					<thead>
						<tr>
							<th>{__('User', 'bys')}</th>
							<th>{__('Activity', 'bys')}</th>
							<th>{__('Resource', 'bys')}</th>
							<th>{__('Date', 'bys')}</th>
						</tr>
					</thead>
					<tbody>
						{ROWS.map(({ user, activity, resource, date }) => (
							<tr key={user + date}>
								<td>{user}</td>
								<td>{activity}</td>
								<td>{resource}</td>
								<td>{date}</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	);
}
