<?php
$wrapper_attributes = get_block_wrapper_attributes( [
	'data-wp-interactive' => 'bys-groups/user-tabs',
	'data-wp-context'     => wp_json_encode( [ 'activeTab' => 'user-progress' ] ),
] );
?>

<div <?= $wrapper_attributes; ?>>

	<nav class="tab-nav" role="tablist" aria-label="User Detail Navigation">
		<button
			class="tab-nav__item btn-unstyled"
			role="tab"
			type="button"
			id="tab-user-progress"
			aria-controls="panel-user-progress"
			data-tab="user-progress"
			data-wp-on--click="actions.setTab"
			data-wp-class--tab-nav__item--active="state.isUserProgress"
			data-wp-attr--aria-selected="state.isUserProgress"
		>
			User Progress
		</button>
		<button
			class="tab-nav__item btn-unstyled"
			role="tab"
			type="button"
			id="tab-user-quiz-details"
			aria-controls="panel-user-quiz-details"
			data-tab="user-quiz-details"
			data-wp-on--click="actions.setTab"
			data-wp-class--tab-nav__item--active="state.isQuizDetails"
			data-wp-attr--aria-selected="state.isQuizDetails"
		>
			Quiz Details
		</button>
		<button
			class="tab-nav__item btn-unstyled"
			role="tab"
			type="button"
			id="tab-user-activity"
			aria-controls="panel-user-activity"
			data-tab="user-activity"
			data-wp-on--click="actions.setTab"
			data-wp-class--tab-nav__item--active="state.isUserActivity"
			data-wp-attr--aria-selected="state.isUserActivity"
		>
			User Activity
		</button>
	</nav>

	<div class="tab-panels">
		<div
			class="tab-panel"
			role="tabpanel"
			id="panel-user-progress"
			aria-labelledby="tab-user-progress"
			data-wp-class--tab-panel--hidden="state.hideUserProgress"
			data-wp-attr--hidden="state.hideUserProgress"
		>
			<?= do_blocks( '<!-- wp:bys-groups/user-progress /-->' ); ?>
		</div>
		<div
			class="tab-panel"
			role="tabpanel"
			id="panel-user-quiz-details"
			aria-labelledby="tab-user-quiz-details"
			data-wp-class--tab-panel--hidden="state.hideQuizDetails"
			data-wp-attr--hidden="state.hideQuizDetails"
		>
			<?= do_blocks( '<!-- wp:bys-groups/user-quiz-details /-->' ); ?>
		</div>
		<div
			class="tab-panel"
			role="tabpanel"
			id="panel-user-activity"
			aria-labelledby="tab-user-activity"
			data-wp-class--tab-panel--hidden="state.hideUserActivity"
			data-wp-attr--hidden="state.hideUserActivity"
		>
			<?= do_blocks( '<!-- wp:bys-groups/user-activity /-->' ); ?>
		</div>
	</div>

</div>
