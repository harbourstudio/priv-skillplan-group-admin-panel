<?php
$wrapper_attributes = get_block_wrapper_attributes();
?>

<div <?= $wrapper_attributes; ?>>

	<nav class="tab-nav" role="tablist" aria-label="User Detail Navigation">
		<button
			class="tab-nav__item btn-unstyled tab-nav__item--active"
			role="tab"
			type="button"
			id="tab-user-progress"
			aria-controls="panel-user-progress"
			aria-selected="true"
			data-tab="user-progress"
		>
			User Progress
		</button>
		<button
			class="tab-nav__item btn-unstyled"
			role="tab"
			type="button"
			id="tab-user-quiz-details"
			aria-controls="panel-user-quiz-details"
			aria-selected="false"
			data-tab="user-quiz-details"
		>
			Quiz Details
		</button>
		<button
			class="tab-nav__item btn-unstyled"
			role="tab"
			type="button"
			id="tab-user-activity"
			aria-controls="panel-user-activity"
			aria-selected="false"
			data-tab="user-activity"
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
		>
			<?= do_blocks( '<!-- wp:bys-groups/user-progress /-->' ); ?>
		</div>
		<div
			class="tab-panel tab-panel--hidden"
			role="tabpanel"
			id="panel-user-quiz-details"
			aria-labelledby="tab-user-quiz-details"
			hidden
		>
			<?= do_blocks( '<!-- wp:bys-groups/user-quiz-details /-->' ); ?>
		</div>
		<div
			class="tab-panel tab-panel--hidden"
			role="tabpanel"
			id="panel-user-activity"
			aria-labelledby="tab-user-activity"
			hidden
		>
			<?= do_blocks( '<!-- wp:bys-groups/user-activity /-->' ); ?>
		</div>
	</div>

</div>