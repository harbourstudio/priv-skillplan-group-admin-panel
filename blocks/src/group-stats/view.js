/**
 * Group Stats Block - Frontend View
 * Listens for group selection changes and updates stat numbers
 */

jQuery(document).ready(($) => {
  // Listen for group selection event from group-select block
  $(document).on('bys:groupSelected', (_, { stats }) => {
    $('[data-bys-stat="total_members"]').text(stats.total_members ?? 0);
    $('[data-bys-stat="completed_courses"]').text(
      stats.completed_courses ?? 0
    );
    $('[data-bys-stat="incomplete_courses"]').text(
      stats.incomplete_courses ?? 0
    );
    $('[data-bys-stat="total_inactive_members"]').text(
      stats.total_inactive_members ?? 0
    );
  });
});
