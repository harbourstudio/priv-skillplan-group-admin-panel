import { api, endpoints } from '../_shared/api-client.js';

jQuery(document).ready(($) => {
  const params     = new URLSearchParams(window.location.search);
  const activityId = params.get('attempt_id');

  const $block    = $('.wp-block-bys-groups-user-quiz-attempt-detail').first();
  const $loading  = $block.find('.attempt-detail__loading');
  const $filters  = $block.find('.attempt-detail__filters');
  const $list     = $block.find('.attempt-detail__list');
  const $empty    = $block.find('.attempt-detail__empty');
  const $error    = $block.find('.attempt-detail__error');
  const template  = $block.find('#attempt-detail__template-question')[0];

  const RESULT_CONFIG = {
    correct:   { label: 'Correct',           cls: 'result-badge--correct' },
    incorrect: { label: 'Incorrect',         cls: 'result-badge--incorrect' },
    partial:   { label: 'Partially Correct', cls: 'result-badge--partial' },
    ungraded:  { label: 'Ungraded',          cls: 'result-badge--ungraded' },
  };

  // Icon and visual state for each answer choice
  // Note: LearnDash does not store which specific option the user selected for single/multiple
  // choice questions — only overall correctness is available. We therefore only mark which
  // options are correct vs wrong; the card border + badge conveys the overall result.
  const CHOICE_STATES = {
    correct: { icon: 'fa-circle-check', cls: 'answer-choice--correct' },
    wrong:   { icon: 'fa-circle',       cls: '' },
  };

  if (!activityId) {
    $loading.addClass('hidden');
    $error.removeClass('hidden').text('No attempt ID provided.');
    return;
  }

  // ── Render user answer section ──────────────────────────────────────────────

  function renderUserAnswers($card, q) {
    if (!q.user_answers) return;

    // Choice-based (single / multiple)
    if (q.user_answers.type === 'choices') {
      const $answers = $card.find('.question-card__answers');

      q.user_answers.items.forEach((choice) => {
        const state = choice.is_correct ? CHOICE_STATES.correct : CHOICE_STATES.wrong;

        const $item = $('<div class="answer-choice">').addClass(state.cls);
        $item.append(`<i class="fa-regular ${state.icon} answer-choice__icon" aria-hidden="true"></i>`);

        const $text = $('<span class="answer-choice__text">');
        if (choice.is_html) {
          $text.html(choice.text);
        } else {
          $text.text(choice.text);
        }
        $item.append($text);

        $answers.append($item);
      });

      $answers.removeClass('hidden');
      return;
    }

    // Free-text / essay
    if (q.user_answers.type === 'text' && q.user_answers.user_text) {
      $card.find('.question-card__user-text')
        // user_text is sanitized server-side with wp_kses_post
        .html(q.user_answers.user_text)
        .removeClass('hidden');
    }
  }

  // ── Main fetch ──────────────────────────────────────────────────────────────

  (async () => {
    try {
      const questions = await api.get(endpoints.attemptQuestions(activityId));

      $loading.addClass('hidden');

      if (!questions.length) {
        $empty.removeClass('hidden');
        // Notify sidebar with empty array so it can handle gracefully
        $(window).trigger('bysQuestionsRendered', [[]]);
        return;
      }

      questions.forEach((q, index) => {
        const n     = index + 1;
        const node  = template.content.cloneNode(true);
        const $card = $(node);

        // Anchor target + result border colour via class
        const config = RESULT_CONFIG[q.result] ?? RESULT_CONFIG.ungraded;
        $card.find('.question-card')
          .attr('id', `question-${n}`)
          .addClass(`question-card--${q.result}`);

        $card.find('.question-card__number').text(`Q${n}`);

        $card.find('.question-card__result-badge')
          .addClass(`result-badge ${config.cls}`)
          .text(config.label);

        if (q.points_max > 0) {
          $card.find('.question-card__points').text(`${q.points_earned} / ${q.points_max} pts`);
        } else {
          $card.find('.question-card__points').addClass('hidden');
        }

        // question_text is sanitized server-side with wp_kses_post
        $card.find('.question-card__text').html(q.question_text || q.title || '');

        renderUserAnswers($card, q);

        $list.append($card);
      });

      $list.removeClass('hidden');

      // ── Filters ─────────────────────────────────────────────────────────────

      // Count results
      const counts = { all: questions.length, correct: 0, incorrect: 0, partial: 0, ungraded: 0 };
      questions.forEach(q => { if (q.result in counts) counts[q.result]++; });

      // Populate count badges and disable filters with no matches
      $filters.find('.filter-btn').each(function() {
        const filter = $(this).data('filter');
        const count  = counts[filter] ?? 0;
        $(this).find('.filter-btn__count').text(count);
        if (count === 0 && filter !== 'all') {
          $(this).prop('disabled', true);
        }
      });

      $filters.removeClass('hidden');

      // Filter click handler
      $filters.on('click', '.filter-btn:not(:disabled)', function() {
        const filter = $(this).data('filter');
        $filters.find('.filter-btn').removeClass('filter-btn--active');
        $(this).addClass('filter-btn--active');

        $list.find('.question-card').each(function() {
          const matches = filter === 'all' || $(this).hasClass(`question-card--${filter}`);
          $(this).toggleClass('is-hidden', !matches);
        });
      });

      // Notify the sidebar nav with a compact summary of each question's result
      $(window).trigger('bysQuestionsRendered', [
        questions.map((q, i) => ({ index: i + 1, result: q.result }))
      ]);

    } catch (err) {
      console.error('[user-quiz-attempt-detail] Failed to fetch questions:', err);
      $loading.addClass('hidden');
      $error.removeClass('hidden');
    }
  })();
});
