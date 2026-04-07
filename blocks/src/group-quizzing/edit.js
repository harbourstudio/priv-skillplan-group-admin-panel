import { __ } from '@wordpress/i18n';
import { useEffect } from 'react';
import { useBlockProps } from '@wordpress/block-editor';

const MOCK_QUIZZES = [
	{ name: __('Module 1 Quiz', 'bys'),    subs: '12 submissions', last: 'Jan 10, 2026' },
	{ name: __('Module 2 Assessment', 'bys'), subs: '8 submissions',  last: 'Jan 14, 2026' },
];

export default function Edit({ clientId, attributes, setAttributes }) {
	const { blockId } = attributes;

	useEffect(() => {
		if (blockId !== clientId) setAttributes({ blockId: clientId });
	}, [clientId]);

	return (
		<div {...useBlockProps()}>
			<div className="group-quizzing__courses">
				<h3 className="group-quizzing__section-title">{__('Quizzing', 'bys')}</h3>
				<div className="hs-accordion-group">
					<div className="hs-accordion">
						<div className="hs-accordion-toggle">
							<div className="accordion-toggle__left-wrapper">
								<span className="accordion-toggle__icon">
									<i className="fa-solid fa-plus" />
								</span>
								<span className="accordion-toggle__course-name">{__('Example Course', 'bys')}</span>
							</div>
							<div className="accordion-toggle__right-wrapper">
								<span className="accordion-toggle__date">
									<span className="date-label">{__('Latest Submission:', 'bys')}</span>
									<span className="date-value">Jan 14, 2026</span>
								</span>
								<span className="accordion-toggle__quiz-count">
									<span className="quiz-count-value">2</span>&nbsp;{__('Quizzes', 'bys')}
								</span>
							</div>
						</div>
						<div className="accordion-content__inner">
							{MOCK_QUIZZES.map(({ name, subs, last }) => (
								<div key={name} className="quiz-row">
									<div className="quiz-row__left">
										<span className="quiz-row__status-icon status-icon--graded">
											<i className="fa-solid fa-circle-check" />
										</span>
										<span className="quiz-row__name">{name}</span>
									</div>
									<div className="quiz-row__meta">
										<span className="quiz-row__submissions">{subs}</span>
									</div>
									<span className="quiz-row__last-submission">
										<span className="date-label">{__('Last Submission:', 'bys')}</span>
										<span className="date-value">{last}</span>
									</span>
								</div>
							))}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
