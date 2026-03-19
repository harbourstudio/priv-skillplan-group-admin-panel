// import { store, getContext } from '@wordpress/interactivity';

// store( 'bys-groups/user-tabs', {
// 	state: {
// 		get isUserProgress() {
// 			return getContext().activeTab === 'user-progress';
// 		},
// 		get isQuizDetails() {
// 			return getContext().activeTab === 'user-quiz-details';
// 		},
// 		get isUserActivity() {
// 			return getContext().activeTab === 'user-activity';
// 		},
// 		get hideUserProgress() {
// 			return getContext().activeTab !== 'user-progress';
// 		},
// 		get hideQuizDetails() {
// 			return getContext().activeTab !== 'user-quiz-details';
// 		},
// 		get hideUserActivity() {
// 			return getContext().activeTab !== 'user-activity';
// 		},
// 	},
// 	actions: {
// 		setTab( event ) {
// 			const context = getContext();
// 			context.activeTab = event.currentTarget.dataset.tab;
// 		},
// 	},
// } );

document.addEventListener( 'DOMContentLoaded', () => {
	document.querySelectorAll( '.wp-block-bys-groups-user-tabs' ).forEach( ( block ) => {
		const tabs   = block.querySelectorAll( '.tab-nav__item' );
		const panels = block.querySelectorAll( '.tab-panel' );

		tabs.forEach( ( tab ) => {
			tab.addEventListener( 'click', () => {
				const target = tab.dataset.tab;

				tabs.forEach( ( t ) => {
					t.classList.toggle( 'tab-nav__item--active', t === tab );
					t.setAttribute( 'aria-selected', t === tab ? 'true' : 'false' );
				} );

				panels.forEach( ( panel ) => {
					const isActive = panel.id === `panel-${ target }`;
					panel.classList.toggle( 'tab-panel--hidden', ! isActive );
					isActive ? panel.removeAttribute( 'hidden' ) : panel.setAttribute( 'hidden', '' );
				} );
			} );
		} );
	} );
} );