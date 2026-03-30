import { api, endpoints } from '../_shared/api-client.js';
import { formatScore, formatDate, formatTime, formatDateTime } from '../_shared/helpers.js';
import { createTooltip, destroyTooltip } from '../_shared/tooltip.js';

jQuery(document).ready(($) => {
  const $block = $('.wp-block-bys-groups-user-quiz-attempts-modal').first();
  const $modal = $block.find('#quiz-attempts-modal');
  const $modalTbody = $modal.find('tbody');
  const rowTemplate = $block.find('#user-quiz-attempts-modal__template-row')[0];

  // Listen for quiz attempts request from user-quiz-details block
  $(window).on('bysQuizAttemptsOpen', async function(_event, data) {

    $modal.find('.quiz-title').html(data.quizTitle);
    $modal.find('.course-title').html(data.parentCourse);

    // Clear and show loading state
    $modalTbody.html('<tr><td"Loading attempts...</td></tr>');

    try {
      // Fetch attempt details from API
      const attempts = await api.get(
        endpoints.userQuizAttemptsDetails(data.userId, data.quizId)
      );

      // Clear and populate attempt rows
      $modalTbody.empty();

      if (Array.isArray(attempts) && attempts.length > 0) {
        attempts.forEach((attempt, index) => {
          const rowNode = rowTemplate.content.cloneNode(true);
          const $row = $(rowNode);

          $row.find('.cell_attempt_index').text(index + 1);
          const $attemptDate = $row.find('.cell_attempt_date');
          $attemptDate.text(formatDate(attempt.completed)).attr('data-tooltip', attempt.completed_gmt ? formatDateTime(attempt.completed_gmt) : '—');
          $row.find('.cell_attempt_score').text(formatScore(attempt.percentage, attempt.points_scored, attempt.points_total));

          const $statusBadge = $row.find('.status-badge');
          if (attempt.pass) {
            $statusBadge.addClass('status-badge--pass').text('Pass');
          } else {
            $statusBadge.addClass('status-badge--fail').text('Fail');
          }

          $modalTbody.append($row);
        });

        // Initialize tooltips on attempt date cells
        $modalTbody.on('mouseenter', '[data-tooltip]', function () {
          createTooltip($(this), $(this).attr('data-tooltip'));
        });
        $modalTbody.on('mouseleave', '[data-tooltip]', function () {
          destroyTooltip();
        });
      } else {
        $modalTbody.html('<tr><td>No attempts found.</td></tr>');
      }
    } catch (err) {
      console.error('[user-quiz-attempts-modal] Failed to fetch quiz attempts:', err);
      $modalTbody.html('<tr><td>Failed to load attempts.</td></tr>');
    }

    // Open modal
    $modal.removeClass('hidden').addClass('open');
        $('html').css('overflow', 'hidden');


    // Initialize Preline components
    if (typeof HSStaticMethods !== 'undefined') {
      HSStaticMethods.autoInit();
    }
  });

  // Close modal handlers
  $modal.find('[data-hs-overlay]').on('click', function(e) {
    e.stopPropagation();
    $modal.addClass('hidden').removeClass('open');
    $('html').css('overflow', 'unset');
  });
});