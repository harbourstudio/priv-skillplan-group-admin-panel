import { store, getContext } from '@wordpress/interactivity';

store( 'bys-groups/user-tabs', {
	state: {
		get isUserProgress() {
			return getContext().activeTab === 'user-progress';
		},
		get isQuizDetails() {
			return getContext().activeTab === 'user-quiz-details';
		},
		get isUserActivity() {
			return getContext().activeTab === 'user-activity';
		},
		get hideUserProgress() {
			return getContext().activeTab !== 'user-progress';
		},
		get hideQuizDetails() {
			return getContext().activeTab !== 'user-quiz-details';
		},
		get hideUserActivity() {
			return getContext().activeTab !== 'user-activity';
		},
	},
	actions: {
		setTab( event ) {
			const context = getContext();
			context.activeTab = event.currentTarget.dataset.tab;
		},
	},
} );
