<?php
/**
 * Required Courses class.
 *
 * Manages the "required vs. optional" designation for courses within a group.
 *
 * Responsibilities:
 *  - Registers REST endpoints under the shared bys-groups/v1 namespace
 *  - Injects a `required` boolean into the existing group courses list endpoint
 *  - Renders the admin toggle UI on the Group edit screen
 *
 * Save mechanism: the admin JS fires a REST POST with keepalive:true when
 * the Update button is clicked, so saves complete even as the page navigates.
 *
 * @package BYS_Groups
 * @since 1.0.0
 */

if (!defined('ABSPATH')) exit;

if (!class_exists('BYS_Required_Courses')) {
    class BYS_Required_Courses {

        /** Post meta key that stores the array of required course IDs. */
        const META_KEY = '_bys_required_course_ids';

        /** REST namespace — shared with BYS_Groups_Rest_API. */
        const REST_NS  = 'bys-groups/v1';

        public function __construct() {
            add_action('rest_api_init',                [$this, 'register_routes']);
            add_filter('rest_request_after_callbacks', [$this, 'inject_required_field'], 10, 3);
            add_action('admin_footer',                 [$this, 'render_admin_ui']);
        }

        // ── REST Routes ───────────────────────────────────────────────────────────

        public function register_routes() {
            register_rest_route(self::REST_NS, '/groups/(?P<group_id>\d+)/required-courses', [
                [
                    'methods'             => WP_REST_Server::READABLE,
                    'callback'            => [$this, 'get_required_courses'],
                    'permission_callback' => [$this, 'can_read'],
                ],
                [
                    'methods'             => WP_REST_Server::CREATABLE,
                    'callback'            => [$this, 'save_required_courses'],
                    'permission_callback' => [$this, 'can_write'],
                ],
            ]);
        }

        public function can_read() {
            return is_user_logged_in();
        }

        public function can_write($request) {
            return current_user_can('edit_post', (int) $request['group_id']);
        }

        /**
         * GET /bys-groups/v1/groups/{group_id}/required-courses
         * Returns an array of required course IDs for the given group.
         */
        public function get_required_courses($request) {
            return new WP_REST_Response($this->load_ids((int) $request['group_id']), 200);
        }

        /**
         * POST /bys-groups/v1/groups/{group_id}/required-courses
         * Body: { "ids": [123, 456] }
         * Persists which courses are required for the given group.
         */
        public function save_required_courses($request) {
            $group_id = (int) $request['group_id'];
            $body     = $request->get_json_params();
            $ids      = isset($body['ids'])
                ? array_values(array_map('intval', (array) $body['ids']))
                : [];

            update_post_meta($group_id, self::META_KEY, $ids);
            return new WP_REST_Response(['success' => true, 'ids' => $ids], 200);
        }

        // ── REST Filter: inject `required` into the courses list ─────────────────

        /**
         * Intercepts GET /bys-groups/v1/groups/{id}/courses and adds:
         *   "required": true | false
         * to each course object, then sorts required courses to the front.
         */
        public function inject_required_field($response, $handler, $request) {
            if (!preg_match(
                '#^/bys-groups/v1/groups/(\d+)/courses$#',
                $request->get_route(),
                $matches
            )) {
                return $response;
            }

            if (is_wp_error($response) || !is_a($response, 'WP_REST_Response')) {
                return $response;
            }

            $data = $response->get_data();
            if (!is_array($data)) return $response;

            $required_ids = $this->load_ids((int) $matches[1]);

            foreach ($data as &$course) {
                $course['required'] = in_array((int) ($course['id'] ?? 0), $required_ids, true);
            }
            unset($course);

            usort($data, function ($a, $b) {
                return ($b['required'] ? 1 : 0) - ($a['required'] ? 1 : 0);
            });

            $response->set_data($data);
            return $response;
        }

        // ── Admin UI ──────────────────────────────────────────────────────────────

        /**
         * Renders the Required & Optional Courses panel on the Groups edit screen,
         * along with the JS that drives the toggle UI and REST-based save.
         */
        public function render_admin_ui() {
            $screen = get_current_screen();
            if (!$screen || $screen->id !== 'groups') return;

            global $post;
            $group_id = $post ? (int) $post->ID : 0;
            $required = $group_id ? $this->load_ids($group_id) : [];
            $rest_url = rest_url(self::REST_NS . '/groups/' . $group_id . '/required-courses');
            $nonce    = wp_create_nonce('wp_rest');

            ?>
            <style>
            /* ── Panel wrapper ── */
            #bys-required-courses-panel {
                margin-top: 20px;
                border: 1px solid #c3c4c7;
                border-radius: 4px;
                background: #fff;
            }
            #bys-required-courses-panel .bys-panel-header {
                display: flex;
                align-items: center;
                padding: 10px 16px;
                background: #f6f7f7;
                border-bottom: 1px solid #c3c4c7;
                border-radius: 4px 4px 0 0;
            }
            #bys-required-courses-panel .bys-panel-header h4 {
                margin: 0;
                font-size: 13px;
                font-weight: 600;
                color: #1d2327;
            }
            #bys-required-courses-panel .bys-save-status {
                margin-left: auto;
                font-size: 12px;
                font-style: italic;
                color: #787c82;
                transition: color 0.2s;
            }
            #bys-required-courses-panel .bys-save-status.saving { color: #787c82; }
            #bys-required-courses-panel .bys-save-status.saved  { color: #00a32a; }
            #bys-required-courses-panel .bys-save-status.error  { color: #d63638; }
            #bys-required-courses-panel .bys-panel-body { padding: 4px 0; }
            #bys-required-courses-panel .bys-empty-msg {
                padding: 12px 16px;
                color: #787c82;
                font-size: 13px;
                font-style: italic;
                margin: 0;
            }

            /* ── Course rows ── */
            .bys-course-row {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 9px 16px;
                border-bottom: 1px solid #f0f0f1;
                font-size: 13px;
                gap: 12px;
            }
            .bys-course-row:last-child { border-bottom: none; }
            .bys-course-name { flex: 1; color: #1d2327; }

            /* ── Toggle wrap ── */
            .bys-toggle-wrap { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
            .bys-status-label {
                font-size: 12px;
                min-width: 52px;
                text-align: right;
                color: #787c82;
                transition: color 0.15s;
            }
            .bys-status-label.is-required { color: #2271b1; font-weight: 600; }

            /* ── Toggle switch ── */
            .bys-toggle {
                position: relative;
                display: inline-block;
                width: 36px;
                height: 20px;
                flex-shrink: 0;
            }
            .bys-toggle input { opacity: 0; width: 0; height: 0; position: absolute; }
            .bys-slider {
                position: absolute;
                cursor: pointer;
                inset: 0;
                background: #c3c4c7;
                border-radius: 20px;
                transition: background 0.2s;
            }
            .bys-slider::before {
                content: '';
                position: absolute;
                width: 14px; height: 14px;
                left: 3px; bottom: 3px;
                background: #fff;
                border-radius: 50%;
                box-shadow: 0 1px 2px rgba(0,0,0,.2);
                transition: transform 0.2s;
            }
            .bys-toggle input:checked + .bys-slider { background: #2271b1; }
            .bys-toggle input:checked + .bys-slider::before { transform: translateX(16px); }
            .bys-toggle input:focus-visible + .bys-slider { outline: 2px solid #2271b1; outline-offset: 2px; }
            </style>

            <script>
            (function () {
                var requiredIds = <?php echo wp_json_encode($required); ?>;
                var restUrl     = <?php echo wp_json_encode(esc_url_raw($rest_url)); ?>;
                var wpNonce     = <?php echo wp_json_encode($nonce); ?>;
                var SELECTOR    = '.learndash_group_courses';

                /* ─── Persist to REST immediately on every toggle change ─── */

                function persist(statusEl) {
                    if (statusEl) {
                        statusEl.textContent = 'Saving…';
                        statusEl.className   = 'bys-save-status saving';
                    }
                    fetch(restUrl, {
                        method:  'POST',
                        headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': wpNonce },
                        body:    JSON.stringify({ ids: requiredIds.slice() }),
                    })
                    .then(function (res) { return res.json().then(function (d) { return { ok: res.ok, d: d }; }); })
                    .then(function (r) {
                        if (!statusEl) return;
                        statusEl.textContent = r.ok ? 'Saved' : 'Error';
                        statusEl.className   = 'bys-save-status ' + (r.ok ? 'saved' : 'error');
                        setTimeout(function () {
                            statusEl.textContent = '';
                            statusEl.className   = 'bys-save-status';
                        }, 2000);
                    })
                    .catch(function (err) {
                        console.error('[BYS Required Courses] save error:', err);
                        if (statusEl) { statusEl.textContent = 'Error'; statusEl.className = 'bys-save-status error'; }
                    });
                }

                /* ─── Build / refresh the course rows ─── */

                function renderRows() {
                    var panel = document.getElementById('bys-required-courses-panel');
                    if (!panel) return;

                    var body     = panel.querySelector('.bys-panel-body');
                    var emptyMsg = panel.querySelector('.bys-empty-msg');
                    var statusEl = panel.querySelector('.bys-save-status');
                    var select   = document.querySelector(SELECTOR + ' select.learndash-binary-selector-items-right');
                    if (!select) return;

                    var options = Array.from(select.options);
                    Array.from(body.querySelectorAll('.bys-course-row')).forEach(function (r) { r.remove(); });

                    if (options.length === 0) { emptyMsg.style.display = ''; return; }
                    emptyMsg.style.display = 'none';

                    options.forEach(function (opt) {
                        var id         = parseInt(opt.value, 10);
                        var isRequired = requiredIds.indexOf(id) !== -1;

                        var row = document.createElement('div');
                        row.className = 'bys-course-row';

                        var nameEl = document.createElement('span');
                        nameEl.className   = 'bys-course-name';
                        nameEl.textContent = opt.textContent.trim();

                        var wrap = document.createElement('div');
                        wrap.className = 'bys-toggle-wrap';

                        var lbl = document.createElement('span');
                        lbl.className   = 'bys-status-label' + (isRequired ? ' is-required' : '');
                        lbl.textContent = isRequired ? 'Required' : 'Optional';

                        var toggleLabel = document.createElement('label');
                        toggleLabel.className = 'bys-toggle';

                        var cb    = document.createElement('input');
                        cb.type    = 'checkbox';
                        cb.value   = id;
                        cb.checked = isRequired;

                        cb.addEventListener('change', function () {
                            if (this.checked) {
                                if (requiredIds.indexOf(id) === -1) requiredIds.push(id);
                                lbl.textContent = 'Required';
                                lbl.classList.add('is-required');
                            } else {
                                requiredIds = requiredIds.filter(function (x) { return x !== id; });
                                lbl.textContent = 'Optional';
                                lbl.classList.remove('is-required');
                            }
                            persist(statusEl);
                        });

                        var slider = document.createElement('span');
                        slider.className = 'bys-slider';

                        toggleLabel.appendChild(cb);
                        toggleLabel.appendChild(slider);
                        wrap.appendChild(lbl);
                        wrap.appendChild(toggleLabel);
                        row.appendChild(nameEl);
                        row.appendChild(wrap);
                        body.appendChild(row);
                    });
                }

                /* ─── Insert panel below the binary selector table ─── */

                function init() {
                    var bsTable = document.querySelector(SELECTOR + ' .learndash-binary-selector-table');
                    if (!bsTable || document.getElementById('bys-required-courses-panel')) return;

                    var panel = document.createElement('div');
                    panel.id  = 'bys-required-courses-panel';
                    panel.innerHTML =
                        '<div class="bys-panel-header">' +
                            '<h4>Required &amp; Optional Courses</h4>' +
                            '<span class="bys-save-status"></span>' +
                        '</div>' +
                        '<div class="bys-panel-body">' +
                            '<p class="bys-empty-msg">Add courses to the group above to configure required vs. optional.</p>' +
                        '</div>';

                    bsTable.parentNode.insertBefore(panel, bsTable.nextSibling);

                    var select = document.querySelector(SELECTOR + ' select.learndash-binary-selector-items-right');
                    if (select) {
                        new MutationObserver(function () {
                            var present = Array.from(select.options).map(function (o) { return parseInt(o.value, 10); });
                            requiredIds = requiredIds.filter(function (id) { return present.indexOf(id) !== -1; });
                            renderRows();
                        }).observe(select, { childList: true });
                    }

                    renderRows();
                }

                if (document.readyState === 'loading') {
                    document.addEventListener('DOMContentLoaded', init);
                } else {
                    init();
                }
            })();
            </script>
            <?php
        }

        // ── Private Helpers ───────────────────────────────────────────────────────

        private function load_ids($group_id) {
            $ids = get_post_meta($group_id, self::META_KEY, true);
            return is_array($ids) ? array_values(array_map('intval', array_filter($ids))) : [];
        }
    }
}
