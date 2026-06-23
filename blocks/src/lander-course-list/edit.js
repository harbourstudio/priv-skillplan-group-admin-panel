import { __ } from '@wordpress/i18n';
import { useBlockProps } from '@wordpress/block-editor';
import './editor.scss';

const CARDS = [
	{ badge: 'Required', badgeMod: 'blue', progress: 55, cta: 'Continue Course', locked: false },
	{ badge: 'Required', badgeMod: 'blue', progress: 0,  cta: 'Get Started',     locked: false },
	{ badge: 'Locked',   badgeMod: 'gray', progress: 0,  cta: 'Locked',          locked: true  },
];

function WireframeCard( { badge, badgeMod, progress, cta, locked } ) {
	return (
		<div className={ `bys-cl-wf__card${ locked ? ' bys-cl-wf__card--locked' : '' }` }>
			<div className="bys-cl-wf__card-header">
				<span className={ `bys-cl-wf__badge bys-cl-wf__badge--${ badgeMod }` }>{ badge }</span>
				<span className="bys-cl-wf__info-icon" aria-hidden="true">i</span>
			</div>
			<div className="bys-cl-wf__card-content">
				<div className="bys-cl-wf__skel bys-cl-wf__skel--lg" />
				<div className="bys-cl-wf__skel bys-cl-wf__skel--md" />
			</div>
			<div className="bys-cl-wf__card-foot">
				<div className="bys-cl-wf__progress-track">
					<div className="bys-cl-wf__progress-fill" style={ { width: `${ progress }%` } } />
				</div>
				<span className="bys-cl-wf__progress-label">{ progress }% { __( 'Complete', 'bys' ) }</span>
				<div className={ `bys-cl-wf__cta${ locked ? ' bys-cl-wf__cta--locked' : '' }` }>
					{ locked && <span className="bys-cl-wf__lock" aria-hidden="true">&#128274;</span> }
					{ cta }
				</div>
			</div>
		</div>
	);
}

export default function Edit() {
	const blockProps = useBlockProps( { className: 'bys-lander-courses bys-cl-wf' } );

	return (
		<div { ...blockProps }>

			<div className="bys-cl-wf__notice">
				<span className="bys-cl-wf__notice-icon" aria-hidden="true">&#8635;</span>
				<span>
					{ __( 'Courses are resolved server-side from the user\'s matched LearnDash group for this lander. Order, locks, and progress are per-user.', 'bys' ) }
				</span>
			</div>

			<div className="bys-cl-wf__heading">
				<span className="bys-cl-wf__heading-ghost">{ __( '[Group Name]', 'bys' ) }</span>
				{ ' ' }{ __( 'Courses', 'bys' ) }
			</div>

			<div className="bys-cl-wf__grid">
				{ CARDS.map( ( card, i ) => <WireframeCard key={ i } { ...card } /> ) }
			</div>

		</div>
	);
}
