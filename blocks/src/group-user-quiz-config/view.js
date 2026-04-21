import { api, endpoints } from '../_shared/api-client.js';

let allMembers = [];  // [{ id, display_name, first_name, last_name, email }]
let allQuizzes = [];  // [{ step_id, step_title, course_name }]

let selectedUserId = null;
let selectedQuizId = null;

function courseTitle(course) {
    return typeof course.title === 'string'
        ? course.title
        : course.title?.rendered || 'Untitled';
}

jQuery(document).ready(($) => {
    const $block      = $('.wp-block-bys-groups-group-user-quiz-config').first();
    if (!$block.length) return;

    const $learnerInput = $block.find('#uqc-learner-search');
    const $learnerList  = $block.find('.uqc-suggestions--learner');
    const $quizInput    = $block.find('#uqc-quiz-search');
    const $quizList     = $block.find('.uqc-suggestions--quiz');
    const $saveBtn      = $block.find('.uqc-btn-primary');
    const $notifyBtn    = $block.find('.uqc-btn-outline');

    function updateActions() {
        $saveBtn.prop('disabled', !(selectedUserId && selectedQuizId));
        $notifyBtn.prop('disabled', !selectedUserId);
    }

    // ── Learner suggestions ───────────────────────────────────────────────────

    function showLearnerSuggestions(query) {
        const q = query.toLowerCase().trim();
        const matches = (q
            ? allMembers.filter((m) =>
                m.display_name.toLowerCase().includes(q) ||
                m.first_name.toLowerCase().includes(q)   ||
                m.last_name.toLowerCase().includes(q)    ||
                m.email.toLowerCase().includes(q)
            )
            : allMembers
        ).slice(0, 10);

        $learnerList.empty();
        if (!matches.length) {
            $learnerList.append('<li class="uqc-suggestion uqc-suggestion--empty" role="option">No learners found</li>');
        } else {
            matches.forEach((m) => {
                $learnerList.append(
                    `<li class="uqc-suggestion" role="option"
                        data-user-id="${m.id}"
                        data-display-name="${m.display_name.replace(/"/g, '&quot;')}">
                        <span class="uqc-suggestion__name">${$('<span>').text(m.display_name).html()}</span>
                        <span class="uqc-suggestion__meta">${$('<span>').text(m.email).html()}</span>
                    </li>`
                );
            });
        }
        $learnerList.removeClass('hidden');
    }

    function hideLearnerSuggestions() {
        $learnerList.addClass('hidden').empty();
    }

    $learnerInput.on('focus', function () {
        showLearnerSuggestions($(this).val());
    });

    $learnerInput.on('input', function () {
        selectedUserId = null;
        updateActions();
        showLearnerSuggestions($(this).val());
    });

    $learnerList.on('mousedown', '.uqc-suggestion:not(.uqc-suggestion--empty)', function (e) {
        e.preventDefault();
        selectedUserId = parseInt($(this).data('userId'), 10);
        $learnerInput.val($(this).data('displayName'));
        updateActions();
        hideLearnerSuggestions();
    });

    // ── Quiz suggestions ──────────────────────────────────────────────────────

    function showQuizSuggestions(query) {
        const q = query.toLowerCase().trim();
        const matches = (q
            ? allQuizzes.filter((qz) =>
                qz.step_title.toLowerCase().includes(q) ||
                qz.course_name.toLowerCase().includes(q)
            )
            : allQuizzes
        ).slice(0, 10);

        $quizList.empty();
        if (!matches.length) {
            $quizList.append('<li class="uqc-suggestion uqc-suggestion--empty" role="option">No quizzes found</li>');
        } else {
            matches.forEach((qz) => {
                $quizList.append(
                    `<li class="uqc-suggestion" role="option"
                        data-step-id="${qz.step_id}"
                        data-step-title="${qz.step_title.replace(/"/g, '&quot;')}">
                        <span class="uqc-suggestion__name">${$('<span>').text(qz.step_title).html()}</span>
                        <span class="uqc-suggestion__meta">${$('<span>').text(qz.course_name).html()}</span>
                    </li>`
                );
            });
        }
        $quizList.removeClass('hidden');
    }

    function hideQuizSuggestions() {
        $quizList.addClass('hidden').empty();
    }

    $quizInput.on('focus', function () {
        showQuizSuggestions($(this).val());
    });

    $quizInput.on('input', function () {
        selectedQuizId = null;
        updateActions();
        showQuizSuggestions($(this).val());
    });

    $quizList.on('mousedown', '.uqc-suggestion:not(.uqc-suggestion--empty)', function (e) {
        e.preventDefault();
        selectedQuizId = parseInt($(this).data('stepId'), 10);
        $quizInput.val($(this).data('stepTitle'));
        updateActions();
        hideQuizSuggestions();
    });

    // ── Click outside to close ────────────────────────────────────────────────

    const $learnerWrap = $learnerInput.closest('.uqc-combobox-wrap');
    const $quizWrap    = $quizInput.closest('.uqc-combobox-wrap');

    $(document).on('click.uqc', (e) => {
        const $t = $(e.target);
        if (!$t.closest($learnerWrap).length) {
            hideLearnerSuggestions();
            if (!selectedUserId) $learnerInput.val('');
        }
        if (!$t.closest($quizWrap).length) {
            hideQuizSuggestions();
            if (!selectedQuizId) $quizInput.val('');
        }
    });

    // ── Data loading ──────────────────────────────────────────────────────────

    async function loadMembers(groupId, userIds) {
        if (!userIds?.length) { allMembers = []; return; }
        try {
            const users = await api.get(endpoints.groupUsers(groupId, userIds.join(',')));
            allMembers = (Array.isArray(users) ? users : []).map((u) => ({
                id:           u.id,
                display_name: `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.display_name || '',
                first_name:   u.first_name || '',
                last_name:    u.last_name  || '',
                email:        u.email      || '',
            }));
        } catch (err) {
            console.error('[uqc] Failed to load members', err);
            allMembers = [];
        }
    }

    async function loadQuizzes(courses) {
        if (!courses?.length) { allQuizzes = []; return; }
        try {
            const results = await Promise.all(
                courses.map(async (course) => {
                    try {
                        const steps = await api.get(endpoints.courseQuizSteps(course.id));
                        const name  = courseTitle(course);
                        return (Array.isArray(steps) ? steps : []).map((s) => ({
                            step_id:     s.step_id,
                            step_title:  s.step_title,
                            course_name: name,
                        }));
                    } catch {
                        return [];
                    }
                })
            );
            allQuizzes = results.flat();
        } catch (err) {
            console.error('[uqc] Failed to load quizzes', err);
            allQuizzes = [];
        }
    }

    async function init(groupId, baseUsersStats, courses) {
        selectedUserId = null;
        selectedQuizId = null;
        $learnerInput.val('');
        $quizInput.val('');
        hideLearnerSuggestions();
        hideQuizSuggestions();
        updateActions();

        const userIds = baseUsersStats?.user_ids || [];
        await Promise.all([
            loadMembers(groupId, userIds),
            loadQuizzes(courses),
        ]);
    }

    $(document).on('bys:groupSelected', (_, { groupId, baseUsersStats, courses }) => {
        init(groupId, baseUsersStats, Array.isArray(courses) ? courses : []);
    });

    if (window.bysGroupData?.groupId) {
        init(
            window.bysGroupData.groupId,
            window.bysGroupData.baseUsersStats,
            window.bysGroupData.courses || []
        );
    }
});
