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
			<div className="user-progress__courses">
				<p className="user-progress__section-title">{__('Course Progress', 'bys')}</p>
				<div className="hs-accordion-group">
					{['Example Course A', 'Example Course B'].map((name) => (
						<div key={name} className="hs-accordion">
							<div className="hs-accordion-toggle">
								<div className="accordion-toggle__left-wrapper">
									<span className="accordion-toggle__icon">
										<i className="fa-solid fa-plus" />
									</span>
									<span className="accordion-toggle__course-name">{name}</span>
								</div>
								<div className="accordion-toggle__right-wrapper">
									<span className="accordion-toggle__completion">
										<span className="completion-badge completion-badge--in_progress">
											{__('In Progress', 'bys')}
										</span>
									</span>
									<span className="accordion-toggle__progress">60%</span>
								</div>
							</div>
						</div>
					))}
				</div>
			</div>
		</div>
	);
}
