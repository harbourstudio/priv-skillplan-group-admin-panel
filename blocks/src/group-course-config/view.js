import { api, endpoints } from '../_shared/api-client.js';
import { bysConfirm } from '../_shared/confirm.js';
import store from '../_shared/store.js';

let currentGroupId = null;
let groupCourses   = [];
let allCourses     = [];
let selectedCourse = null;

// Titles arrive pre-decoded from the server (see normalize_course_title in
// class-groups-router.php). The client treats them as plain text — `.text()`
// and `.attr()` re-encode at insertion time, so no XSS surface.
function courseTitle(course) {
    return typeof course.title === 'string'
        ? course.title
        : course.title?.rendered || 'Untitled';
}

function buildCourseRow(course) {
    const title    = courseTitle(course);
    const required = course.required === true;

    // Clone the #gcc__template-item <template> and fill
    const template = document.getElementById('gcc__template-item');
    const $row = jQuery(template.content.cloneNode(true)).find('.gcc__item');

    $row.attr('data-course-id', course.id);
    $row.find('.gcc__name').text(title);

    const $label = $row.find('.gcc__toggle-label');
    $label.text(required ? 'Required' : 'Optional').toggleClass('is-required', required);

    const $checkbox = $row.find('input[type="checkbox"]');
    $checkbox.prop('checked', required);

    $checkbox.on('change', async function () {
        const $cb         = jQuery(this);
        const nowRequired = $cb.prop('checked');

        $label.text(nowRequired ? 'Required' : 'Optional').toggleClass('is-required', nowRequired);
        course.required = nowRequired;
        $cb.prop('disabled', true);

        try {
            await api.post(endpoints.toggleRequiredCourse(currentGroupId, course.id));
            api.invalidate(`groups/${currentGroupId}/courses`);
            // Mutation write-through: flip required flag in the cached course
            // shape so other blocks see the new state on next page nav.
            const cachedCourses = store.getCourses();
            if (Array.isArray(cachedCourses)) {
                store.setCourses(cachedCourses.map((c) =>
                    c.id === course.id ? { ...c, required: nowRequired } : c
                ));
            }
        } catch (err) {
            console.error('[course-config] Toggle required failed', err);
            course.required = !nowRequired;
            $cb.prop('checked', !nowRequired);
            $label.text(!nowRequired ? 'Required' : 'Optional').toggleClass('is-required', !nowRequired);
        } finally {
            $cb.prop('disabled', false);
        }
    });

    const $removeBtn = $row.find('.gcc__remove');
    $removeBtn.attr('aria-label', `Remove ${title}`);

    $removeBtn.on('click', async function () {
        const $btn = jQuery(this);
        if (!await bysConfirm(`Remove "${title}" from this group?`, 'Remove')) return;
        $btn.prop('disabled', true);

        try {
            await api.post(endpoints.removeGroupCourse(currentGroupId, course.id));
            groupCourses = groupCourses.filter((c) => c.id !== course.id);
            api.invalidate(`groups/${currentGroupId}/courses`);
            // Mutation write-through: drop the removed course from the cache.
            const cachedCourses = store.getCourses();
            if (Array.isArray(cachedCourses)) {
                store.setCourses(cachedCourses.filter((c) => c.id !== course.id));
            }
            onRemove($row);
        } catch (err) {
            console.error('[course-config] Remove failed', err);
            $btn.prop('disabled', false);
        }
    });

    return $row;
}

// Build a single suggestion <li> from the #gcc__template-suggestion template.
function buildSuggestion(course) {
    const template = document.getElementById('gcc__template-suggestion');
    const $li = jQuery(template.content.cloneNode(true)).find('.gcc__suggestion');
    $li.attr('data-course-id', course.id);
    $li.attr('data-course-title', course.title);
    $li.text(course.title);
    return $li;
}

let $messageEl = null;

function showMessage(text, variant) {
    if (!$messageEl) return;
    $messageEl
        .removeClass('gcc__message--empty gcc__message--error')
        .addClass(`gcc__message--${variant}`)
        .text(text)
        .show();
}

function hideMessage() {
    if (!$messageEl) return;
    $messageEl.hide().text('').removeClass('gcc__message--empty gcc__message--error');
}

// Build N row nodes into a single DocumentFragment — one reflow on insert
// instead of one per append.
function buildRowsFragment(courses) {
    const frag = document.createDocumentFragment();
    courses.forEach((c) => {
        const $r = buildCourseRow(c);
        frag.appendChild($r[0]);
    });
    return frag;
}

function onRemove($row) {
    $row.fadeOut(200, () => {
        $row.remove();
        if (!groupCourses.length) {
            showMessage('No courses added to this group yet.', 'empty');
        }
    });
}

