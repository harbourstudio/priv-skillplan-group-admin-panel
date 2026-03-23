/******/ (() => { // webpackBootstrap
/*!*********************************!*\
  !*** ./src/group-stats/view.js ***!
  \*********************************/
jQuery(document).ready($ => {
  const $block = $('.wp-block-bys-groups-group-stats').first(); // will only have 1 instance of this block per page
  if (!$block) return;
  const $totalMembers = $block.find('[data-bys-stat="total_members"');
  const $completedCourses = $block.find('[data-bys-stat="completed_courses"]');
  const $incompleteCourses = $block.find('[data-bys-stat="incomplete_courses"]');
  const $totalInactiveMembers = $block.find('[data-bys-stat="total_inactive_members"]');

  // listen for the custom jquery event triggered by group-select block
  $(document).on('bys:groupSelected', async (_, {
    baseUsersStats
  }) => {
    // Update base stats immediately
    $totalMembers.html(baseUsersStats.total_members ?? 0);
    $totalInactiveMembers.html(baseUsersStats.total_inactive_members ?? 0);
  });
});
/******/ })()
;
//# sourceMappingURL=view.js.map