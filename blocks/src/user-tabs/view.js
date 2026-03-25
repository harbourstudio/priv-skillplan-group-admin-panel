jQuery(document).ready(($) => {
	const $block = $('.wp-block-bys-groups-user-tabs').first(); // only one instance per page
	const $tabs = $block.find('.tab-nav__item');
	const $panels = $block.find('.tab-panel');

	$tabs.on('click', function() {
		const $clickedTab = $(this);
		const target = $clickedTab.data('tab');

		// Update tab active states
		$tabs.each(function() {
			const $tab = $(this);
			const isActive = $tab[0] === $clickedTab[0];
			$tab.toggleClass('tab-nav__item--active', isActive);
			$tab.attr('aria-selected', isActive ? 'true' : 'false');
		});

		// Update panel visibility
		$panels.each(function() {
			const $panel = $(this);
			const panelTarget = $panel.attr('id').replace('panel-', '');
			const isActive = panelTarget === target;

			$panel.toggleClass('tab-panel--hidden', !isActive);
			isActive ? $panel.removeAttr('hidden') : $panel.attr('hidden', '');

			// Trigger jQuery custom event when tab is activated for lazy-loading blocks
			if (isActive) {
				$(window).trigger('bysUserTabActivated', [target]);
			}
		});
	});
});