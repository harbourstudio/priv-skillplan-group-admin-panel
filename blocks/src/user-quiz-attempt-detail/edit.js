import { __ } from '@wordpress/i18n';
import { useEffect } from 'react';
import { useBlockProps } from '@wordpress/block-editor';

const MOCK_QUESTIONS = [
	{ result: 'correct',   label: __('Correct', 'bys'),   cls: 'result-badge--correct' },
	{ result: 'incorrect', label: __('Incorrect', 'bys'), cls: 'result-badge--incorrect' },
	{ result: 'ungraded',  label: __('Ungraded', 'bys'),  cls: 'result-badge--ungraded' },
];

export default function Edit({ clientId, attributes, setAttributes }) {
	const { blockId } = attributes;

	useEffect(() => {
		if (blockId !== clientId) setAttributes({ blockId: clientId });
	}, [clientId]);

	return (
		<div {...useBlockProps()}>
			<div className="attempt-detail__filters">
				{['All 3', 'Correct 1', 'Incorrect 1', 'Ungraded 1'].map((label) => (
					<button key={label} className={`filter-btn${label.startsWith('All') ? ' filter-btn--active' : ''}`} disabled>
						{label}
					</button>
				))}
			</div>
			<div className="attempt-detail__list">
				{MOCK_QUESTIONS.map(({ result, label, cls }, i) => (
					<div key={result} className={`question-card question-card--${result}`}>
						<div className="question-card__header">
							<span className="question-card__number">Q{i + 1}</span>
							<span className={`result-badge ${cls}`}>{label}</span>
							<span className="question-card__points">1 / 1 pts</span>
						</div>
						<div className="question-card__text">
							{__('Example question text goes here…', 'bys')}
						</div>
					</div>
				))}
			</div>
		</div>
	);
}
