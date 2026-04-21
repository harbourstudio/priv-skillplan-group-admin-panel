import { api, endpoints } from '../_shared/api-client.js';

let currentGroupId = null;
let groupCourses   = [];
let allCourses     = [];
let selectedCourse = null;

function courseTitle(course) {
    return typeof course.title === 'string'
        ? course.title
        : course.title?.rendered || 'Untitled';
}

function buildCourseRow(course) {
    const title    = courseTitle(course);
    const required = course.required === true;

    const $row = jQuery(`
        <div class="course-config__item" data-course-id="${course.id}">
            <span class="course-config__name">${title}</span>
            <div class="course-config__toggle-wrap">
                <span class="course-config__toggle-label${required ? ' is-required' : ''}">${required ? 'Required' : 'Optional'}</span>
                <label class="course-config__toggle">
                    <input type="checkbox" ${required ? 'checked' : ''} />
                    <span class="course-config__slider"></span>
                </label>
            </div>
            <button class="course-config__remove btn-unstyled" type="button" aria-label="Remove course">&#x2715;</button>
        </div>
    `);

    $row.find('input[type="checkbox"]').on('change', async function () {
        const $cb         = jQuery(this);
        const $lbl        = $row.find('.course-config__toggle-label');
        const nowRequired = $cb.prop('checked');

        $lbl.text(nowRequired ? 'Required' : 'Optional').toggleClass('is-required', nowRequired);
        course.required = nowRequired;
        $cb.prop('disabled', true);

        try {
            await api.post(endpoints.toggleRequiredCourse(currentGroupId, course.id));
            api.invalidate(`groups/${currentGroupId}/courses`);
        } catch (err) {
            console.error('[course-config] Toggle required failed', err);
            course.required = !nowRequired;
            $cb.prop('checked', !nowRequired);
            $lbl.text(!nowRequired ? 'Required' : 'Optional').toggleClass('is-required', !nowRequired);
        } finally {
            $cb.prop('disabled', false);
        }
    });

    $row.find('.course-config__remove').on('click', async function () {
        const $btn = jQuery(this);
        if (!window.confirm(`Remove "${title}" from this group?`)) return;
        $btn.prop('disabled', true);

        try {
            await api.post(endpoints.removeGroupCourse(currentGroupId, course.id));
            groupCourses = groupCourses.filter((c) => c.id !== course.id);
            api.invalidate(`groups/${currentGroupId}/courses`);
            $row.fadeOut(200, () => $row.remove());
        } catch (err) {
            console.error('[course-config] Remove failed', err);
            $btn.prop('disabled', false);
        }
    });

    return $row;
}

jQuery(document).ready(async ($) => {
    const $block       = $('.wp-block-bys-groups-group-course-config').first();
    if (!$block.length) return;

    const $skeleton    = $block.find('.course-config__skeleton');
    const $list        = $block.find('.course-config__list');
    const $empty       = $block.find('.course-config__empty');
    const $search      = $block.find('.course-config__search');
    const $addBtn      = $block.find('.course-config__add-btn');
    const $suggestions = $block.find('.course-config__suggestions');

    function renderList() {
        $list.empty();
        if (!groupCourses.length) {
            $empty.text('No courses added to this group yet.').show();
            return;
        }
        $empty.hide();
        groupCourses.forEach((course) => $list.append(buildCourseRow(course)));
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
            $suggestions.append('<li class="course-suggestion course-suggestion--empty" role="option">No courses found</li>');
        } else {
            matches.forEach((c) => {
                $suggestions.append(
                    `<li class="course-suggestion" role="option" data-course-id="${c.id}" data-course-title="${c.title.replace(/"/g, '&quot;')}">${c.title}</li>`
                );
            });
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

    $suggestions.on('mousedown', '.course-suggestion:not(.course-suggestion--empty)', function (e) {
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
        if (!$(e.target).closest('.course-config__search-wrap').length) {
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
            groupCourses = await api.get(endpoints.groupCourses(currentGroupId), true);
            $search.val('');
            selectedCourse = null;
            renderList();
        } catch (err) {
            console.error('[course-config] Add course failed', err);
        } finally {
            $addBtn.prop('disabled', !selectedCourse).text('Add');
        }
    });

    // ── Group selected ────────────────────────────────────────────────────────

    $(document).on('bys:groupSelected', (_, { groupId, courses }) => {
        currentGroupId = groupId;
        selectedCourse = null;
        allCourses     = [];

        $search.val('');
        $addBtn.prop('disabled', true);
        hideSuggestions();

        $skeleton.show();
        $list.empty();
        $empty.hide();

        groupCourses = Array.isArray(courses) ? courses : [];
        $skeleton.hide();
        renderList();
    });

    if (window.bysGroupData?.courses) {
        currentGroupId = window.bysGroupData.groupId;
        groupCourses   = window.bysGroupData.courses;
        renderList();
    }
});
