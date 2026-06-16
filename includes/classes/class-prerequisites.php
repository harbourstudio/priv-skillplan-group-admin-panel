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
 * @package BYS_Groups
 * @since 1.2.0
 */
if (!defined('ABSPATH')) exit;

if (!class_exists('BYS_Groups_Prerequisites')) {
    class BYS_Groups_Prerequisites {

        const META_KEY = '_bys_course_prerequisites';
        const REST_NS  = 'bys-groups/v1';

        public function __construct() {
            add_action('rest_api_init', [$this, 'register_routes']);
            add_action('admin_footer',  [$this, 'render_admin_ui']);
            add_filter('the_content',   [$this, 'maybe_inject_lock_notice']);
        }

        // ── REST ──────────────────────────────────────────────────────────────

        public function register_routes() {
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

            $unmet = self::get_unmet_for_user($course_id, $user_id);
            if (empty($unmet)) return $content;

            $titles = array_map('get_the_title', $unmet);
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

            $prerequisites = $this->load($group_id);
            $rest_url      = rest_url(self::REST_NS . '/groups/' . $group_id . '/prerequisites');
            $nonce         = wp_create_nonce('wp_rest');
            ?>
            <style>
            #bys-prerequisites-panel {
                margin-top: 20px;
                border: 1px solid #c3c4c7;
                border-radius: 4px;
                background: #fff;
            }
            #bys-prerequisites-panel .bys-panel-header {
                display: flex;
                align-items: center;
                padding: 10px 16px;
                background: #f6f7f7;
                border-bottom: 1px solid #c3c4c7;
                border-radius: 4px 4px 0 0;
            }
            #bys-prerequisites-panel .bys-panel-header h4 {
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
            </style>

            <script>
            (function () {
                var prerequisites = <?php echo wp_json_encode((object) $prerequisites); ?>;
                var restUrl       = <?php echo wp_json_encode(esc_url_raw($rest_url)); ?>;
                var wpNonce       = <?php echo wp_json_encode($nonce); ?>;
                var SELECTOR      = '.learndash_group_courses';

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
                            checkLabel.appendChild(document.createTextNode(' ' + other.textContent.trim()));
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

                function init() {
                    var requiredPanel = document.getElementById('bys-required-courses-panel');
                    var bsTable       = document.querySelector(SELECTOR + ' .learndash-binary-selector-table');
                    var anchor        = requiredPanel || bsTable;
                    if (!anchor || document.getElementById('bys-prerequisites-panel')) return;

                    var panel = document.createElement('div');
                    panel.id  = 'bys-prerequisites-panel';
                    panel.innerHTML =
                        '<div class="bys-panel-header">' +
                            '<h4>Course Prerequisites</h4>' +
                            '<span class="bys-save-status"></span>' +
                        '</div>' +
                        '<div class="bys-panel-body">' +
                            '<p class="bys-empty-msg">Add courses to the group above to configure prerequisites.</p>' +
                        '</div>';

                    anchor.parentNode.insertBefore(panel, anchor.nextSibling);

                    var select = document.querySelector(SELECTOR + ' select.learndash-binary-selector-items-right');
                    if (select) {
                        new MutationObserver(function () {
                            var present = Array.from(select.options).map(function (o) { return parseInt(o.value, 10); });
                            Object.keys(prerequisites).forEach(function (k) {
                                if (present.indexOf(parseInt(k, 10)) === -1) delete prerequisites[k];
                            });
                            buildRows();
                        }).observe(select, { childList: true });
                    }

                    buildRows();
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

        private function load($group_id) {
            $data = get_post_meta((int) $group_id, self::META_KEY, true);
            return is_array($data) ? $data : [];
        }
    }
}
