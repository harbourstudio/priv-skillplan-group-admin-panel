<?php
/**
 * Course Prerequisites class.
 *
 * Manages per-group course prerequisite locking. A course in a group can be
 * "locked" until one or more other group courses are fully completed by the user.
 *
 * Data is stored as _bys_course_prerequisites on the group post:
 *   [ course_id => [ prereq_course_id, ... ], ... ]
 *
 * Form prerequisites are stored as _bys_form_prerequisites on the group post:
 *   [ course_id => [ form_id, ... ], ... ]
 *
 * @package BYS_Groups
 * @since 1.2.0
 */
if (!defined('ABSPATH')) exit;

if (!class_exists('BYS_Groups_Prerequisites')) {
    class BYS_Groups_Prerequisites {

        const META_KEY       = '_bys_course_prerequisites';
        const FORMS_META_KEY = '_bys_form_prerequisites';
        const REST_NS        = 'bys-groups/v1';

        public function __construct() {
            add_action('rest_api_init', [$this, 'register_routes']);
            add_action('admin_footer',  [$this, 'render_admin_ui']);
            add_filter('the_content',   [$this, 'maybe_inject_lock_notice']);
        }

        // ── REST ──────────────────────────────────────────────────────────────

        public function register_routes() {
            // Course prerequisites
            register_rest_route(self::REST_NS, '/groups/(?P<group_id>\d+)/prerequisites', [
                [
                    'methods'             => WP_REST_Server::READABLE,
                    'callback'            => [$this, 'get_prerequisites'],
                    'permission_callback' => '__return_true',
                ],
                [
                    'methods'             => WP_REST_Server::CREATABLE,
                    'callback'            => [$this, 'save_prerequisites'],
                    'permission_callback' => fn($req) => current_user_can('edit_post', (int) $req['group_id']),
                ],
            ]);

            // Form prerequisites
            register_rest_route(self::REST_NS, '/groups/(?P<group_id>\d+)/form-prerequisites', [
                [
                    'methods'             => WP_REST_Server::READABLE,
                    'callback'            => [$this, 'get_form_prerequisites'],
                    'permission_callback' => '__return_true',
                ],
                [
                    'methods'             => WP_REST_Server::CREATABLE,
                    'callback'            => [$this, 'save_form_prerequisites'],
                    'permission_callback' => fn($req) => current_user_can('edit_post', (int) $req['group_id']),
                ],
            ]);
        }

        public function get_prerequisites($request) {
            return new WP_REST_Response($this->load((int) $request['group_id']), 200);
        }

        public function save_prerequisites($request) {
            $group_id = (int) $request['group_id'];
            $body     = $request->get_json_params();
            $raw      = isset($body['prerequisites']) && is_array($body['prerequisites'])
                ? $body['prerequisites']
                : [];

            $clean = [];
            foreach ($raw as $course_id => $prereq_ids) {
                $cid   = (int) $course_id;
                $pids  = array_values(array_filter(array_map('intval', (array) $prereq_ids)));
                if ($cid > 0 && !empty($pids)) {
                    $clean[$cid] = $pids;
                }
            }

            update_post_meta($group_id, self::META_KEY, $clean);
            return new WP_REST_Response(['success' => true, 'prerequisites' => $clean], 200);
        }

        public function get_form_prerequisites($request) {
            return new WP_REST_Response($this->load_forms((int) $request['group_id']), 200);
        }

        public function save_form_prerequisites($request) {
            $group_id = (int) $request['group_id'];
            $body     = $request->get_json_params();
            $raw      = isset($body['form_prerequisites']) && is_array($body['form_prerequisites'])
                ? $body['form_prerequisites']
                : [];

            $clean = [];
            foreach ($raw as $course_id => $form_ids) {
                $cid  = (int) $course_id;
                $fids = array_values(array_filter(array_map('intval', (array) $form_ids)));
                if ($cid > 0 && !empty($fids)) {
                    $clean[$cid] = $fids;
                }
            }

            update_post_meta($group_id, self::FORMS_META_KEY, $clean);
            return new WP_REST_Response(['success' => true, 'form_prerequisites' => $clean], 200);
        }

        // ── Course page notice ────────────────────────────────────────────────

        /**
         * Prepends a lock notice to LearnDash course content when the current
         * user has unmet prerequisites in any of their groups.
         */
        public function maybe_inject_lock_notice($content) {
            if (!is_singular('sfwd-courses')) return $content;

            $course_id = get_the_ID();
            $user_id   = get_current_user_id();
            if (!$user_id) return $content;

            $lock = self::get_lock_state($course_id, $user_id);
            if (!$lock['is_locked']) return $content;

            $titles = $lock['prereq_titles'];
            $list   = '<ul style="margin:0.5rem 0 0 1.25rem">'
                . implode('', array_map(fn($t) => '<li>' . esc_html($t) . '</li>', $titles))
                . '</ul>';

            $notice = '<div class="bys-lock-notice" style="display:flex;gap:0.75rem;align-items:flex-start;padding:1rem 1.25rem;margin-bottom:1.5rem;background:#fef9ec;border:1px solid #f0c040;border-radius:6px;font-size:0.9rem">'
                . '<span style="font-size:1.1rem;line-height:1">🔒</span>'
                . '<div><strong>This course is locked.</strong> Complete the following course(s) first:' . $list . '</div>'
                . '</div>';

            // Best-effort JS to disable the LD enrollment button
            $script = '<script>document.addEventListener("DOMContentLoaded",function(){'
                . 'var sels=[".learndash-wrapper .btn-join",".ld-course-status-action a",".ld-item-enroll-btn",".learndash_mark_complete_button"];'
                . 'sels.forEach(function(s){var el=document.querySelector(s);if(el){el.style.pointerEvents="none";el.style.opacity="0.5";el.setAttribute("aria-disabled","true");}});'
                . '});</script>';

            return $notice . $script . $content;
        }

        // ── Admin UI ──────────────────────────────────────────────────────────

        public function render_admin_ui() {
            $screen = get_current_screen();
            if (!$screen || $screen->id !== 'groups') return;

            global $post;
            $group_id = $post ? (int) $post->ID : 0;
            if (!$group_id) return;

            $prerequisites      = $this->load($group_id);
            $form_prerequisites = $this->load_forms($group_id);
            $rest_url           = rest_url(self::REST_NS . '/groups/' . $group_id . '/prerequisites');
            $forms_rest_url     = rest_url(self::REST_NS . '/groups/' . $group_id . '/form-prerequisites');
            $nonce              = wp_create_nonce('wp_rest');

            // Build the GF forms list (id + title only, active forms)
            $gf_forms_list = [];
            if (class_exists('GFAPI')) {
                foreach (GFAPI::get_forms() as $form) {
                    $gf_forms_list[] = [
                        'id'    => (int) $form['id'],
                        'title' => $form['title'],
                    ];
                }
            }
            ?>
            <style>
            /* ── Shared panel shell ── */
            #bys-prerequisites-panel {
                margin-top: 20px;
                border: 1px solid #c3c4c7;
                border-radius: 4px;
                background: #fff;
            }
            #bys-prerequisites-panel .bys-panel-header,
            #bys-prerequisites-panel .bys-panel-subheader {
                display: flex;
                align-items: center;
                padding: 10px 16px;
                background: #f6f7f7;
                border-bottom: 1px solid #c3c4c7;
            }
            #bys-prerequisites-panel .bys-panel-header {
                border-radius: 4px 4px 0 0;
            }
            #bys-prerequisites-panel .bys-panel-subheader {
                border-top: 2px solid #c3c4c7;
            }
            #bys-prerequisites-panel .bys-panel-header h4,
            #bys-prerequisites-panel .bys-panel-subheader h4 {
                margin: 0;
                font-size: 13px;
                font-weight: 600;
                color: #1d2327;
            }
            #bys-prerequisites-panel .bys-save-status {
                margin-left: auto;
                font-size: 12px;
                font-style: italic;
                color: #787c82;
                transition: color .2s;
            }
            #bys-prerequisites-panel .bys-save-status.saving { color: #787c82; }
            #bys-prerequisites-panel .bys-save-status.saved  { color: #00a32a; }
            #bys-prerequisites-panel .bys-save-status.error  { color: #d63638; }
            #bys-prerequisites-panel .bys-empty-msg {
                padding: 12px 16px;
                color: #787c82;
                font-size: 13px;
                font-style: italic;
                margin: 0;
            }

            /* ── Course prerequisite rows ── */
            .bys-prereq-row {
                padding: 10px 16px;
                border-bottom: 1px solid #f0f0f1;
                font-size: 13px;
            }
            .bys-prereq-row:last-child { border-bottom: none; }
            .bys-prereq-row__header {
                display: flex;
                align-items: center;
                gap: 12px;
            }
            .bys-prereq-row__name { flex: 1; color: #1d2327; }
            .bys-prereq-picker {
                display: none;
                margin-top: 8px;
                padding: 10px 12px;
                background: #f6f7f7;
                border-radius: 4px;
                border: 1px solid #e0e0e0;
            }
            .bys-prereq-picker.is-open { display: block; }
            .bys-prereq-picker__label {
                margin: 0 0 8px;
                font-size: 12px;
                font-weight: 600;
                color: #50575e;
            }
            .bys-prereq-picker label {
                display: flex;
                align-items: center;
                gap: 6px;
                font-size: 12px;
                color: #1d2327;
                padding: 3px 0;
                cursor: pointer;
            }

            /* ── Form prerequisite rows ── */
            .bys-form-row {
                padding: 10px 16px;
                border-bottom: 1px solid #f0f0f1;
                font-size: 13px;
            }
            .bys-form-row:last-child { border-bottom: none; }
            .bys-form-row__header {
                display: flex;
                align-items: center;
                gap: 8px;
                cursor: pointer;
                user-select: none;
            }
            .bys-form-row__header:hover .bys-form-row__name { color: #2271b1; }
            .bys-form-row__name { flex: 1; color: #1d2327; }
            .bys-form-row__count {
                font-size: 11px;
                color: #fff;
                background: #2271b1;
                border-radius: 10px;
                padding: 1px 7px;
                line-height: 1.6;
            }
            .bys-form-row__chevron {
                font-size: 10px;
                color: #787c82;
                width: 12px;
                text-align: center;
                flex-shrink: 0;
            }
            .bys-form-picker {
                display: none;
                margin-top: 8px;
                padding: 10px 12px;
                background: #f6f7f7;
                border-radius: 4px;
                border: 1px solid #e0e0e0;
            }
            .bys-form-picker.is-open { display: block; }
            .bys-form-filter {
                width: 100%;
                box-sizing: border-box;
                padding: 5px 8px;
                margin-bottom: 8px;
                border: 1px solid #c3c4c7;
                border-radius: 3px;
                font-size: 12px;
                background: #fff;
            }
            .bys-form-list {
                max-height: 180px;
                overflow-y: auto;
            }
            .bys-form-list label {
                display: flex;
                align-items: center;
                gap: 6px;
                font-size: 12px;
                color: #1d2327;
                padding: 3px 0;
                cursor: pointer;
            }
            .bys-form-list label.is-hidden { display: none; }
            </style>

            <script>
            (function () {
                var prerequisites     = <?php echo wp_json_encode((object) $prerequisites); ?>;
                var formPrerequisites = <?php echo wp_json_encode((object) $form_prerequisites); ?>;
                var restUrl           = <?php echo wp_json_encode(esc_url_raw($rest_url)); ?>;
                var formsRestUrl      = <?php echo wp_json_encode(esc_url_raw($forms_rest_url)); ?>;
                var wpNonce           = <?php echo wp_json_encode($nonce); ?>;
                var gfForms           = <?php echo wp_json_encode($gf_forms_list); ?>;
                var SELECTOR          = '.learndash_group_courses';

                // ── Persist course prerequisites ──────────────────────────────

                function persist(statusEl) {
                    if (statusEl) { statusEl.textContent = 'Saving…'; statusEl.className = 'bys-save-status saving'; }
                    fetch(restUrl, {
                        method:  'POST',
                        headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': wpNonce },
                        body:    JSON.stringify({ prerequisites: prerequisites }),
                    })
                    .then(function (res) { return res.json().then(function (d) { return { ok: res.ok, d: d }; }); })
                    .then(function (r) {
                        if (!statusEl) return;
                        statusEl.textContent = r.ok ? 'Saved' : 'Error';
                        statusEl.className   = 'bys-save-status ' + (r.ok ? 'saved' : 'error');
                        setTimeout(function () { statusEl.textContent = ''; statusEl.className = 'bys-save-status'; }, 2000);
                    })
                    .catch(function (err) {
                        console.error('[BYS Prerequisites] save error:', err);
                        if (statusEl) { statusEl.textContent = 'Error'; statusEl.className = 'bys-save-status error'; }
                    });
                }

                // ── Persist form prerequisites ────────────────────────────────

                function persistForms(statusEl) {
                    if (statusEl) { statusEl.textContent = 'Saving…'; statusEl.className = 'bys-save-status saving'; }
                    fetch(formsRestUrl, {
                        method:  'POST',
                        headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': wpNonce },
                        body:    JSON.stringify({ form_prerequisites: formPrerequisites }),
                    })
                    .then(function (res) { return res.json().then(function (d) { return { ok: res.ok, d: d }; }); })
                    .then(function (r) {
                        if (!statusEl) return;
                        statusEl.textContent = r.ok ? 'Saved' : 'Error';
                        statusEl.className   = 'bys-save-status ' + (r.ok ? 'saved' : 'error');
                        setTimeout(function () { statusEl.textContent = ''; statusEl.className = 'bys-save-status'; }, 2000);
                    })
                    .catch(function (err) {
                        console.error('[BYS Form Prerequisites] save error:', err);
                        if (statusEl) { statusEl.textContent = 'Error'; statusEl.className = 'bys-save-status error'; }
                    });
                }

                // ── Build course prerequisite rows ────────────────────────────

                function buildRows() {
                    var panel = document.getElementById('bys-prerequisites-panel');
                    if (!panel) return;

                    var body      = panel.querySelector('.bys-panel-body');
                    var statusEl  = panel.querySelector('.bys-save-status');
                    var emptyMsg  = panel.querySelector('.bys-empty-msg');
                    var select    = document.querySelector(SELECTOR + ' select.learndash-binary-selector-items-right');
                    if (!select) return;

                    var options = Array.from(select.options);
                    Array.from(body.querySelectorAll('.bys-prereq-row')).forEach(function (r) { r.remove(); });

                    if (options.length === 0) { emptyMsg.style.display = ''; return; }
                    emptyMsg.style.display = 'none';

                    options.forEach(function (opt) {
                        var id      = parseInt(opt.value, 10);
                        var prereqs = prerequisites[id] || [];
                        var locked  = prereqs.length > 0;

                        // ── Row wrapper ──
                        var row = document.createElement('div');
                        row.className = 'bys-prereq-row';

                        // ── Header: course name + toggle ──
                        var header = document.createElement('div');
                        header.className = 'bys-prereq-row__header';

                        var nameEl = document.createElement('span');
                        nameEl.className   = 'bys-prereq-row__name';
                        nameEl.textContent = opt.textContent.trim();

                        var toggleWrap = document.createElement('div');
                        toggleWrap.className = 'bys-toggle-wrap';

                        var statusLbl = document.createElement('span');
                        statusLbl.className   = 'bys-status-label' + (locked ? ' is-required' : '');
                        statusLbl.textContent = locked ? 'Locked' : 'Open';

                        var toggleLabel = document.createElement('label');
                        toggleLabel.className = 'bys-toggle';

                        var cb = document.createElement('input');
                        cb.type    = 'checkbox';
                        cb.checked = locked;

                        var slider = document.createElement('span');
                        slider.className = 'bys-slider';

                        toggleLabel.appendChild(cb);
                        toggleLabel.appendChild(slider);
                        toggleWrap.appendChild(statusLbl);
                        toggleWrap.appendChild(toggleLabel);
                        header.appendChild(nameEl);
                        header.appendChild(toggleWrap);
                        row.appendChild(header);

                        // ── Prereq picker ──
                        var picker = document.createElement('div');
                        picker.className = 'bys-prereq-picker' + (locked ? ' is-open' : '');

                        var pickerLabel = document.createElement('p');
                        pickerLabel.className   = 'bys-prereq-picker__label';
                        pickerLabel.textContent = 'Requires completion of:';
                        picker.appendChild(pickerLabel);

                        options.forEach(function (other) {
                            var oid = parseInt(other.value, 10);
                            if (oid === id) return;

                            var checkLabel = document.createElement('label');
                            var checkBox   = document.createElement('input');
                            checkBox.type    = 'checkbox';
                            checkBox.value   = oid;
                            checkBox.checked = prereqs.indexOf(oid) !== -1;

                            checkBox.addEventListener('change', function () {
                                var current = prerequisites[id] ? prerequisites[id].slice() : [];
                                if (this.checked) {
                                    if (current.indexOf(oid) === -1) current.push(oid);
                                } else {
                                    current = current.filter(function (x) { return x !== oid; });
                                }
                                if (current.length > 0) {
                                    prerequisites[id] = current;
                                } else {
                                    delete prerequisites[id];
                                    cb.checked = false;
                                    statusLbl.textContent = 'Open';
                                    statusLbl.classList.remove('is-required');
                                    picker.classList.remove('is-open');
                                }
                                persist(statusEl);
                            });

                            checkLabel.appendChild(checkBox);
                            checkLabel.appendChild(document.createTextNode(' ' + other.textContent.trim()));
                            picker.appendChild(checkLabel);
                        });

                        row.appendChild(picker);

                        // ── Toggle handler ──
                        cb.addEventListener('change', function () {
                            if (this.checked) {
                                picker.classList.add('is-open');
                                statusLbl.textContent = 'Locked';
                                statusLbl.classList.add('is-required');
                            } else {
                                picker.classList.remove('is-open');
                                statusLbl.textContent = 'Open';
                                statusLbl.classList.remove('is-required');
                                delete prerequisites[id];
                                Array.from(picker.querySelectorAll('input[type=checkbox]'))
                                    .forEach(function (c) { c.checked = false; });
                                persist(statusEl);
                            }
                        });

                        body.appendChild(row);
                    });
                }

                // ── Build form prerequisite rows ──────────────────────────────

                function buildFormRows() {
                    var panel = document.getElementById('bys-prerequisites-panel');
                    if (!panel) return;

                    var body     = panel.querySelector('.bys-panel-forms-body');
                    var statusEl = panel.querySelector('.bys-forms-save-status');
                    var emptyMsg = panel.querySelector('.bys-forms-empty-msg');
                    if (!body) return;

                    var select  = document.querySelector(SELECTOR + ' select.learndash-binary-selector-items-right');
                    var options = select ? Array.from(select.options) : [];

                    Array.from(body.querySelectorAll('.bys-form-row')).forEach(function (r) { r.remove(); });

                    // GF not available — static message is already in the HTML, nothing more to do
                    if (gfForms.length === 0) return;

                    if (options.length === 0) {
                        if (emptyMsg) emptyMsg.style.display = '';
                        return;
                    }
                    if (emptyMsg) emptyMsg.style.display = 'none';

                    options.forEach(function (opt) {
                        var courseId      = parseInt(opt.value, 10);
                        var selectedForms = (formPrerequisites[courseId] || []).slice();

                        var row = document.createElement('div');
                        row.className = 'bys-form-row';

                        // ── Header ──
                        var header = document.createElement('div');
                        header.className = 'bys-form-row__header';

                        var nameEl = document.createElement('span');
                        nameEl.className   = 'bys-form-row__name';
                        nameEl.textContent = opt.textContent.trim();

                        var countEl = document.createElement('span');
                        countEl.className     = 'bys-form-row__count';
                        countEl.style.display = selectedForms.length > 0 ? '' : 'none';
                        countEl.textContent   = selectedForms.length > 0
                            ? selectedForms.length + ' form' + (selectedForms.length !== 1 ? 's' : '')
                            : '';

                        var chevron = document.createElement('span');
                        chevron.className = 'bys-form-row__chevron';

                        header.appendChild(nameEl);
                        header.appendChild(countEl);
                        header.appendChild(chevron);
                        row.appendChild(header);

                        // ── Form picker ──
                        var picker = document.createElement('div');
                        picker.className = 'bys-form-picker';

                        var filterInput = document.createElement('input');
                        filterInput.type        = 'text';
                        filterInput.className   = 'bys-form-filter';
                        filterInput.placeholder = 'Filter forms…';
                        filterInput.setAttribute('autocomplete', 'off');

                        var listEl = document.createElement('div');
                        listEl.className = 'bys-form-list';

                        gfForms.forEach(function (form) {
                            var checkLabel = document.createElement('label');
                            var checkBox   = document.createElement('input');
                            checkBox.type    = 'checkbox';
                            checkBox.value   = form.id;
                            checkBox.checked = selectedForms.indexOf(form.id) !== -1;

                            checkBox.addEventListener('change', function () {
                                var current = formPrerequisites[courseId] ? formPrerequisites[courseId].slice() : [];
                                if (this.checked) {
                                    if (current.indexOf(form.id) === -1) current.push(form.id);
                                } else {
                                    current = current.filter(function (x) { return x !== form.id; });
                                }
                                if (current.length > 0) {
                                    formPrerequisites[courseId] = current;
                                } else {
                                    delete formPrerequisites[courseId];
                                }
                                // Update count badge
                                var c = formPrerequisites[courseId] ? formPrerequisites[courseId].length : 0;
                                countEl.textContent   = c > 0 ? c + ' form' + (c !== 1 ? 's' : '') : '';
                                countEl.style.display = c > 0 ? '' : 'none';
                                persistForms(statusEl);
                            });

                            checkLabel.appendChild(checkBox);
                            checkLabel.appendChild(document.createTextNode(' ' + form.title));
                            listEl.appendChild(checkLabel);
                        });

                        // Text filter
                        filterInput.addEventListener('input', function () {
                            var query = this.value.toLowerCase();
                            Array.from(listEl.querySelectorAll('label')).forEach(function (lbl) {
                                lbl.classList.toggle(
                                    'is-hidden',
                                    query.length > 0 && lbl.textContent.toLowerCase().indexOf(query) === -1
                                );
                            });
                        });

                        picker.appendChild(filterInput);
                        picker.appendChild(listEl);
                        row.appendChild(picker);

                        // ── Click header to expand / collapse ──
                        var isOpen = selectedForms.length > 0;
                        picker.classList.toggle('is-open', isOpen);
                        chevron.textContent = isOpen ? '▾' : '▸';

                        header.addEventListener('click', function () {
                            var nowOpen = picker.classList.toggle('is-open');
                            chevron.textContent = nowOpen ? '▾' : '▸';
                            if (nowOpen) setTimeout(function () { filterInput.focus(); }, 50);
                        });

                        body.appendChild(row);
                    });
                }

                // ── Initialise ────────────────────────────────────────────────

                function init() {
                    var requiredPanel = document.getElementById('bys-required-courses-panel');
                    var bsTable       = document.querySelector(SELECTOR + ' .learndash-binary-selector-table');
                    var anchor        = requiredPanel || bsTable;
                    if (!anchor || document.getElementById('bys-prerequisites-panel')) return;

                    var formsBodyContent = gfForms.length === 0
                        ? '<p class="bys-empty-msg">Gravity Forms is not active or no forms are available.</p>'
                        : '<p class="bys-forms-empty-msg">Add courses to the group above to configure form prerequisites.</p>';

                    var panel = document.createElement('div');
                    panel.id  = 'bys-prerequisites-panel';
                    panel.innerHTML =
                        '<div class="bys-panel-header">' +
                            '<h4>Course Prerequisites</h4>' +
                            '<span class="bys-save-status"></span>' +
                        '</div>' +
                        '<div class="bys-panel-body">' +
                            '<p class="bys-empty-msg">Add courses to the group above to configure prerequisites.</p>' +
                        '</div>' +
                        '<div class="bys-panel-subheader">' +
                            '<h4>Form Prerequisites</h4>' +
                            '<span class="bys-save-status bys-forms-save-status"></span>' +
                        '</div>' +
                        '<div class="bys-panel-forms-body">' +
                            formsBodyContent +
                        '</div>';

                    anchor.parentNode.insertBefore(panel, anchor.nextSibling);

                    var select = document.querySelector(SELECTOR + ' select.learndash-binary-selector-items-right');
                    if (select) {
                        new MutationObserver(function () {
                            var present = Array.from(select.options).map(function (o) { return parseInt(o.value, 10); });
                            // Prune stale entries when courses are removed from the group
                            Object.keys(prerequisites).forEach(function (k) {
                                if (present.indexOf(parseInt(k, 10)) === -1) delete prerequisites[k];
                            });
                            Object.keys(formPrerequisites).forEach(function (k) {
                                if (present.indexOf(parseInt(k, 10)) === -1) delete formPrerequisites[k];
                            });
                            buildRows();
                            buildFormRows();
                        }).observe(select, { childList: true });
                    }

                    buildRows();
                    buildFormRows();
                }

                document.readyState === 'loading'
                    ? document.addEventListener('DOMContentLoaded', init)
                    : init();
            })();
            </script>
            <?php
        }

        // ── Static helpers ────────────────────────────────────────────────────

        /**
         * Returns unmet prerequisite course IDs for a given course/group/user.
         * Empty array means the course is open (no prerequisites or all met).
         */
        public static function get_unmet_prerequisites($course_id, $group_id, $user_id) {
            $data = get_post_meta((int) $group_id, self::META_KEY, true);
            if (!is_array($data)) return [];

            $course_id = (int) $course_id;
            if (!isset($data[$course_id])) return [];

            $unmet = [];
            foreach ($data[$course_id] as $prereq_id) {
                if (!learndash_course_completed((int) $user_id, (int) $prereq_id)) {
                    $unmet[] = (int) $prereq_id;
                }
            }
            return $unmet;
        }

        /**
         * Finds unmet prerequisites across all of the user's groups for a
         * given course. Used on the standalone course page where group context
         * is not known upfront.
         *
         * Only considers groups that have an explicit prerequisite entry for
         * this course — a group with no config is ignored (not "open").
         * Returns [] if prerequisites are configured AND fully met in any group
         * (weighs towards accessible). Returns [] if no group has config at all.
         */
        public static function get_unmet_for_user($course_id, $user_id) {
            if (!function_exists('learndash_get_users_group_ids')) return [];

            $group_ids = array_unique(array_merge(
                (array) learndash_get_users_group_ids($user_id),
                (array) learndash_get_administrators_group_ids($user_id)
            ));

            $locking_unmet = null;

            foreach ($group_ids as $gid) {
                $data = get_post_meta((int) $gid, self::META_KEY, true);
                if (!is_array($data) || !isset($data[(int) $course_id])) continue;

                $unmet = self::get_unmet_prerequisites($course_id, $gid, $user_id);
                if (empty($unmet)) {
                    return []; // prereqs configured in this group and all met → accessible
                }
                if ($locking_unmet === null) {
                    $locking_unmet = $unmet;
                }
            }

            return $locking_unmet ?? [];
        }

        // ── Unified lock-state resolver ───────────────────────────────────────

        /**
         * Returns the complete lock state for a course/user pair, covering both
         * course prerequisites and form prerequisites.
         *
         * When $group_id is supplied only that group is evaluated — used by the
         * lander resolver which already iterates groups itself.  Without $group_id
         * the check fans out across all of the user's groups: a course is unlocked
         * if ALL prereqs (course AND form) are satisfied in ANY one group.
         *
         * @param int      $course_id
         * @param int      $user_id
         * @param int|null $group_id  Omit to check across all user groups.
         * @return array {
         *     is_locked:     bool
         *     unmet_courses: int[]     Unmet prerequisite course IDs
         *     unmet_forms:   int[]     Unmet prerequisite form IDs
         *     prereq_titles: string[]  Human-readable labels for the tooltip/notice
         * }
         */
        public static function get_lock_state(int $course_id, int $user_id, ?int $group_id = null): array {
            $empty = ['is_locked' => false, 'unmet_courses' => [], 'unmet_forms' => [], 'prereq_titles' => []];
            if (!$user_id) return $empty;

            if ($group_id !== null) {
                return self::evaluate_lock_for_group($course_id, $group_id, $user_id);
            }

            // Cross-group: unlock if all prereqs are met in any single group
            if (!function_exists('learndash_get_users_group_ids')) return $empty;

            $group_ids = array_unique(array_merge(
                (array) learndash_get_users_group_ids($user_id),
                (array) learndash_get_administrators_group_ids($user_id)
            ));

            $locking_result = null;

            foreach ($group_ids as $gid) {
                $course_data = get_post_meta((int) $gid, self::META_KEY,       true);
                $form_data   = get_post_meta((int) $gid, self::FORMS_META_KEY, true);
                $has_course  = is_array($course_data) && isset($course_data[$course_id]);
                $has_form    = is_array($form_data)   && isset($form_data[$course_id]);
                if (!$has_course && !$has_form) continue; // no config for this course in this group

                $lock = self::evaluate_lock_for_group($course_id, (int) $gid, $user_id);
                if (!$lock['is_locked']) return $empty; // fully satisfied → accessible
                if ($locking_result === null) $locking_result = $lock;
            }

            return $locking_result ?? $empty;
        }

        /**
         * Evaluates the lock state for one specific group.
         * Called internally by get_lock_state() and exposed via the $group_id
         * parameter so the lander resolver can use it without re-entering the
         * cross-group fan-out loop.
         */
        private static function evaluate_lock_for_group(int $course_id, int $group_id, int $user_id): array {
            $unmet_courses = [];
            $unmet_forms   = [];

            // ── Course prerequisites ──────────────────────────────────────────
            $course_data = get_post_meta($group_id, self::META_KEY, true);
            if (is_array($course_data) && isset($course_data[$course_id])) {
                foreach ($course_data[$course_id] as $prereq_id) {
                    if (!learndash_course_completed((int) $user_id, (int) $prereq_id)) {
                        $unmet_courses[] = (int) $prereq_id;
                    }
                }
            }

            // ── Form prerequisites ────────────────────────────────────────────
            $form_data = get_post_meta($group_id, self::FORMS_META_KEY, true);
            if (is_array($form_data) && isset($form_data[$course_id])) {
                foreach ($form_data[$course_id] as $form_id) {
                    if (!self::user_submitted_form((int) $form_id, $user_id)) {
                        $unmet_forms[] = (int) $form_id;
                    }
                }
            }

            $is_locked     = !empty($unmet_courses) || !empty($unmet_forms);
            $prereq_titles = [];

            if ($is_locked) {
                foreach ($unmet_courses as $cid) {
                    $prereq_titles[] = get_the_title($cid);
                }
                if (!empty($unmet_forms) && class_exists('GFAPI')) {
                    foreach ($unmet_forms as $fid) {
                        $form = GFAPI::get_form($fid);
                        if ($form && !is_wp_error($form)) {
                            $prereq_titles[] = $form['title'];
                        }
                    }
                }
            }

            return compact('is_locked', 'unmet_courses', 'unmet_forms', 'prereq_titles');
        }

        /**
         * Returns true if the given user has at least one active entry for the form.
         * Returns true (non-blocking) when Gravity Forms is not active.
         */
        private static function user_submitted_form(int $form_id, int $user_id): bool {
            if (!class_exists('GFAPI')) return true;
            $count = GFAPI::count_entries($form_id, [
                'status'        => 'active',
                'field_filters' => [['key' => 'created_by', 'value' => $user_id]],
            ]);
            return $count > 0;
        }

        private function load($group_id) {
            $data = get_post_meta((int) $group_id, self::META_KEY, true);
            return is_array($data) ? $data : [];
        }

        private function load_forms($group_id) {
            $data = get_post_meta((int) $group_id, self::FORMS_META_KEY, true);
            return is_array($data) ? $data : [];
        }
    }
}
