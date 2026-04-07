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
			<div className="user-info__header">
				<div className="user-info__avatar">
					<img src="https://www.gravatar.com/avatar/?d=mp&s=72" alt="" />
				</div>
				<div>
					<h3 className="user-info__name">{__('User Name', 'bys')}</h3>
					<ul className="user-info__meta">
						<li className="user-info__meta-item">
							<i className="fa-light fa-envelope" /> user@example.com
						</li>
						<li className="user-info__meta-item user-info__meta-item--active">
							<i className="fa-light fa-circle-check" /> {__('Active', 'bys')}
						</li>
					</ul>
				</div>
			</div>
		</div>
	);
}
