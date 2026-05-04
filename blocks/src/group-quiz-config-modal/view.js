import { api, endpoints } from '../_shared/api-client.js';

jQuery(document).ready(($) => {
    const $block    = $('.wp-block-bys-groups-group-quiz-config-modal').first();
    if (!$block.length) return;

    const $modal    = $block.find('#quiz-attempts-modal');
    const $backdrop = $modal.find('.modal-backdrop');
    const $body     = $modal.find('.modal__body');
    const $title    = $modal.find('.quiz-title');
    const $meta     = $modal.find('.quiz-meta');

    function closeModal() {
        $modal.addClass('hidden');
        $('html').css('overflow', '');
    }

    $modal.find('.modal__close').on('click', closeModal);
    $backdrop.on('click', closeModal);

    $(document).on('keydown.quizConfigModal', (e) => {
        if (e.key === 'Escape' && !$modal.hasClass('hidden')) closeModal();
    });

    function esc(str) {
        return $('<span>').text(str || '').html();
    }

    function initials(name) {
        const parts = (name || '').trim().split(/\s+/);
        if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        return (parts[0]?.[0] || '?').toUpperCase();
    }

    function buildUserRow(displayName, email, status, attemptCount) {
        const labelMap = {
            completed:    'Completed',
            not_attempted: 'Not Attempted',
        };
        const attemptsHtml = attemptCount > 0
            ? `<span class="quiz-attempts-count">${attemptCount} ${attemptCount === 1 ? 'attempt' : 'attempts'}</span>`
            : `<span class="quiz-attempts-count quiz-attempts-count--none">—</span>`;
        return `
            <div class="quiz-user-row">
                <div class="quiz-user-avatar" aria-hidden="true">${esc(initials(displayName))}</div>
                <div class="quiz-user-info">
                    <span class="quiz-user-name">${esc(displayName)}</span>
                    <span class="quiz-user-email">${esc(email)}</span>
                </div>
                ${attemptsHtml}
                <span class="quiz-status-badge quiz-status-badge--${status}">${labelMap[status] || status}</span>
            </div>
        `;
    }

    function renderSkeleton() {
        let html = '';
        for (let i = 0; i < 6; i++) {
            html += `
                <div class="quiz-user-row">
                    <div class="quiz-user-avatar quiz-user-avatar--skeleton"></div>
                    <div class="quiz-user-info">
                        <span class="skeleton-text" style="width:${120 + i * 18}px"></span>
                        <span class="skeleton-text" style="width:${150 + i * 12}px;height:0.6rem;margin-top:4px"></span>
                    </div>
                    <span class="skeleton-btn" style="width:80px"></span>
                </div>
            `;
        }
        $body.html(html);
    }

    async function loadQuizData(groupId, quizId, quizName) {
        $title.text(quizName);
        $meta.html('Loading…');
        renderSkeleton();

        try {
            const attempts = await api.get(endpoints.groupQuizAttempts(groupId, quizId));

            // Count and deduplicate attempts per user — endpoint returns desc by completed
            const bestByUser   = {};
            const countByUser  = {};
            (Array.isArray(attempts) ? attempts : []).forEach((a) => {
                countByUser[a.user_id] = (countByUser[a.user_id] || 0) + 1;
                if (!bestByUser[a.user_id]) bestByUser[a.user_id] = a;
            });

            // Any submission (regardless of pass/fail) = Completed
            const attempted = Object.values(bestByUser)
                .filter((a) => a.completed_gmt !== null)
                .map((a) => ({
                    user_id:      a.user_id,
                    display_name: a.display_name || `${a.first_name} ${a.last_name}`.trim(),
                    email:        a.email || '',
                    status:       'completed',
                    attempts:     countByUser[a.user_id] || 1,
                }));

            // Find members with no attempts at all
            const attemptedIds  = new Set(attempted.map((u) => u.user_id));
            const allMemberIds  = window.bysGroupData?.baseUsersStats?.user_ids || [];
            const notAttemptIds = allMemberIds.filter((id) => !attemptedIds.has(id));

            let notAttempted = [];
            if (notAttemptIds.length) {
                try {
                    const users = await api.get(endpoints.groupUsers(groupId, notAttemptIds.join(',')));
                    notAttempted = (Array.isArray(users) ? users : []).map((u) => ({
                        display_name: u.display_name || `${u.first_name} ${u.last_name}`.trim(),
                        email:        u.email || '',
                        status:       'not_attempted',
                        attempts:     0,
                    }));
                } catch {
                    notAttempted = notAttemptIds.map((id) => ({
                        display_name: `Member #${id}`,
                        email:        '',
                        status:       'not_attempted',
                        attempts:     0,
                    }));
                }
            }

            const completedCount    = attempted.length;
            const notAttemptedCount = notAttempted.length;

            $meta.html(
                `<span class="quiz-completed-count">${completedCount}</span> completed` +
                ` &bull; ` +
                `<span class="quiz-outstanding-count">${notAttemptedCount}</span> not attempted`
            );

            const sorted = [...attempted, ...notAttempted];

            if (!sorted.length) {
                $body.html('<p class="quiz-modal-empty">No members found for this group.</p>');
                return;
            }

            $body.html(sorted.map((u) => buildUserRow(u.display_name, u.email, u.status, u.attempts)).join(''));
        } catch (err) {
            console.error('[quiz-config-modal] Failed to load quiz attempts', err);
            $body.html('<p class="quiz-modal-empty">Failed to load data. Please try again.</p>');
        }
    }

    $(document).on('quiz:open', (_, { quizId, quizName }) => {
        const groupId = window.bysGroupData?.groupId;
        if (!groupId || !quizId) return;
        loadQuizData(groupId, quizId, quizName);
    });

    new MutationObserver(() => {
        $('html').css('overflow', $modal.hasClass('hidden') ? '' : 'hidden');
    }).observe($modal[0], { attributes: true, attributeFilter: ['class'] });
});
