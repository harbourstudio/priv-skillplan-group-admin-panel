<?php
/**
 * Course Order class.
 *
 * Lets admins drag-and-drop courses on the Group edit screen to set
 * the display order used by single-lander.php. Order is persisted as
 * an array of course IDs (ascending position) in group post meta.
 *
 * @package BYS_Groups
 * @since 1.0.0
 */

if (!defined('ABSPATH')) exit;

if (!class_exists('BYS_Course_Order')) {
    class BYS_Course_Order {

        /** Post meta key that stores the ordered array of course IDs. */
        const META_KEY = '_bys_course_order';

        /** REST namespace — shared with BYS_Groups_Core::REST_NAMESPACE. */
        const REST_NS  = 'bys-groups/v1';

        public function __construct() {
            add_action('rest_api_init', [$this, 'register_routes']);
            add_action('admin_footer',  [$this, 'render_admin_ui']);
        }

        // ── REST Routes ───────────────────────────────────────────────────────────

        public function register_routes() {
            register_rest_route(self::REST_NS, '/groups/(?P<group_id>\d+)/course-order', [
                [
                    'methods'             => WP_REST_Server::READABLE,
                    'callback'            => [$this, 'get_course_order'],
                    'permission_callback' => [$this, 'can_read'],
                ],
                [
                    'methods'             => WP_REST_Server::CREATABLE,
                    'callback'            => [$this, 'save_course_order'],
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
         * GET /bys-groups/v1/groups/{group_id}/course-order
         * Returns the ordered array of course IDs for the given group.
         */
        public function get_course_order($request) {
            return new WP_REST_Response($this->load_order((int) $request['group_id']), 200);
        }

        /**
         * POST /bys-groups/v1/groups/{group_id}/course-order
         * Body: { "order": [123, 456, 789] }
         * Persists the course display order for the given group.
         */
        public function save_course_order($request) {
            $group_id = (int) $request['group_id'];
            $body     = $request->get_json_params();
            $order    = isset($body['order'])
                ? array_values(array_map('intval', (array) $body['order']))
                : [];

            update_post_meta($group_id, self::META_KEY, $order);
            return new WP_REST_Response(['success' => true, 'order' => $order], 200);
        }

        // ── Admin UI ──────────────────────────────────────────────────────────────

        /**
         * Renders the Course Order panel on the Groups edit screen,
         * with a drag-and-drop list for reordering enrolled courses.
         */
        public function render_admin_ui() {
            $screen = get_current_screen();
            if (!$screen || $screen->id !== 'groups') return;

            global $post;
            $group_id = $post ? (int) $post->ID : 0;
            $order    = $group_id ? $this->load_order($group_id) : [];
            $rest_url = rest_url(self::REST_NS . '/groups/' . $group_id . '/course-order');
            $nonce    = wp_create_nonce('wp_rest');

            ?>
            <style>
            /* ── Panel wrapper ── */
            #bys-course-order-panel {
                margin-top: 20px;
                border: 1px solid #c3c4c7;
                border-radius: 4px;
                background: #fff;
            }
            #bys-course-order-panel .bys-panel-header {
                display: flex;
                align-items: center;
                padding: 10px 16px;
                background: #f6f7f7;
                border-bottom: 1px solid #c3c4c7;
                border-radius: 4px 4px 0 0;
            }
            #bys-course-order-panel .bys-panel-header h4 {
                margin: 0;
                font-size: 13px;
                font-weight: 600;
                color: #1d2327;
            }
            #bys-course-order-panel .bys-panel-desc {
                font-size: 12px;
                color: #787c82;
                margin: 0 0 0 10px;
                font-style: italic;
            }
            #bys-course-order-panel .bys-save-status {
                margin-left: auto;
                font-size: 12px;
                font-style: italic;
                color: #787c82;
                transition: color 0.2s;
            }
            #bys-course-order-panel .bys-save-status.saving { color: #787c82; }
            #bys-course-order-panel .bys-save-status.saved  { color: #00a32a; }
            #bys-course-order-panel .bys-save-status.error  { color: #d63638; }
            #bys-course-order-panel .bys-panel-body { padding: 4px 0; }
            #bys-course-order-panel .bys-empty-msg {
                padding: 12px 16px;
                color: #787c82;
                font-size: 13px;
                font-style: italic;
                margin: 0;
            }

            /* ── Sortable rows ── */
            .bys-order-list {
                list-style: none;
                margin: 0;
                padding: 0;
            }
            .bys-order-row {
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 9px 16px;
                border-bottom: 1px solid #f0f0f1;
                font-size: 13px;
                color: #1d2327;
                cursor: grab;
                user-select: none;
                background: #fff;
                transition: background 0.12s;
            }
            .bys-order-row:last-child { border-bottom: none; }
            .bys-order-row:active { cursor: grabbing; }
            .bys-order-row.bys-drag-over {
                background: #f0f6fc;
                border-top: 2px solid #2271b1;
            }
            .bys-order-row.bys-dragging {
                opacity: 0.4;
            }
            .bys-drag-handle {
                color: #c3c4c7;
                font-size: 16px;
                line-height: 1;
                flex-shrink: 0;
            }
            .bys-order-num {
                min-width: 18px;
                font-size: 11px;
                color: #a7aaad;
                flex-shrink: 0;
                text-align: right;
            }
            </style>

            <script>
            (function () {
                var savedOrder = <?php echo wp_json_encode($order); ?>;
                var restUrl    = <?php echo wp_json_encode(esc_url_raw($rest_url)); ?>;
                var wpNonce    = <?php echo wp_json_encode($nonce); ?>;
                var SELECTOR   = '.learndash_group_courses';

                var draggingEl = null;

                function persist(statusEl) {
                    var rows  = document.querySelectorAll('#bys-course-order-panel .bys-order-row');
                    var order = Array.from(rows).map(function (r) { return parseInt(r.dataset.courseId, 10); });

                    if (statusEl) {
                        statusEl.textContent = 'Saving…';
                        statusEl.className   = 'bys-save-status saving';
                    }
                    fetch(restUrl, {
                        method:  'POST',
                        headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': wpNonce },
                        body:    JSON.stringify({ order: order }),
                        keepalive: true,
                    })
                    .then(function (res) { return res.json().then(function (d) { return { ok: res.ok, d: d }; }); })
                    .then(function (r) {
                        if (!statusEl) return;
                        statusEl.textContent = r.ok ? 'Saved' : 'Error';
                        statusEl.className   = 'bys-save-status ' + (r.ok ? 'saved' : 'error');
                        if (r.ok) savedOrder = r.d.order;
                        setTimeout(function () {
                            statusEl.textContent = '';
                            statusEl.className   = 'bys-save-status';
                        }, 2000);
                    })
                    .catch(function (err) {
                        console.error('[BYS Course Order] save error:', err);
                        if (statusEl) { statusEl.textContent = 'Error'; statusEl.className = 'bys-save-status error'; }
                    });
                }

                function updateNumbers() {
                    var rows = document.querySelectorAll('#bys-course-order-panel .bys-order-row');
                    rows.forEach(function (r, i) {
                        var numEl = r.querySelector('.bys-order-num');
                        if (numEl) numEl.textContent = (i + 1) + '.';
                    });
                }

                function attachDragEvents(row) {
                    row.setAttribute('draggable', 'true');

                    row.addEventListener('dragstart', function (e) {
                        draggingEl = row;
                        row.classList.add('bys-dragging');
                        e.dataTransfer.effectAllowed = 'move';
                    });

                    row.addEventListener('dragend', function () {
                        row.classList.remove('bys-dragging');
                        var list = document.querySelector('#bys-course-order-panel .bys-order-list');
                        if (list) {
                            Array.from(list.querySelectorAll('.bys-order-row')).forEach(function (r) {
                                r.classList.remove('bys-drag-over');
                            });
                        }
                        updateNumbers();
                        var statusEl = document.querySelector('#bys-course-order-panel .bys-save-status');
                        persist(statusEl);
                        draggingEl = null;
                    });

                    row.addEventListener('dragover', function (e) {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'move';
                        if (!draggingEl || draggingEl === row) return;
                        var list = document.querySelector('#bys-course-order-panel .bys-order-list');
                        if (!list) return;
                        Array.from(list.querySelectorAll('.bys-order-row')).forEach(function (r) {
                            r.classList.remove('bys-drag-over');
                        });
                        row.classList.add('bys-drag-over');
                    });

                    row.addEventListener('dragleave', function () {
                        row.classList.remove('bys-drag-over');
                    });

                    row.addEventListener('drop', function (e) {
                        e.preventDefault();
                        row.classList.remove('bys-drag-over');
                        if (!draggingEl || draggingEl === row) return;
                        var list = document.querySelector('#bys-course-order-panel .bys-order-list');
                        if (!list) return;

                        // Insert dragging element before the drop target
                        var rows = Array.from(list.querySelectorAll('.bys-order-row'));
                        var dragIdx = rows.indexOf(draggingEl);
                        var dropIdx = rows.indexOf(row);
                        if (dragIdx < dropIdx) {
                            list.insertBefore(draggingEl, row.nextSibling);
                        } else {
                            list.insertBefore(draggingEl, row);
                        }
                    });
                }

                function buildRow(id, title, position) {
                    var li = document.createElement('li');
                    li.className         = 'bys-order-row';
                    li.dataset.courseId  = id;

                    var handle = document.createElement('span');
                    handle.className   = 'bys-drag-handle';
                    handle.textContent = '⠿';
                    handle.setAttribute('aria-hidden', 'true');

                    var num = document.createElement('span');
                    num.className   = 'bys-order-num';
                    num.textContent = position + '.';

                    var name = document.createElement('span');
                    name.textContent = title;

                    li.appendChild(handle);
                    li.appendChild(num);
                    li.appendChild(name);

                    attachDragEvents(li);
                    return li;
                }

                function renderRows() {
                    var panel = document.getElementById('bys-course-order-panel');
                    if (!panel) return;

                    var body     = panel.querySelector('.bys-panel-body');
                    var emptyMsg = panel.querySelector('.bys-empty-msg');
                    var select   = document.querySelector(SELECTOR + ' select.learndash-binary-selector-items-right');
                    if (!select) return;

                    var options = Array.from(select.options);
                    var list    = body.querySelector('.bys-order-list');
                    if (!list) {
                        list = document.createElement('ul');
                        list.className = 'bys-order-list';
                        body.appendChild(list);
                    }
                    list.innerHTML = '';

                    if (options.length === 0) {
                        emptyMsg.style.display = '';
                        list.style.display     = 'none';
                        return;
                    }
                    emptyMsg.style.display = 'none';
                    list.style.display     = '';

                    // Sort options: known order first, then alphabetical for new ones
                    var ordered = options.slice().sort(function (a, b) {
                        var ai = savedOrder.indexOf(parseInt(a.value, 10));
                        var bi = savedOrder.indexOf(parseInt(b.value, 10));
                        if (ai === -1 && bi === -1) return a.textContent.localeCompare(b.textContent);
                        if (ai === -1) return 1;
                        if (bi === -1) return -1;
                        return ai - bi;
                    });

                    ordered.forEach(function (opt, i) {
                        list.appendChild(buildRow(parseInt(opt.value, 10), opt.textContent.trim(), i + 1));
                    });
                }

                function init() {
                    // Anchor after bys-prerequisites-panel, then bys-required-courses-panel, then binary selector table
                    var anchor = document.getElementById('bys-prerequisites-panel')
                              || document.getElementById('bys-required-courses-panel')
                              || document.querySelector(SELECTOR + ' .learndash-binary-selector-table');

                    if (!anchor || document.getElementById('bys-course-order-panel')) return;

                    var panel = document.createElement('div');
                    panel.id  = 'bys-course-order-panel';
                    panel.innerHTML =
                        '<div class="bys-panel-header">' +
                            '<h4>Course Order</h4>' +
                            '<span class="bys-panel-desc">Drag to set the order courses appear on the lander page.</span>' +
                            '<span class="bys-save-status"></span>' +
                        '</div>' +
                        '<div class="bys-panel-body">' +
                            '<p class="bys-empty-msg">Add courses to the group above to set their order.</p>' +
                        '</div>';

                    anchor.parentNode.insertBefore(panel, anchor.nextSibling);

                    var select = document.querySelector(SELECTOR + ' select.learndash-binary-selector-items-right');
                    if (select) {
                        new MutationObserver(function () {
                            // Remove IDs no longer in the group from savedOrder
                            var present = Array.from(select.options).map(function (o) { return parseInt(o.value, 10); });
                            savedOrder = savedOrder.filter(function (id) { return present.indexOf(id) !== -1; });
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

        // ── Public Helper ─────────────────────────────────────────────────────────

        /**
         * Returns the saved course order for a group as an array of int IDs.
         * Used by single-lander.php to sort courses within each display bucket.
         */
        public static function get_order($group_id) {
            $order = get_post_meta((int) $group_id, self::META_KEY, true);
            return is_array($order) ? array_values(array_map('intval', array_filter($order))) : [];
        }

        // ── Private Helpers ───────────────────────────────────────────────────────

        private function load_order($group_id) {
            return self::get_order($group_id);
        }
    }
}