jQuery(document).ready(async ($) => {
    const $block       = $('.wp-block-bys-groups-group-course-config').first();
    if (!$block.length) return;

    const $skeleton    = $block.find('.gcc__skeleton');
    const $list        = $block.find('.gcc__list');
    const $message     = $block.find('.gcc__message');
    const $search      = $block.find('.gcc__search');
    const $addBtn      = $block.find('.gcc__add-btn');
    const $suggestions = $block.find('.gcc__suggestions');

    $messageEl = $message;

    function renderList() {
        $list.empty();
        if (!groupCourses.length) {
            showMessage('No courses added to this group yet.', 'empty');
            return;
        }
        hideMessage();
        $list[0].appendChild(buildRowsFragment(groupCourses));
    }

    // ── Autocomplete ──────────────────────────────────────────────────────────

    async function ensureAllCourses() {
        if (allCourses.length) return;
        try {
            allCourses = await api.get(endpoints.allCourses());
        } catch (e) {
            allCourses = [];
        }
    }

    function showSuggestions(query) {
        const q        = query.toLowerCase().trim();
        const addedIds = new Set(groupCourses.map((c) => c.id));
        const matches  = allCourses
            .filter((c) => !addedIds.has(c.id) && (!q || c.title.toLowerCase().includes(q)))
            .slice(0, 8);

        $suggestions.empty();

        if (!matches.length) {
            const $empty = jQuery('<li class="gcc__suggestion gcc__suggestion--empty" role="option"></li>')
                .text('No courses found');
            $suggestions.append($empty);
        } else {
            const frag = document.createDocumentFragment();
            matches.forEach((c) => frag.appendChild(buildSuggestion(c)[0]));
            $suggestions[0].appendChild(frag);
        }

        $suggestions.removeClass('hidden');
    }

    function hideSuggestions() {
        $suggestions.addClass('hidden').empty();
    }

    $search.on('focus', async function () {
        await ensureAllCourses();
        showSuggestions($(this).val());
    });

    $search.on('input', async function () {
        await ensureAllCourses();
        selectedCourse = null;
        $addBtn.prop('disabled', true);
        showSuggestions($(this).val());
    });

    $suggestions.on('mousedown', '.gcc__suggestion:not(.gcc__suggestion--empty)', function (e) {
        e.preventDefault();
        selectedCourse = {
            id:    parseInt($(this).data('courseId'), 10),
            title: $(this).data('courseTitle'),
        };
        $search.val(selectedCourse.title);
        $addBtn.prop('disabled', false);
        hideSuggestions();
    });

    $(document).on('click.courseConfig', (e) => {
        if (!$(e.target).closest('.gcc__search-wrap').length) {
            hideSuggestions();
            if (!selectedCourse) $search.val('');
        }
    });

    // ── Add course ────────────────────────────────────────────────────────────

    $addBtn.on('click', async () => {
        if (!selectedCourse || !currentGroupId) return;
        $addBtn.prop('disabled', true).text('Adding…');

        try {
            await api.post(endpoints.addGroupCourse(currentGroupId, selectedCourse.id));
            // Re-fetch the canonical course list (includes the new course AND
            // its baked quizzes_show_test_grading_config / _reporting fields).
            groupCourses = await api.get(endpoints.groupCourses(currentGroupId), true);
            // Mutation write-through: replace the cache with the fresh response.
            store.setCourses(Array.isArray(groupCourses) ? groupCourses : []);
            $search.val('');
            selectedCourse = null;
            renderList();
        } catch (err) {
            console.error('[course-config] Add course failed', err);
            showMessage('Could not add course. Please try again.', 'error');
        } finally {
            $addBtn.prop('disabled', !selectedCourse).text('Add');
        }
    });

    // ── Group selected ────────────────────────────────────────────────────────

    $(document).on('bys:groupSelected', (_, { groupId }) => {
        // courses come from the store — group-select writes them before firing.
        const courses = store.getCourses() || [];
        const isSiteEditor = window.bysGroupsAuth?.isSiteEditor === true;
        currentGroupId = groupId;
        selectedCourse = null;
        allCourses     = [];

        $search.val('');
        $addBtn.prop('disabled', true);
        hideSuggestions();

        // Show/hide the entire add-course form for site editors
        $block.find('.gcc__add').toggle(!isSiteEditor);

        $skeleton.show();
        $list.empty();
        hideMessage();

        groupCourses = Array.isArray(courses) ? courses : [];
        $skeleton.hide();
        renderList();

        // Hide per-row remove and required toggle for site editors
        if (isSiteEditor) {
            $list.find('.gcc__remove, .gcc__toggle').hide();
        }
    });

    // Fast first paint: if the store has courses cached from a prior page in
    // this session, render the list immediately. The bys:groupSelected handler
    // above will re-render with fresh data shortly after.
    const cachedGroupId = store.getCurrentGroup();
    const cachedCourses = store.getCourses();
    if (cachedGroupId !== null && cachedCourses !== null) {
        currentGroupId = cachedGroupId;
        groupCourses   = cachedCourses;
        renderList();
        $skeleton.hide();
    }
});
