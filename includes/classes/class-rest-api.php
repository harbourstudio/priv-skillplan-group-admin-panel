<?php
/**
 * Rest API plugin class.
 *
 * Notes: LearnDash may be abbreviated as LD in code comments across plugin classes
 *
 * @package BYS_Groups
 * @since 1.0.0
 */
if (!defined('ABSPATH')) exit;

if (!class_exists('BYS_Groups_Rest_API')) {
    class BYS_Groups_Rest_API {

        private $namespace = 'bys-groups/v1';

        public function __construct() {
            $this->init();
            $this->setup_cache_invalidation();
        }

        /**
         * Initialize REST API
         */
        private function init() {
            add_action('rest_api_init', array($this, 'register_routes'));
        }

        /**
         * Setup cache invalidation hooks for quiz-related data
         */
        private function setup_cache_invalidation() {
            // Clear quiz steps cache when a quiz post is saved via ACF (e.g., show_in_reporting toggle)
            add_action('acf/save_post', array($this, 'invalidate_quiz_cache_on_save'), 20);
        }

        /**
         * Invalidate quiz steps cache when sfwd-quiz post is saved
         * Ensures show_in_reporting changes are immediately reflected in REST responses
         */
        public function invalidate_quiz_cache_on_save($post_id) {
            $post = get_post($post_id);

            // Only care about sfwd-quiz posts
            if (!$post || $post->post_type !== 'sfwd-quiz') {
                return;
            }

            // Clear all quiz steps cache variants for this quiz's course
            $course_id = get_post_meta($post_id, 'course_id', true);
            if ($course_id) {
                delete_transient("bys_quiz_steps_v4__{$course_id}");
                delete_transient("bys_quiz_steps_v4_grading_{$course_id}");
            }
        }

        /**
         * Get validated auth header for LD API requests
         */
        /**
         * Determine a user's online status.
         * Returns 'online'  — user has at least one active (non-expired) WordPress session.
         * Returns 'offline' — no active session but has a recorded login timestamp.
         * Returns 'never'   — no active session and no recorded login timestamp.
         */
        private function get_user_online_status($user_id) {
            // Primary check: active WordPress session token
            $sessions = WP_Session_Tokens::get_instance($user_id)->get_all();
            $now      = time();
            foreach ($sessions as $session) {
                if (!empty($session['expiration']) && $session['expiration'] > $now) {
                    return 'online';
                }
            }

            // Fallback: check last-login meta to distinguish offline vs never
            $meta_values = array(
                intval(get_user_meta($user_id, '_ld_notifications_last_login', true) ?: 0),
                intval(get_user_meta($user_id, 'learndash-last-login',          true) ?: 0),
                intval(get_user_meta($user_id, 'last_login',                    true) ?: 0),
            );
            $last_login = max($meta_values);
            return $last_login > 0 ? 'offline' : 'never';
        }

        private function get_validated_auth_header() {
            require_once BYS_GROUPS_PLUGIN_DIR . 'includes/classes/class-auth.php';
            $auth_header = BYS_Groups_Auth::get_auth_header();

            if (!$auth_header) {
                return new \WP_REST_Response(array('error' => 'API credentials not configured'), 500);
            }

            return $auth_header;
        }

        /**
         * Register REST routes
         */
        public function register_routes() {

            // currentUserGroups
            register_rest_route($this->namespace, '/me/groups', array(
                'methods'             => 'GET',
                'callback'            => array($this, 'get_current_user_groups'),
                'permission_callback' => array($this, 'check_user_permission'),
            ));

            register_rest_route($this->namespace, '/me/organizations', array(
                'methods'             => 'GET',
                'callback'            => array($this, 'get_current_user_organizations'),
                'permission_callback' => array($this, 'check_user_permission'),
            ));

            register_rest_route($this->namespace, '/organizations', array(
                'methods'             => 'POST',
                'callback'            => array($this, 'create_organization'),
                'permission_callback' => array($this, 'check_site_admin_permission'),
            ));

            register_rest_route($this->namespace, '/organizations/(?P<org_id>\d+)/groups', array(
                'methods'             => 'POST',
                'callback'            => array($this, 'create_organization_group'),
                'permission_callback' => array($this, 'check_user_permission'),
            ));

            // groupBaseUsersStats
            register_rest_route($this->namespace, '/groups/(?P<group_id>\d+)/base-user-stats', array(
                'methods'             => 'GET',
                'callback'            => array($this, 'get_group_base_users_stats'),
                'permission_callback' => array($this, 'check_user_permission'),
            ));

            // groupUsers
            register_rest_route($this->namespace, '/groups/(?P<group_id>\d+)/users', array(
                'methods'             => 'GET',
                'callback'            => array($this, 'get_group_users'),
                'permission_callback' => array($this, 'check_user_permission'),
            ));

            // groupUserInfo
            register_rest_route($this->namespace, '/groups/(?P<group_id>\d+)/users/(?P<user_id>\d+)', array(
                'methods'             => 'GET',
                'callback'            => array($this, 'get_group_user_info'),
                'permission_callback' => array($this, 'check_user_permission'),
            ));

            // removeGroupUser - remove a member from a group
            register_rest_route($this->namespace, '/groups/(?P<group_id>\d+)/users/(?P<user_id>\d+)/remove', array(
                'methods'             => 'POST',
                'callback'            => array($this, 'remove_group_user'),
                'permission_callback' => array($this, 'check_user_permission'),
            ));

            // groupCourses
            register_rest_route($this->namespace, '/groups/(?P<group_id>\d+)/courses', array(
                'methods'             => 'GET',
                'callback'            => array($this, 'get_group_courses'),
                'permission_callback' => array($this, 'check_user_permission'),
            ));

            // groupCourseCompletionStats
            register_rest_route($this->namespace, '/groups/(?P<group_id>\d+)/course-completion-stats', array(
                'methods'             => 'GET',
                'callback'            => array($this, 'get_group_course_completion_stats'),
                'permission_callback' => array($this, 'check_user_permission'),
            ));

            // groupUserCourseProgress
            register_rest_route($this->namespace, '/users/(?P<user_id>\d+)/course-progress', array(
                'methods'             => 'GET',
                'callback'            => array($this, 'get_group_user_course_progress'),
                'permission_callback' => array($this, 'check_user_permission'),
            ));

            // groupQuizAttempts - all group member attempts for a specific quiz
            register_rest_route($this->namespace, '/groups/(?P<group_id>\d+)/quizzes/(?P<quiz_id>\d+)/attempts', array(
                'methods'             => 'GET',
                'callback'            => array($this, 'get_group_quiz_attempts'),
                'permission_callback' => array($this, 'check_user_permission'),
            ));

            // attemptQuestions - per-question results for a single quiz attempt
            register_rest_route($this->namespace, '/attempts/(?P<activity_id>\d+)/questions', array(
                'methods'             => 'GET',
                'callback'            => array($this, 'get_attempt_questions'),
                'permission_callback' => array($this, 'check_user_permission'),
            ));

            // gradeAttemptQuestions - POST to grade questions in an attempt (admin/marker only)
            register_rest_route($this->namespace, '/attempts/(?P<activity_id>\d+)/grade', array(
                'methods'             => 'POST',
                'callback'            => array($this, 'grade_attempt_questions'),
                'permission_callback' => array($this, 'check_grader_permission'),
            ));

            // attemptDetail - full detail for a single quiz attempt by activity ID
            register_rest_route($this->namespace, '/attempts/(?P<activity_id>\d+)', array(
                'methods'             => 'GET',
                'callback'            => array($this, 'get_attempt_detail'),
                'permission_callback' => array($this, 'check_user_permission'),
            ));

            // groupQuizSubmissionStats - per-quiz submission count and last submission date for group members
            register_rest_route($this->namespace, '/groups/(?P<group_id>\d+)/quiz-submission-stats', array(
                'methods'             => 'GET',
                'callback'            => array($this, 'get_group_quiz_submission_stats'),
                'permission_callback' => array($this, 'check_user_permission'),
            ));

            // courseQuizSteps (more specific route, register first)
            register_rest_route($this->namespace, '/courses/(?P<course_id>\d+)/quiz-steps', array(
                'methods'             => 'GET',
                'callback'            => array($this, 'get_course_quiz_steps'),
                'permission_callback' => array($this, 'check_user_permission'),
            ));

            // All quizzes in a course (no show_in_reporting / show_test_grading_config filter).
            // Used by conditional-recipients UI where leaders need to pick from every quiz.
            register_rest_route($this->namespace, '/courses/(?P<course_id>\d+)/quizzes', array(
                'methods'             => 'GET',
                'callback'            => array($this, 'get_course_quizzes'),
                'permission_callback' => array($this, 'check_user_permission'),
            ));

            // Batch quiz progress for multiple users in one course — used by CSV export
            register_rest_route($this->namespace, '/courses/(?P<course_id>\d+)/quiz-progress-batch', array(
                'methods'             => 'GET',
                'callback'            => array($this, 'get_course_quiz_progress_batch'),
                'permission_callback' => array($this, 'check_user_permission'),
            ));

            // courseHierarchialBreakdown
            register_rest_route($this->namespace, '/courses/(?P<course_id>\d+)/steps', array(
                'methods'             => 'GET',
                'callback'            => array($this, 'get_course_steps'),
                'permission_callback' => array($this, 'check_user_permission'),
            ));

            // userCourses - all courses a user is enrolled in (site-wide)
            register_rest_route($this->namespace, '/users/(?P<user_id>\d+)/courses', array(
                'methods'             => 'GET',
                'callback'            => array($this, 'get_user_courses'),
                'permission_callback' => array($this, 'check_user_permission'),
            ));

            // userQuizProgress - user's summary of all quizzes across enrolled courses
            register_rest_route($this->namespace, '/users/(?P<user_id>\d+)/quiz-progress', array(
                'methods'             => 'GET',
                'callback'            => array($this, 'get_user_quiz_progress_summary'),
                'permission_callback' => array($this, 'check_user_permission'),
            ));

            // userQuizAttempts - detailed attempts for a specific quiz
            register_rest_route($this->namespace, '/users/(?P<user_id>\d+)/quiz-attempts/(?P<quiz_id>\d+)', array(
                'methods'             => 'GET',
                'callback'            => array($this, 'get_user_quiz_attempts'),
                'permission_callback' => array($this, 'check_user_permission'),
            ));

            // userCourseStepsProgress - all steps progress for a user in a course (lessons, topics, quizzes)
            register_rest_route($this->namespace, '/users/(?P<user_id>\d+)/course-progress-steps/(?P<course_id>\d+)', array(
                'methods'             => 'GET',
                'callback'            => array($this, 'get_user_course_steps_progress'),
                'permission_callback' => array($this, 'check_user_permission'),
            ));

            // userActivity - activity log for a user
            register_rest_route($this->namespace, '/users/(?P<user_id>\d+)/activity', array(
                'methods'             => 'GET',
                'callback'            => array($this, 'get_user_activity'),
                'permission_callback' => array($this, 'check_user_permission'),
            ));

            // logCertificateView - log when user views a certificate
            register_rest_route($this->namespace, '/users/(?P<user_id>\d+)/log-certificate-view', array(
                'methods'             => 'POST',
                'callback'            => array($this, 'log_certificate_view'),
                'permission_callback' => array($this, 'check_user_permission'),
            ));

            // trackTopicVisit - increment per-topic visit counter
            register_rest_route($this->namespace, '/users/(?P<user_id>\d+)/track-topic-visit', array(
                'methods'             => 'POST',
                'callback'            => array($this, 'track_topic_visit'),
                'permission_callback' => array($this, 'check_user_permission'),
            ));

            // archiveGroup - set a group post status to draft
            register_rest_route($this->namespace, '/groups/(?P<group_id>\d+)/archive', array(
                'methods'             => 'POST',
                'callback'            => array($this, 'archive_group'),
                'permission_callback' => array($this, 'check_user_permission'),
            ));

            // unarchiveGroup - restore a group post status to publish
            register_rest_route($this->namespace, '/groups/(?P<group_id>\d+)/unarchive', array(
                'methods'             => 'POST',
                'callback'            => array($this, 'unarchive_group'),
                'permission_callback' => array($this, 'check_user_permission'),
            ));

            // currentUserArchivedGroups - draft-status groups the current user leads
            register_rest_route($this->namespace, '/me/archived-groups', array(
                'methods'             => 'GET',
                'callback'            => array($this, 'get_current_user_archived_groups'),
                'permission_callback' => array($this, 'check_user_permission'),
            ));

            // allCourses - search all published LD courses (for add-course autocomplete)
            register_rest_route($this->namespace, '/all-courses', array(
                'methods'             => 'GET',
                'callback'            => array($this, 'get_all_courses'),
                'permission_callback' => array($this, 'check_user_permission'),
            ));

            // addGroupCourse - add a course to a group
            register_rest_route($this->namespace, '/groups/(?P<group_id>\d+)/courses/(?P<course_id>\d+)/add', array(
                'methods'             => 'POST',
                'callback'            => array($this, 'add_group_course'),
                'permission_callback' => array($this, 'check_user_permission'),
            ));

            // removeGroupCourse - remove a course from a group
            register_rest_route($this->namespace, '/groups/(?P<group_id>\d+)/courses/(?P<course_id>\d+)/remove', array(
                'methods'             => 'POST',
                'callback'            => array($this, 'remove_group_course'),
                'permission_callback' => array($this, 'check_user_permission'),
            ));

            // toggleRequiredCourse - toggle required status for a course in a group
            register_rest_route($this->namespace, '/groups/(?P<group_id>\d+)/courses/(?P<course_id>\d+)/toggle-required', array(
                'methods'             => 'POST',
                'callback'            => array($this, 'toggle_required_course'),
                'permission_callback' => array($this, 'check_user_permission'),
            ));

            // groupLeaders - all leaders assigned to a group
            register_rest_route($this->namespace, '/groups/(?P<group_id>\d+)/leaders', array(
                'methods'             => 'GET',
                'callback'            => array($this, 'get_group_leaders'),
                'permission_callback' => array($this, 'check_user_permission'),
            ));

            // removeGroupLeader - org/site admins only
            register_rest_route($this->namespace, '/groups/(?P<group_id>\d+)/leaders/(?P<user_id>\d+)', array(
                'methods'             => 'DELETE',
                'callback'            => array($this, 'remove_group_leader'),
                'permission_callback' => array($this, 'check_user_permission'),
            ));

            // inviteMember - add existing user or create pending invite
            register_rest_route($this->namespace, '/groups/(?P<group_id>\d+)/invite', array(
                'methods'             => 'POST',
                'callback'            => array($this, 'invite_member'),
                'permission_callback' => array($this, 'check_user_permission'),
            ));

            // bulk add/invite users to the group
            register_rest_route($this->namespace, '/groups/(?P<group_id>\d+)/invite-bulk', array(
                'methods'             => 'POST',
                'callback'            => array($this, 'bulk_user_addition'),
                'permission_callback' => array($this, 'check_user_permission'),
            ));

            // getPendingInvites - list pending invites for a group
            register_rest_route($this->namespace, '/groups/(?P<group_id>\d+)/pending-invites', array(
                'methods'             => 'GET',
                'callback'            => array($this, 'get_pending_invites'),
                'permission_callback' => array($this, 'check_user_permission'),
            ));

            // cancelInvite - cancel a pending invite
            register_rest_route($this->namespace, '/groups/(?P<group_id>\d+)/invites/(?P<invite_id>\d+)/cancel', array(
                'methods'             => 'POST',
                'callback'            => array($this, 'cancel_invite'),
                'permission_callback' => array($this, 'check_user_permission'),
            ));

            // group quiz access (group-based start/end access date for sfwd-quiz)
            register_rest_route($this->namespace, '/groups/(?P<group_id>\d+)/quiz-access', array(
                'methods' => 'GET, POST',
                'callback' => array($this, 'group_quiz_access'),
                'permission_callback' => array($this, 'check_user_permission')
            ));

            // group-user quiz access (overrides group settings)
            register_rest_route($this->namespace, '/groups/(?P<group_id>\d+)/users/(?P<user_id>\d+)/quiz-access', array(
                'methods' => 'GET, POST',
                'callback' => array($this, 'user_quiz_access'),
                'permission_callback' => array($this, 'check_user_permission')
            ));

            // send group communication (emails)
            register_rest_route($this->namespace, '/groups/(?P<group_id>\d+)/send-communication', array(
                'methods' => 'POST',
                'callback' => array($this, 'send_group_communication'),
                'permission_callback' => array($this, 'check_user_permission'),
                'args' => array(
                    'prompt_type' => array(
                        'type' => 'string',
                        'required' => true,
                    ),
                    'recipient_type' => array(
                        'type' => 'string',
                        'required' => true,
                    ),
                    'recipient_ids' => array(
                        'type' => 'array',
                        'required' => false,
                    ),
                    'custom_subject' => array(
                        'type' => 'string',
                        'required' => false,
                    ),
                    'custom_message' => array(
                        'type' => 'string',
                        'required' => false,
                    ),
                )
            ));

            // get group communication log from Postmark
            register_rest_route($this->namespace, '/groups/(?P<group_id>\d+)/communication-log', array(
                'methods' => 'GET',
                'callback' => array($this, 'get_group_communication_log'),
                'permission_callback' => array($this, 'check_user_permission')
            ));

            // get communication prompt template preview
            register_rest_route($this->namespace, '/groups/(?P<group_id>\d+)/template/(?P<prompt_type>[\w-]+)', array(
                'methods' => 'GET',
                'callback' => array($this, 'get_email_template'),
                'permission_callback' => array($this, 'check_user_permission')
            ));

            // Postmark webhook endpoint (no authentication required — Postmark calls this)
            register_rest_route($this->namespace, '/webhooks/postmark', array(
                'methods' => 'POST',
                'callback' => array($this, 'handle_postmark_webhook'),
                'permission_callback' => '__return_true',
            ));

            // Get all recipients in a batch send
            register_rest_route($this->namespace, '/communications/batch/(?P<batch_id>[a-zA-Z0-9\-]+)/recipients', array(
                'methods' => 'GET',
                'callback' => array($this, 'get_communication_recipients'),
                'permission_callback' => array($this, 'check_user_permission'),
            ));

            // Get detail for a single message
            register_rest_route($this->namespace, '/communications/(?P<message_id>[a-zA-Z0-9\-]+)/detail', array(
                'methods' => 'GET',
                'callback' => array($this, 'get_communication_detail'),
                'permission_callback' => array($this, 'check_user_permission'),
            ));

            register_rest_route($this->namespace, '/groups/(?P<group_id>\d+)/conditional-recipients', array(
                'methods'             => 'POST',
                'callback'            => array('BYS_Groups_Conditional_Emails', 'rest_get_recipients'),
                'permission_callback' => array($this, 'check_user_permission'),
            ));

        }

        private function is_grader_user() {
            return in_array('grader', (array) wp_get_current_user()->roles, true);
        }

        /**
         * Returns true if $user_id may act as a group leader for $group_id.
         * Passes when the user is:
         *   - a WordPress site admin (manage_options), OR
         *   - a LearnDash group leader of the group, OR
         *   - an org admin of any organization that contains the group.
         */
        private function is_authorized_for_group($user_id, $group_id) {
            if (!$user_id || !$group_id) return false;

            if (current_user_can('manage_options')) return true;

            if (get_user_meta($user_id, "learndash_group_leaders_{$group_id}", true)) return true;

            // Check if any org containing this group has the user as an admin
            $orgs = get_posts(array(
                'post_type'      => 'organization',
                'post_status'    => 'publish',
                'posts_per_page' => -1,
            ));
            foreach ($orgs as $org) {
                $raw_groups = get_field('groups', $org->ID);
                $group_ids  = array_map(function ($g) {
                    return $g instanceof \WP_Post ? $g->ID : intval($g);
                }, (array) $raw_groups);

                if (!in_array($group_id, $group_ids, true)) continue;

                $raw_admins = get_field('administrators', $org->ID);
                $admin_ids  = array_map(function ($a) {
                    return $a instanceof \WP_User ? $a->ID : intval($a);
                }, (array) $raw_admins);

                if (in_array($user_id, $admin_ids, true)) return true;
            }

            return false;
        }

        public function check_site_admin_permission($request) {
            $auth_header = $request->get_header('Authorization');
            if ($auth_header && strpos($auth_header, 'Basic ') === 0) {
                $user = wp_get_current_user();
                return $user->ID > 0 ? current_user_can('manage_options') : false;
            }
            return is_user_logged_in() && current_user_can('manage_options');
        }

        public function check_user_permission($request) {
            // check for Authorization header (basic auth)
            $auth_header = $request->get_header('Authorization');
            if ($auth_header && strpos($auth_header, 'Basic ') === 0) {
                return true;
            }
            // fallback: require user to be logged in
            return is_user_logged_in();
        }

        /**
         * Permission callback for grading endpoints — requires admin or 'marker' role.
         *
         * Follows the same Basic-auth bypass pattern as check_user_permission:
         * the bysGroupsAuth header is a server-rendered service-account credential,
         * not a WP Application Password, so is_user_logged_in() may return false for
         * REST POST requests without a nonce even when the page-level user is an admin.
         * We additionally check the WP role when the user can be resolved.
         */
        public function check_grader_permission($request) {
            $auth_header = $request->get_header('Authorization');
            if ($auth_header && strpos($auth_header, 'Basic ') === 0) {
                // Basic auth header present. If WP resolved a user (Application Passwords),
                // verify the role; otherwise trust the header like check_user_permission.
                $user = wp_get_current_user();
                if ($user->ID > 0) {
                    return user_can($user, 'manage_options') || in_array('marker', (array) $user->roles, true);
                }
                return true;
            }
            // Cookie-based auth (nonce sent from browser session)
            if (!is_user_logged_in()) {
                return false;
            }
            $user = wp_get_current_user();
            return user_can($user, 'manage_options') || in_array('marker', (array) $user->roles, true);
        }

        /**
         * Get all LD groups the current user is a leader of.
         *
         * LD stores group leadership as user meta with key format:
         * learndash_group_leaders_{group_id} => group_id
         */
        public function get_current_user_groups($request) {
            $user_id = get_current_user_id();

            if (!$user_id) {
                return new \WP_REST_Response(array('error' => 'Not logged in'), 401);
            }

            // Site admins and graders see every published group
            $is_grader = $this->is_grader_user();
            if (current_user_can('manage_options') || $is_grader) {
                $all_groups = get_posts(array(
                    'post_type'      => 'groups',
                    'post_status'    => 'publish',
                    'posts_per_page' => -1,
                    'orderby'        => 'title',
                    'order'          => 'ASC',
                ));
                $user_groups = array();
                foreach ($all_groups as $group) {
                    $user_groups[] = array(
                        'id'           => $group->ID,
                        'title'        => $group->post_title,
                        'is_org_admin' => !$is_grader, // graders can't act as org admins
                    );
                }
                return new \WP_REST_Response(array('groups' => $user_groups), 200);
            }

            // Collect group IDs via LD group leader meta
            $led_ids = array();
            foreach (get_user_meta($user_id) as $meta_key => $meta_values) {
                if (strpos($meta_key, 'learndash_group_leaders_') === 0) {
                    $group_id = intval(str_replace('learndash_group_leaders_', '', $meta_key));
                    if ($group_id > 0) {
                        $led_ids[] = $group_id;
                    }
                }
            }

            // Collect group IDs from organizations where this user is an admin
            $org_admin_ids = array();
            $all_orgs = get_posts(array(
                'post_type'      => 'organization',
                'post_status'    => 'publish',
                'posts_per_page' => -1,
                'fields'         => 'ids',
            ));
            foreach ($all_orgs as $org_id) {
                $raw_admins = get_field('administrators', $org_id);
                $admin_ids  = array();
                foreach ((array) $raw_admins as $admin) {
                    $admin_ids[] = $admin instanceof \WP_User ? $admin->ID : intval($admin);
                }
                if (!in_array($user_id, $admin_ids, true)) continue;

                $raw_groups = get_field('groups', $org_id);
                foreach ((array) $raw_groups as $group) {
                    $g_id = $group instanceof \WP_Post ? $group->ID : intval($group);
                    if ($g_id > 0) {
                        $org_admin_ids[] = $g_id;
                    }
                }
            }

            $org_admin_set  = array_flip(array_unique($org_admin_ids));
            $accessible_ids = array_unique(array_merge($led_ids, $org_admin_ids));

            if (empty($accessible_ids)) {
                return new \WP_REST_Response(array('groups' => array()), 200);
            }

            // Build response — only published groups
            $user_groups = array();
            foreach ($accessible_ids as $group_id) {
                $group = get_post($group_id);
                if ($group && $group->post_type === 'groups' && $group->post_status === 'publish') {
                    $user_groups[] = array(
                        'id'           => $group->ID,
                        'title'        => $group->post_title,
                        'is_org_admin' => isset($org_admin_set[$group_id]),
                    );
                }
            }

            return new \WP_REST_Response(array('groups' => $user_groups), 200);
        }

        /**
         * Get all organizations the current user is an admin of or leads a group in,
         * plus any groups they lead that don't belong to any organization.
         */
        public function get_current_user_organizations($request) {
            $user_id = get_current_user_id();
            if (!$user_id) {
                return new \WP_REST_Response(array('error' => 'Not logged in'), 401);
            }

            $is_site_admin = current_user_can('manage_options');
            $is_grader     = $this->is_grader_user();
            $sees_all      = $is_site_admin || $is_grader;

            // Collect every group ID the current user leads (via LD group leader meta)
            $all_led_ids = array();
            if (!$sees_all) {
                foreach (get_user_meta($user_id) as $meta_key => $meta_values) {
                    if (strpos($meta_key, 'learndash_group_leaders_') === 0) {
                        $g_id = intval(str_replace('learndash_group_leaders_', '', $meta_key));
                        if ($g_id > 0) $all_led_ids[] = $g_id;
                    }
                }
            }

            $all_orgs = get_posts(array(
                'post_type'      => 'organization',
                'post_status'    => 'publish',
                'posts_per_page' => -1,
                'orderby'        => 'title',
                'order'          => 'ASC',
            ));

            $organizations = array();
            $claimed_ids   = array(); // group IDs that belong to at least one org

            foreach ($all_orgs as $org) {
                // Site admins are org admins; graders see everything but aren't org admins
                if ($is_site_admin) {
                    $is_admin = true;
                } elseif ($is_grader) {
                    $is_admin = false;
                } else {
                    $raw_admins = get_field('administrators', $org->ID);
                    $admin_ids  = array();
                    foreach ((array) $raw_admins as $admin) {
                        $admin_ids[] = $admin instanceof \WP_User ? $admin->ID : intval($admin);
                    }
                    $is_admin = in_array($user_id, $admin_ids, true);
                }

                // Resolve group IDs — ACF may return WP_Post objects or raw IDs
                $raw_groups         = get_field('groups', $org->ID);
                $groups             = array();
                $archived_groups    = array();
                $user_leads_a_group = false;

                foreach ((array) $raw_groups as $group) {
                    if ($group instanceof \WP_Post) {
                        $g_id     = $group->ID;
                        $g_title  = $group->post_title;
                        $g_status = $group->post_status;
                    } else {
                        $g_id    = intval($group);
                        $g_post  = get_post($g_id);
                        $g_title  = $g_post ? $g_post->post_title  : '';
                        $g_status = $g_post ? $g_post->post_status : '';
                    }

                    if (!$g_id || !$g_title) continue;

                    $claimed_ids[] = $g_id;

                    if (!$user_leads_a_group && in_array($g_id, $all_led_ids, true)) {
                        $user_leads_a_group = true;
                    }

                    if ($g_status === 'publish') {
                        $groups[] = array('id' => $g_id, 'name' => $g_title);
                    } elseif ($g_status === 'draft' && $is_admin) {
                        $archived_date = get_post_meta($g_id, '_bys_archived_date', true)
                            ?: get_post_modified_time('U', false, $g_id);
                        $archived_groups[] = array(
                            'id'            => $g_id,
                            'name'          => $g_title,
                            'archived_date' => (int) $archived_date,
                        );
                    }
                }

                if (!$sees_all && !$is_admin && !$user_leads_a_group) continue;

                $organizations[] = array(
                    'id'              => $org->ID,
                    'name'            => $org->post_title,
                    'is_admin'        => $is_admin,
                    'groups'          => $groups,
                    'archived_groups' => $archived_groups,
                );
            }

            // Groups not belonging to any organization
            $ungrouped = array();
            if ($sees_all) {
                // Site admins and graders see all published groups not claimed by an org
                $all_groups = get_posts(array(
                    'post_type'      => 'groups',
                    'post_status'    => 'publish',
                    'posts_per_page' => -1,
                    'fields'         => 'ids',
                ));
                foreach (array_diff($all_groups, $claimed_ids) as $g_id) {
                    $g_post = get_post($g_id);
                    if ($g_post) {
                        $ungrouped[] = array('id' => $g_id, 'name' => $g_post->post_title);
                    }
                }
            } else {
                foreach (array_diff($all_led_ids, $claimed_ids) as $g_id) {
                    $g_post = get_post($g_id);
                    if ($g_post && $g_post->post_type === 'groups' && $g_post->post_status === 'publish') {
                        $ungrouped[] = array('id' => $g_id, 'name' => $g_post->post_title);
                    }
                }
            }

            return new \WP_REST_Response(array(
                'organizations'    => $organizations,
                'ungrouped_groups' => $ungrouped,
            ), 200);
        }

        /**
         * Create a new organization post (site admins only).
         */
        public function create_organization($request) {
            $name = sanitize_text_field($request->get_param('name'));
            if (empty($name)) {
                return new \WP_REST_Response(array('error' => 'Organization name is required'), 400);
            }

            $org_id = wp_insert_post(array(
                'post_type'   => 'organization',
                'post_status' => 'publish',
                'post_title'  => $name,
                'post_author' => get_current_user_id(),
            ), true);

            if (is_wp_error($org_id)) {
                return new \WP_REST_Response(array('error' => $org_id->get_error_message()), 500);
            }

            return new \WP_REST_Response(array(
                'id'              => $org_id,
                'name'            => get_the_title($org_id),
                'is_admin'        => true,
                'groups'          => array(),
                'archived_groups' => array(),
            ), 201);
        }

        /**
         * Create a new LearnDash group and attach it to an organization.
         * Only callable by a user who is an administrator of that organization.
         */
        public function create_organization_group($request) {
            $user_id = get_current_user_id();
            if (!$user_id) {
                return new \WP_REST_Response(array('error' => 'Not logged in'), 401);
            }

            $org_id = intval($request['org_id']);
            $org    = get_post($org_id);
            if (!$org || $org->post_type !== 'organization' || $org->post_status !== 'publish') {
                return new \WP_REST_Response(array('error' => 'Organization not found'), 404);
            }

            // Verify the current user is a site admin or an admin of this org
            if (!current_user_can('manage_options')) {
                $raw_admins = get_field('administrators', $org_id);
                $admin_ids  = array();
                foreach ((array) $raw_admins as $admin) {
                    $admin_ids[] = $admin instanceof \WP_User ? $admin->ID : intval($admin);
                }
                if (!in_array($user_id, $admin_ids, true)) {
                    return new \WP_REST_Response(array('error' => 'Forbidden'), 403);
                }
            }

            $name = sanitize_text_field($request->get_param('name'));
            if (empty($name)) {
                return new \WP_REST_Response(array('error' => 'Group name is required'), 400);
            }

            // Create the LearnDash group post
            $group_id = wp_insert_post(array(
                'post_type'   => 'groups',
                'post_status' => 'publish',
                'post_title'  => $name,
                'post_author' => $user_id,
            ), true);

            if (is_wp_error($group_id)) {
                return new \WP_REST_Response(array('error' => $group_id->get_error_message()), 500);
            }

            // Also make the creating user a group leader in LearnDash
            ld_update_leader_group_access($user_id, $group_id, false);

            // Append the new group to the org's ACF groups field
            $existing = get_field('groups', $org_id);
            $existing_ids = array();
            foreach ((array) $existing as $g) {
                $existing_ids[] = $g instanceof \WP_Post ? $g->ID : intval($g);
            }
            $existing_ids[] = $group_id;
            update_field('groups', $existing_ids, $org_id);

            return new \WP_REST_Response(array(
                'id'   => $group_id,
                'name' => get_the_title($group_id),
            ), 201);
        }

        public function get_group_base_users_stats($request) {
            $group_id = intval($request['group_id']);

            if (!$group_id) {
                return new \WP_REST_Response(array('error' => 'Invalid group ID'), 400);
            }

            // Get validated auth header for LD API
            $auth_result = $this->get_validated_auth_header();
            if (is_a($auth_result, 'WP_REST_Response')) {
                return $auth_result; // Return error response
            }
            $auth_header = $auth_result;

            // Fetch all group users from LD API (paginated — LD defaults to 10 per page)
            $group_users = array();
            $page        = 1;
            $per_page    = 100;

            do {
                $ld_api_url = get_home_url() . "/wp-json/ldlms/v2/groups/{$group_id}/users?_fields=id&per_page={$per_page}&page={$page}";

                $response = wp_remote_get($ld_api_url, array(
                    'headers' => array(
                        'Authorization' => $auth_header,
                    ),
                    'sslverify' => false,
                ));

                if (is_wp_error($response)) {
                    return new \WP_REST_Response(array('error' => $response->get_error_message()), 500);
                }

                $status = wp_remote_retrieve_response_code($response);
                $body   = wp_remote_retrieve_body($response);

                if ($status !== 200) {
                    return new \WP_REST_Response(array('error' => 'Failed to fetch users from LearnDash API', 'status' => $status), $status);
                }

                $page_users = json_decode($body, true);
                if (!is_array($page_users) || empty($page_users)) {
                    break;
                }

                $group_users = array_merge($group_users, $page_users);
                $page++;
            } while (count($page_users) === $per_page);

            $total_members = count($group_users);
            $inactive_members = 0;

            // Count inactive members by checking user meta
            $user_ids = array();
            foreach ($group_users as $user_data) {
                $user_id = intval($user_data['id']);
                $user_ids[] = $user_id;
                $login_meta = array(
                    intval(get_user_meta($user_id, '_ld_notifications_last_login', true) ?: 0),
                    intval(get_user_meta($user_id, 'learndash-last-login',          true) ?: 0),
                    intval(get_user_meta($user_id, 'last_login',                    true) ?: 0),
                );
                if (max($login_meta) === 0) {
                    $inactive_members++;
                }
            }

            // Return stats
            return new \WP_REST_Response(array(
                'group_id'               => $group_id,
                'total_members'          => $total_members,
                'total_inactive_members' => $inactive_members,
                'user_ids'               => $user_ids,
            ), 200);
        }

        public function get_group_users($request) {
            $group_id = intval($request['group_id']);
            $user_ids_param = $request->get_param('user_ids');

            if (!$group_id) {
                return new \WP_REST_Response(array('error' => 'Invalid group ID'), 400);
            }

            // Parse user_ids from comma-separated param
            $user_ids = array();
            if ($user_ids_param) {
                $user_ids = array_map('intval', explode(',', $user_ids_param));
                $user_ids = array_filter($user_ids);
            }

            if (empty($user_ids)) {
                return new \WP_REST_Response(array(), 200);
            }

            // Fetch user data from WordPress
            $users = array();
            foreach ($user_ids as $user_id) {
                $user = get_user_by('ID', $user_id);
                if ($user) {
                    // Check multiple login meta keys and use the most recent one
                    $meta_values = array(
                        intval(get_user_meta($user_id, '_ld_notifications_last_login', true) ?: 0),
                        intval(get_user_meta($user_id, 'learndash-last-login',          true) ?: 0),
                        intval(get_user_meta($user_id, 'last_login',                    true) ?: 0),
                    );

                    $last_login_timestamp = max($meta_values);
                    $last_login_timestamp = $last_login_timestamp > 0 ? $last_login_timestamp : null;

                    $status = $this->get_user_online_status($user_id);

                    $enrolled_at_raw = get_user_meta($user_id, "learndash_group_{$group_id}_enrolled_at", true);

                    $users[] = array(
                        'id'           => $user->ID,
                        'first_name'   => get_user_meta($user_id, 'first_name', true) ?: '',
                        'last_name'    => get_user_meta($user_id, 'last_name', true) ?: '',
                        'display_name' => $user->display_name,
                        'email'        => $user->user_email,
                        'avatar'       => get_avatar_url($user_id, array('size' => 64)),
                        'enrolled_at'  => $enrolled_at_raw ? wp_date('c', (int) $enrolled_at_raw) : null,
                        'last_login'   => $last_login_timestamp ? wp_date('c', $last_login_timestamp) : null,
                        'status'       => $status,
                    );
                }
            }

            return new \WP_REST_Response($users, 200);
        }

        /**
         * Get detailed information for a single user in a group
         */
        public function get_group_user_info($request) {
            $group_id = intval($request['group_id']);
            $user_id = intval($request['user_id']);

            if (!$group_id || !$user_id) {
                return new \WP_REST_Response(array('error' => 'Invalid group ID or user ID'), 400);
            }

            // Verify user exists and belongs to group
            $user = get_user_by('ID', $user_id);
            if (!$user) {
                return new \WP_REST_Response(array('error' => 'User not found'), 404);
            }

            // Get user's group enrollment date
            $group_enrolled_date = get_user_meta($user_id, "learndash_group_{$group_id}_enrolled_at", true);

            // Check multiple login meta keys and use the most recent one
            $meta_values = array(
                intval(get_user_meta($user_id, '_ld_notifications_last_login', true) ?: 0),
                intval(get_user_meta($user_id, 'learndash-last-login',          true) ?: 0),
                intval(get_user_meta($user_id, 'last_login',                    true) ?: 0),
            );

            $last_login_timestamp = max($meta_values);
            $last_login_timestamp = $last_login_timestamp > 0 ? $last_login_timestamp : null;

            $status = $this->get_user_online_status($user_id);

            $user_data = array(
                'id'                   => $user->ID,
                'first_name'           => $user->first_name,
                'last_name'            => $user->last_name,
                'display_name'         => $user->display_name,
                'email'                => $user->user_email,
                'status'               => $status,
                'group_enrolled_date'  => $group_enrolled_date ?: null,
                'last_login'           => $last_login_timestamp,
                'avatar_url'           => get_avatar_url($user_id, ['size' => 80]),
            );

            return new \WP_REST_Response($user_data, 200);
        }

        /**
         * Remove a user from a LearnDash group.
         * Uses ld_update_group_access() which handles all LD-side cleanup.
         */
        public function remove_group_user($request) {
            $group_id = intval($request['group_id']);
            $user_id  = intval($request['user_id']);

            if (!$group_id || !$user_id) {
                return new \WP_REST_Response(array('error' => 'Invalid group ID or user ID'), 400);
            }

            $group = get_post($group_id);
            if (!$group || $group->post_type !== 'groups') {
                return new \WP_REST_Response(array('error' => 'Group not found'), 404);
            }

            ld_update_group_access($user_id, $group_id, true);

            return new \WP_REST_Response(array('success' => true, 'user_id' => $user_id), 200);
        }

        public function get_group_courses($request) {
            $group_id = intval($request['group_id']);

            if (!$group_id) {
                return new \WP_REST_Response(array('error' => 'Invalid group ID'), 400);
            }

            // Get validated auth header for LD API
            $auth_result = $this->get_validated_auth_header();
            if (is_a($auth_result, 'WP_REST_Response')) {
                return $auth_result; // Return error response
            }
            $auth_header = $auth_result;

            // call to get group courses
            $ld_api_url = get_home_url() . "/wp-json/ldlms/v2/groups/{$group_id}/courses?_fields=id,title";

            $response = wp_remote_get($ld_api_url, array(
                'headers' => array(
                    'Authorization' => $auth_header,
                ),
                'sslverify' => false,
            ));

            if (is_wp_error($response)) {
                return new \WP_REST_Response(array('error' => $response->get_error_message()), 500);
            }

            $status = wp_remote_retrieve_response_code($response);
            $body = wp_remote_retrieve_body($response);

            if ($status !== 200) {
                return new \WP_REST_Response(array('error' => 'Failed to fetch courses from LearnDash API', 'status' => $status), $status);
            }

            $courses = json_decode($body, true);

            // extract id, title, and shortname (custom meta) from each course
            $formatted_courses = array();
            if (is_array($courses)) {
                foreach ($courses as $course) {
                    $course_id = $course['id'] ?? null;
                    $shortname = $course_id ? get_post_meta($course_id, 'shortname', true) : '';
                    $formatted_courses[] = array(
                        'id'        => $course_id,
                        'title'     => $course['title'] ?? 'Untitled',
                        'shortname' => $shortname ?: null,
                    );
                }
            }

            return new \WP_REST_Response($formatted_courses, 200);
        }

        /**
         * Get all courses a user is enrolled in across the whole site.
         */
        public function get_user_courses($request) {
            $user_id = intval($request['user_id']);
            if (!$user_id) {
                return new \WP_REST_Response(array('error' => 'Invalid user ID'), 400);
            }

            $course_ids = learndash_user_get_enrolled_courses($user_id);
            $result = array();
            foreach ($course_ids as $course_id) {
                $post = get_post($course_id);
                if (!$post || $post->post_status !== 'publish') continue;
                $shortname = get_post_meta($course_id, 'shortname', true);
                $result[] = array(
                    'id'        => $course_id,
                    'title'     => $post->post_title,
                    'shortname' => $shortname ?: null,
                );
            }
            return new \WP_REST_Response($result, 200);
        }

        /**
         * Get course completion stats for entire group via LD API
         * Totals completed/incomplete counts across all users
         */
        public function get_group_course_completion_stats($request) {
            $group_id = intval($request['group_id']);
            $course_ids_param = $request->get_param('course_ids');

            if (!$group_id) {
                return new \WP_REST_Response(array('error' => 'Invalid group_id'), 400);
            }

            $auth_result = $this->get_validated_auth_header();
            if (is_a($auth_result, 'WP_REST_Response')) {
                return $auth_result;
            }
            $auth_header = $auth_result;

            // fetch all user IDs in this group from LD API
            $ld_users_url = get_home_url() . "/wp-json/ldlms/v2/groups/{$group_id}/users?_fields=id";
            $response = wp_remote_get($ld_users_url, array(
                'headers'   => array('Authorization' => $auth_header),
                'timeout'   => 30,
                'sslverify' => false,
            ));

            if (is_wp_error($response) || wp_remote_retrieve_response_code($response) !== 200) {
                return new \WP_REST_Response(array('error' => 'Failed to fetch group users'), 500);
            }

            $group_users = json_decode(wp_remote_retrieve_body($response), true);
            if (!is_array($group_users) || empty($group_users)) {
                return new \WP_REST_Response(array('total_completed' => 0, 'total_incomplete' => 0), 200);
            }

            $user_ids = array_map(function($u) { return intval($u['id']); }, $group_users);

            // Resolve course IDs — either from param or fetch from LD API
            if (!empty($course_ids_param)) {
                $course_ids = array_filter(array_map('intval', explode(',', $course_ids_param)));
            } else {
                $group_courses = $this->get_group_courses_internal($group_id, $auth_header);
                if (is_a($group_courses, 'WP_REST_Response')) {
                    return $group_courses;
                }
                $course_ids = array_map(function($c) { return intval($c['id']); }, $group_courses);
            }

            if (empty($course_ids)) {
                return new \WP_REST_Response(array('total_completed' => 0, 'total_incomplete' => 0), 200);
            }

            $total_completed = 0;
            $total_incomplete = 0;

            // For each user × course, fetch progress_status from LD API
            foreach ($user_ids as $user_id) {
                foreach ($course_ids as $course_id) {
                    $ld_url = get_home_url() . "/wp-json/ldlms/v2/users/{$user_id}/course-progress/{$course_id}?_fields=progress_status";

                    $response = wp_remote_get($ld_url, array(
                        'headers'   => array('Authorization' => $auth_header),
                        'timeout'   => 30,
                        'sslverify' => false,
                    ));

                    if (is_wp_error($response) || wp_remote_retrieve_response_code($response) !== 200) {
                        continue; // Skip if request fails
                    }

                    $progress = json_decode(wp_remote_retrieve_body($response), true);
                    if (!is_array($progress) || empty($progress)) {
                        $total_incomplete++;
                        continue;
                    }

                    $status = $progress['progress_status'] ?? '';
                    if ($status === 'completed') {
                        $total_completed++;
                    } else {
                        $total_incomplete++;
                    }
                }
            }

            return new \WP_REST_Response(array(
                'total_completed'  => $total_completed,
                'total_incomplete' => $total_incomplete,
            ), 200);
        }

        /**
         * Get hierarchal lessons and topics data for a course
         */
        public function get_course_steps($request) {
            $course_id = intval($request['course_id']);

            if (!$course_id) {
                return new \WP_REST_Response(array('error' => 'Invalid course ID'), 400);
            }

            // Get validated auth header for LD API
            $auth_result = $this->get_validated_auth_header();
            if (is_a($auth_result, 'WP_REST_Response')) {
                return $auth_result; // Return error response
            }
            $auth_header = $auth_result;

            // Fetch steps from LD API with hierarchical and type-list formats
            $ld_api_url = get_home_url() . "/wp-json/ldlms/v2/sfwd-courses/{$course_id}/steps?_fields=h,t";

            $response = wp_remote_get($ld_api_url, array(
                'headers' => array(
                    'Authorization' => $auth_header,
                ),
                'sslverify' => false,
                'timeout'   => 60, // Increase timeout to 60 seconds for large courses
            ));

            if (is_wp_error($response)) {
                return new \WP_REST_Response(array('error' => $response->get_error_message()), 500);
            }

            $status = wp_remote_retrieve_response_code($response);
            $body = wp_remote_retrieve_body($response);

            if ($status !== 200) {
                return new \WP_REST_Response(array('error' => 'Failed to fetch steps from LearnDash API', 'status' => $status), $status);
            }

            $data = json_decode($body, true);

            // Parse hierarchical structure for lessons/topics
            $h_lessons = $data['h']['sfwd-lessons'] ?? array();
            $lessons = array();

            foreach ($h_lessons as $lesson_id => $lesson_data) {
                $lesson = get_post($lesson_id);
                $topics_data = $lesson_data['sfwd-topic'] ?? array();

                $lessons[] = array(
                    'id'     => $lesson_id,
                    'title'  => $lesson ? $lesson->post_title : 'Undefined',
                    'topics' => array_map(function ($topic_id) {
                        $topic = get_post($topic_id);
                        return array(
                            'id'    => $topic_id,
                            'title' => $topic ? $topic->post_title : 'Undefined',
                        );
                    }, array_keys($topics_data)),
                );
            }

            // Extract quiz IDs from type-list format (t.sfwd-quiz)
            $quiz_ids = $data['t']['sfwd-quiz'] ?? array();

            return new \WP_REST_Response(array(
                'lessons' => $lessons,
                'quiz_ids' => array_map('intval', $quiz_ids),
            ), 200);
        }

        /**
         * Get user course progress for specific courses
         * Fetches progress, completion, enrollment, and step data from user meta and activity table
         */
        public function get_group_user_course_progress($request) {
            $user_id = intval($request['user_id']);
            $course_ids_param = $request->get_param('course_ids'); // comma-separated: 1,2,3

            if (!$user_id || !$course_ids_param) {
                return new \WP_REST_Response(array('error' => 'Invalid user ID or course_ids'), 400);
            }

            // Parse course IDs
            $course_ids = array_map('intval', explode(',', $course_ids_param));
            $course_ids = array_filter($course_ids);

            if (empty($course_ids)) {
                return new \WP_REST_Response(array(), 200);
            }

            // Query user's course progress from user meta
            $progress_data = get_user_meta($user_id, '_sfwd-course_progress', true);
            $progress_map = array();

            if (!empty($progress_data) && is_array($progress_data)) {
                foreach ($progress_data as $course_id => $course_progress) {
                    if (is_array($course_progress) && isset($course_progress['status'])) {
                        $progress_map[intval($course_id)] = array(
                            'status'    => $course_progress['status'],
                            'completed' => intval($course_progress['completed'] ?? 0),
                            'total'     => intval($course_progress['total'] ?? 0),
                        );
                    }
                }
            }

            // Batch query for completion dates from activity table
            global $wpdb;
            $completion_map = array();

            if (!empty($course_ids)) {
                $placeholders = implode(',', array_fill(0, count($course_ids), '%d'));
                $query_args = array_merge([$user_id], $course_ids);

                $query = $wpdb->prepare(
                    "SELECT course_id, activity_completed
                     FROM {$wpdb->prefix}learndash_user_activity
                     WHERE user_id = %d AND course_id IN ($placeholders) AND activity_type = 'course' AND activity_status = 1",
                    ...$query_args
                );

                $rows = $wpdb->get_results($query);
                if (!empty($rows)) {
                    foreach ($rows as $row) {
                        $completion_map[intval($row->course_id)] = intval($row->activity_completed);
                    }
                }
            }

            // Build result with enriched data
            $result = array();
            foreach ($course_ids as $course_id) {
                $course_progress = $progress_map[$course_id] ?? array('status' => 'not_started', 'completed' => 0, 'total' => 0);

                // Get enrollment date from user meta
                $enrolled_ts = get_user_meta($user_id, "learndash_course_{$course_id}_enrolled_at", true);
                $enrolled_at = $enrolled_ts ? wp_date('c', intval($enrolled_ts)) : null;

                // Get completion date from activity table
                $completed_ts = $completion_map[$course_id] ?? null;
                $date_completed = $completed_ts ? wp_date('c', intval($completed_ts)) : null;
                $date_completed_gmt = $completed_ts ? gmdate('Y-m-d H:i:s', intval($completed_ts)) : null;

                $result[] = array(
                    'course_id'           => $course_id,
                    'progress_status'     => $course_progress['status'],
                    'steps_completed'     => $course_progress['completed'],
                    'steps_total'         => $course_progress['total'],
                    'enrolled_at'         => $enrolled_at,
                    'date_completed'      => $date_completed,
                    'date_completed_gmt'  => $date_completed_gmt,
                );
            }

            return new \WP_REST_Response($result, 200);
        }

        /**
         * Get all attempts for a specific quiz from group members.
         * Returns flat list sorted by completed desc, with user display names.
         */
        public function get_group_quiz_attempts($request) {
            $group_id = intval($request['group_id']);
            $quiz_id  = intval($request['quiz_id']);

            if (!$group_id || !$quiz_id) {
                return new \WP_REST_Response(array('error' => 'Invalid group_id or quiz_id'), 400);
            }

            $user_ids = learndash_get_groups_user_ids($group_id);
            if (empty($user_ids)) {
                return new \WP_REST_Response(array(), 200);
            }

            global $wpdb;
            $ld_table   = $wpdb->prefix . 'learndash_user_activity';
            $meta_table = $wpdb->prefix . 'learndash_user_activity_meta';

            $user_placeholders = implode(',', array_fill(0, count($user_ids), '%d'));

            $rows = $wpdb->get_results(
                $wpdb->prepare(
                    "SELECT activity_id, user_id, activity_started, activity_completed
                     FROM {$ld_table}
                     WHERE activity_type = 'quiz'
                       AND post_id = %d
                       AND user_id IN ({$user_placeholders})
                     ORDER BY activity_completed DESC",
                    ...array_merge([$quiz_id], $user_ids)
                ),
                ARRAY_A
            );

            if (empty($rows)) {
                return new \WP_REST_Response(array(), 200);
            }

            // Batch-fetch meta for all activity IDs
            $activity_ids    = array_column($rows, 'activity_id');
            $id_placeholders = implode(',', array_fill(0, count($activity_ids), '%d'));
            $meta_keys       = ['pass', 'percentage', 'points', 'total_points', 'statistic_ref_id'];
            $key_placeholders = implode(',', array_fill(0, count($meta_keys), '%s'));

            $meta_rows = $wpdb->get_results(
                $wpdb->prepare(
                    "SELECT activity_id, activity_meta_key, activity_meta_value
                     FROM {$meta_table}
                     WHERE activity_id IN ({$id_placeholders})
                       AND activity_meta_key IN ({$key_placeholders})",
                    ...array_merge($activity_ids, $meta_keys)
                ),
                ARRAY_A
            );

            $meta_map = array();
            foreach ($meta_rows as $meta) {
                $aid = intval($meta['activity_id']);
                $meta_map[$aid][$meta['activity_meta_key']] = $meta['activity_meta_value'];
            }

            // Batch-fetch user data (name + email)
            $unique_user_ids = array_unique(array_column($rows, 'user_id'));
            $user_data = array();
            foreach ($unique_user_ids as $uid) {
                $user = get_userdata(intval($uid));
                $user_data[intval($uid)] = array(
                    'first_name'   => $user ? ($user->first_name ?: '') : '',
                    'last_name'    => $user ? ($user->last_name  ?: '') : '',
                    'email'        => $user ? $user->user_email         : '',
                    'display_name' => $user ? $user->display_name       : 'Unknown User',
                );
            }

            // Batch-check which attempts have ungraded questions.
            // Build a map: statistic_ref_id → activity_id, then query once.
            $ref_to_activity = array();
            foreach ($meta_map as $aid => $m) {
                if (!empty($m['statistic_ref_id'])) {
                    $ref_to_activity[intval($m['statistic_ref_id'])] = $aid;
                }
            }

            $ungraded_activity_ids = array();
            if (!empty($ref_to_activity)) {
                $stat_table     = LDLMS_DB::get_table_name('quiz_statistic');
                $question_table = LDLMS_DB::get_table_name('quiz_question');

                if ($stat_table && $question_table) {
                    $ref_placeholders = implode(',', array_fill(0, count($ref_to_activity), '%d'));
                    $ungraded_refs    = $wpdb->get_col(
                        $wpdb->prepare(
                            "SELECT DISTINCT s.statistic_ref_id
                             FROM {$stat_table} s
                             INNER JOIN {$question_table} q ON q.id = s.question_id
                             WHERE s.statistic_ref_id IN ({$ref_placeholders})
                               AND (
                                   q.answer_type = 'essay'
                                   OR q.answer_type = 'assessment_answer'
                                   OR (q.answer_type = 'free_answer' AND s.correct_count = 0 AND s.incorrect_count = 0)
                               )",
                            ...array_keys($ref_to_activity)
                        )
                    );

                    foreach ($ungraded_refs as $ref_id) {
                        $aid = $ref_to_activity[intval($ref_id)] ?? null;
                        if ($aid) {
                            $ungraded_activity_ids[] = $aid;
                        }
                    }
                }
            }

            $result = array();
            foreach ($rows as $row) {
                $aid         = intval($row['activity_id']);
                $uid         = intval($row['user_id']);
                $meta        = $meta_map[$aid] ?? array();
                $is_ungraded = in_array($aid, $ungraded_activity_ids, true);

                $result[] = array(
                    'activity_id'   => $aid,
                    'user_id'       => $uid,
                    'first_name'    => $user_data[$uid]['first_name']   ?? '',
                    'last_name'     => $user_data[$uid]['last_name']    ?? '',
                    'email'         => $user_data[$uid]['email']        ?? '',
                    'display_name'  => $user_data[$uid]['display_name'] ?? 'Unknown User',
                    'started_gmt'   => $row['activity_started']
                        ? gmdate('Y-m-d\TH:i:s', intval($row['activity_started']))
                        : null,
                    'completed_gmt' => $row['activity_completed']
                        ? gmdate('Y-m-d\TH:i:s', intval($row['activity_completed']))
                        : null,
                    'percentage'    => isset($meta['percentage']) ? floatval($meta['percentage']) : null,
                    'points_scored' => isset($meta['points']) ? floatval($meta['points']) : null,
                    'points_total'  => isset($meta['total_points']) ? floatval($meta['total_points']) : null,
                    // If any question is pending grading, override pass → null so the
                    // modal badge shows "Ungraded" rather than a premature pass/fail.
                    'pass'          => $is_ungraded ? null : (isset($meta['pass']) ? (bool)intval($meta['pass']) : null),
                );
            }

            return new \WP_REST_Response($result, 200);
        }

        /**
         * Get full detail for a single quiz attempt by activity ID.
         */
        public function get_attempt_detail($request) {
            $activity_id = intval($request['activity_id']);

            if (!$activity_id) {
                return new \WP_REST_Response(array('error' => 'Invalid activity_id'), 400);
            }

            global $wpdb;
            $ld_table   = $wpdb->prefix . 'learndash_user_activity';
            $meta_table = $wpdb->prefix . 'learndash_user_activity_meta';

            $row = $wpdb->get_row(
                $wpdb->prepare(
                    "SELECT activity_id, user_id, post_id, activity_started, activity_completed
                     FROM {$ld_table}
                     WHERE activity_id = %d AND activity_type = 'quiz'",
                    $activity_id
                ),
                ARRAY_A
            );

            if (!$row) {
                return new \WP_REST_Response(array('error' => 'Attempt not found'), 404);
            }

            $uid     = intval($row['user_id']);
            $quiz_id = intval($row['post_id']);

            // Fetch meta for this attempt
            $meta_keys        = ['pass', 'percentage', 'points', 'total_points', 'timespent', 'statistic_ref_id'];
            $key_placeholders = implode(',', array_fill(0, count($meta_keys), '%s'));

            $meta_rows = $wpdb->get_results(
                $wpdb->prepare(
                    "SELECT activity_meta_key, activity_meta_value
                     FROM {$meta_table}
                     WHERE activity_id = %d AND activity_meta_key IN ({$key_placeholders})",
                    ...array_merge([$activity_id], $meta_keys)
                ),
                ARRAY_A
            );

            $meta = array();
            foreach ($meta_rows as $m) {
                $meta[$m['activity_meta_key']] = $m['activity_meta_value'];
            }

            // User display name
            $user         = get_userdata($uid);
            $display_name = $user ? $user->display_name : 'Unknown User';

            // Quiz and course titles
            $quiz_title   = get_the_title($quiz_id) ?: 'Unknown Quiz';
            $course_id    = learndash_get_course_id($quiz_id);
            $course_title = $course_id ? get_the_title($course_id) : '';

            // Attempt number: count of this user's attempts for this quiz with activity_id <= current
            $attempt_number = (int) $wpdb->get_var(
                $wpdb->prepare(
                    "SELECT COUNT(*) FROM {$ld_table}
                     WHERE user_id = %d AND post_id = %d AND activity_type = 'quiz' AND activity_id <= %d",
                    $uid, $quiz_id, $activity_id
                )
            );

            // If the attempt contains any ungraded questions, override pass → null
            // so the header shows "Ungraded" rather than a premature pass/fail.
            $statistic_ref_id = isset($meta['statistic_ref_id']) ? intval($meta['statistic_ref_id']) : 0;
            $pass_value       = isset($meta['pass']) ? (bool) intval($meta['pass']) : null;
            if ($statistic_ref_id && $this->attempt_has_ungraded_questions($statistic_ref_id)) {
                $pass_value = null;
            }

            return new \WP_REST_Response(array(
                'activity_id'    => $activity_id,
                'user_id'        => $uid,
                'display_name'   => $display_name,
                'quiz_id'        => $quiz_id,
                'quiz_title'     => $quiz_title,
                'course_id'      => $course_id ?: null,
                'course_title'   => $course_title,
                'started_gmt'    => $row['activity_started']
                    ? gmdate('Y-m-d\TH:i:s', intval($row['activity_started']))
                    : null,
                'completed_gmt'  => $row['activity_completed']
                    ? gmdate('Y-m-d\TH:i:s', intval($row['activity_completed']))
                    : null,
                'timespent'      => isset($meta['timespent']) ? intval($meta['timespent']) : null,
                'percentage'     => isset($meta['percentage']) ? floatval($meta['percentage']) : null,
                'points_scored'  => isset($meta['points']) ? floatval($meta['points']) : null,
                'points_total'   => isset($meta['total_points']) ? floatval($meta['total_points']) : null,
                'pass'           => $pass_value,
                'attempt_number' => $attempt_number,
            ), 200);
        }

        /**
         * Get per-question results for a single quiz attempt.
         */
        public function get_attempt_questions($request) {
            $activity_id = intval($request['activity_id']);

            if (!$activity_id) {
                return new \WP_REST_Response(array('error' => 'Invalid activity_id'), 400);
            }

            global $wpdb;
            $meta_table     = $wpdb->prefix . 'learndash_user_activity_meta';
            $stat_table     = LDLMS_DB::get_table_name('quiz_statistic');
            $question_table = LDLMS_DB::get_table_name('quiz_question');

            if (!$stat_table || !$question_table) {
                return new \WP_REST_Response(array('error' => 'LearnDash statistics tables not available'), 500);
            }

            // Step 1: Resolve statistic_ref_id from activity meta
            $statistic_ref_id = $wpdb->get_var(
                $wpdb->prepare(
                    "SELECT activity_meta_value FROM {$meta_table}
                     WHERE activity_id = %d AND activity_meta_key = 'statistic_ref_id'",
                    $activity_id
                )
            );

            if (!$statistic_ref_id) {
                return new \WP_REST_Response(array(), 200);
            }

            // Step 2: Fetch per-question stats for this attempt
            $stat_rows = $wpdb->get_results(
                $wpdb->prepare(
                    "SELECT question_id, question_post_id, correct_count, incorrect_count, points, answer_data
                     FROM {$stat_table}
                     WHERE statistic_ref_id = %d",
                    intval($statistic_ref_id)
                ),
                ARRAY_A
            );

            if (empty($stat_rows)) {
                return new \WP_REST_Response(array(), 200);
            }

            // Step 3: Fetch question definitions (text, type, max points, sort order)
            $question_ids   = array_map('intval', array_column($stat_rows, 'question_id'));
            $placeholders   = implode(',', array_fill(0, count($question_ids), '%d'));
            $question_rows  = $wpdb->get_results(
                $wpdb->prepare(
                    "SELECT id, title, question, answer_type, points AS max_points, sort, answer_data
                     FROM {$question_table}
                     WHERE id IN ({$placeholders})",
                    ...$question_ids
                ),
                ARRAY_A
            );

            $question_map = array();
            foreach ($question_rows as $q) {
                $question_map[intval($q['id'])] = $q;
            }

            // Step 3b: Resolve WordPress post IDs for questions.
            // The stat table's question_post_id is 0 in many LD versions, and the LDLMS
            // question IDs don't match the legacy question_pro_id stored in WP post meta.
            // Instead, fetch all sfwd-question posts for this quiz and match by title —
            // the question title in the LDLMS table matches the sfwd-question post_title.
            $question_post_id_map = array(); // keyed by trimmed question title

            $quiz_post_id = (int) $wpdb->get_var(
                $wpdb->prepare(
                    "SELECT post_id FROM {$wpdb->prefix}learndash_user_activity
                     WHERE activity_id = %d AND activity_type = 'quiz'",
                    $activity_id
                )
            );

            if ($quiz_post_id) {
                $sfwd_q_rows = $wpdb->get_results(
                    $wpdb->prepare(
                        "SELECT p.ID, p.post_title
                         FROM {$wpdb->posts} p
                         INNER JOIN {$wpdb->postmeta} pm
                             ON  pm.post_id  = p.ID
                             AND pm.meta_key = 'quiz_id'
                             AND pm.meta_value = %d
                         WHERE p.post_type = 'sfwd-question'",
                        $quiz_post_id
                    ),
                    ARRAY_A
                );
                foreach ($sfwd_q_rows as $row) {
                    $question_post_id_map[trim($row['post_title'])] = intval($row['ID']);
                }
            }

            // Step 4: Combine and determine result per question
            $result = array();
            foreach ($stat_rows as $stat) {
                $qid  = intval($stat['question_id']);
                $qdef = $question_map[$qid] ?? null;

                $answer_type  = $qdef['answer_type'] ?? '';
                $points_max   = $qdef ? floatval($qdef['max_points']) : 0;
                $points_earned = floatval($stat['points']);
                $correct_count   = intval($stat['correct_count']);
                $incorrect_count = intval($stat['incorrect_count']);

                if ($answer_type === 'essay') {
                    // LearnDash sets incorrect_count=1 on essays by default;
                    // use the sfwd-essays post status as the true graded/ungraded signal.
                    $essay_data = json_decode($stat['answer_data'] ?? '', true);
                    $graded_id  = isset($essay_data['graded_id']) ? intval($essay_data['graded_id']) : 0;
                    if (!$graded_id || get_post_status($graded_id) !== 'graded') {
                        $question_result = 'ungraded';
                    } elseif ($points_max > 0 && $points_earned >= $points_max) {
                        $question_result = 'correct';
                    } elseif ($points_earned > 0 && $points_earned < $points_max) {
                        $question_result = 'partial';
                    } else {
                        $question_result = 'incorrect';
                    }
                } elseif (in_array($answer_type, array('assessment_answer', 'free_answer'), true)
                          && $correct_count === 0 && $incorrect_count === 0) {
                    $question_result = 'ungraded';
                } elseif ($points_max > 0 && $points_earned >= $points_max) {
                    $question_result = 'correct';
                } elseif ($points_earned > 0 && $points_earned < $points_max) {
                    $question_result = 'partial';
                } else {
                    $question_result = 'incorrect';
                }

                $stat_answer_data = json_decode($stat['answer_data'] ?? '', true);
                $manually_graded  = !empty($stat_answer_data['manually_graded']);

                $result[] = array(
                    'question_id'      => $qid,
                    'question_post_id' => intval($stat['question_post_id']),
                    'title'            => $qdef ? sanitize_text_field($qdef['title']) : '',
                    'question_text'    => $qdef ? wp_kses_post(apply_filters('the_content', $qdef['question'])) : '',
                    'answer_type'      => $answer_type,
                    'points_earned'    => $points_earned,
                    'points_max'       => $points_max,
                    'result'           => $question_result,
                    'manually_graded'  => $manually_graded,
                    'sort'             => $qdef ? intval($qdef['sort']) : 0,
                    'user_answers'     => $this->parse_question_answers(
                        $stat['answer_data'] ?? '',
                        $qdef['answer_data'] ?? '',
                        $answer_type
                    ),
                    'correct_answer'   => $this->parse_correct_answer(
                        $qdef['answer_data'] ?? '',
                        $answer_type,
                        intval($stat['question_post_id']) ?: ($question_post_id_map[trim($qdef['title'] ?? '')] ?? 0),
                        $qid
                    ),
                );
            }

            // Sort by quiz question order
            usort($result, fn($a, $b) => $a['sort'] - $b['sort']);

            return new \WP_REST_Response($result, 200);
        }

        /**
         * Grade questions for a quiz attempt.
         * Body: { "grades": [ { "question_id": 123, "result": "correct|incorrect|partial|ungraded", "points": 2.5 } ] }
         */
        public function grade_attempt_questions($request) {
            $activity_id = intval($request['activity_id']);

            if (!$activity_id) {
                return new \WP_REST_Response(array('error' => 'Invalid activity_id'), 400);
            }

            $body   = $request->get_json_params();
            $grades = isset($body['grades']) && is_array($body['grades']) ? $body['grades'] : array();

            if (empty($grades)) {
                return new \WP_REST_Response(array('error' => 'No grades provided'), 400);
            }

            global $wpdb;
            $meta_table     = $wpdb->prefix . 'learndash_user_activity_meta';
            $ld_table       = $wpdb->prefix . 'learndash_user_activity';
            $stat_table     = LDLMS_DB::get_table_name('quiz_statistic');
            $question_table = LDLMS_DB::get_table_name('quiz_question');

            if (!$stat_table || !$question_table) {
                return new \WP_REST_Response(array('error' => 'LearnDash statistics tables not available'), 500);
            }

            // Resolve statistic_ref_id and quiz_id for this attempt
            $statistic_ref_id = intval($wpdb->get_var(
                $wpdb->prepare(
                    "SELECT activity_meta_value FROM {$meta_table}
                     WHERE activity_id = %d AND activity_meta_key = 'statistic_ref_id'",
                    $activity_id
                )
            ));

            if (!$statistic_ref_id) {
                return new \WP_REST_Response(array('error' => 'Attempt statistics not found'), 404);
            }

            $quiz_id = intval($wpdb->get_var(
                $wpdb->prepare(
                    "SELECT post_id FROM {$ld_table} WHERE activity_id = %d AND activity_type = 'quiz'",
                    $activity_id
                )
            ));

            // Quiz pass mark (percentage threshold)
            $pass_mark = 80.0;
            if ($quiz_id) {
                $quiz_settings = get_post_meta($quiz_id, '_sfwd-quiz', true);
                if (isset($quiz_settings['sfwd-quiz_passMark'])) {
                    $pass_mark = floatval($quiz_settings['sfwd-quiz_passMark']);
                }
            }

            // Apply each grade to the statistic row
            $valid_results = array('correct', 'incorrect', 'partial', 'ungraded');

            foreach ($grades as $grade) {
                $question_id = intval($grade['question_id'] ?? 0);
                $result      = sanitize_text_field($grade['result'] ?? '');

                if (!$question_id || !in_array($result, $valid_results, true)) {
                    continue;
                }

                // Fetch question definition + current stat answer_data in one query
                $stat_row = $wpdb->get_row(
                    $wpdb->prepare(
                        "SELECT q.points AS points_max, q.answer_type, s.answer_data
                         FROM {$stat_table} s
                         LEFT JOIN {$question_table} q ON q.id = s.question_id
                         WHERE s.statistic_ref_id = %d AND s.question_id = %d",
                        $statistic_ref_id, $question_id
                    ),
                    ARRAY_A
                );

                if (!$stat_row) {
                    continue;
                }

                $points_max  = floatval($stat_row['points_max']);
                $answer_type = $stat_row['answer_type'] ?? '';

                switch ($result) {
                    case 'correct':
                        $correct_count   = 1;
                        $incorrect_count = 0;
                        $points_earned   = $points_max;
                        break;
                    case 'incorrect':
                        $correct_count   = 0;
                        $incorrect_count = 1;
                        $points_earned   = 0;
                        break;
                    case 'partial':
                        $raw_points      = isset($grade['points']) ? floatval($grade['points']) : 0.0;
                        $points_earned   = max(0.0, min($raw_points, $points_max));
                        $correct_count   = 1;
                        $incorrect_count = 0;
                        break;
                    case 'ungraded':
                    default:
                        $correct_count   = 0;
                        $incorrect_count = 0;
                        $points_earned   = 0;
                        break;
                }

                $wpdb->update(
                    $stat_table,
                    array(
                        'correct_count'   => $correct_count,
                        'incorrect_count' => $incorrect_count,
                        'points'          => $points_earned,
                    ),
                    array(
                        'statistic_ref_id' => $statistic_ref_id,
                        'question_id'      => $question_id,
                    ),
                    array('%d', '%d', '%f'),
                    array('%d', '%d')
                );

                // Persist manually_graded flag in answer_data
                $answer_data_arr                    = json_decode($stat_row['answer_data'] ?? '', true) ?: array();
                $answer_data_arr['manually_graded'] = true;
                $wpdb->update(
                    $stat_table,
                    array('answer_data' => wp_json_encode($answer_data_arr)),
                    array('statistic_ref_id' => $statistic_ref_id, 'question_id' => $question_id),
                    array('%s'),
                    array('%d', '%d')
                );

                // For essay questions, sync the sfwd-essays post status and LearnDash's
                // _sfwd-quizzes user meta — the source the LD admin reads for points/status.
                if ($answer_type === 'essay') {
                    $stat_answer   = json_decode($stat_row['answer_data'] ?? '', true);
                    $graded_id     = isset($stat_answer['graded_id']) ? intval($stat_answer['graded_id']) : 0;
                    $essay_post    = $graded_id ? get_post($graded_id) : null;

                    if ($essay_post) {
                        $new_status = ($result === 'ungraded') ? 'not_graded' : 'graded';

                        // Update sfwd-essays post status
                        wp_update_post(array('ID' => $graded_id, 'post_status' => $new_status));

                        // Update _sfwd-quizzes user meta (what the LD admin reads for points)
                        $quiz_pro_id     = intval(get_post_meta($graded_id, 'quiz_id', true));
                        $question_pro_id = intval(get_post_meta($graded_id, 'question_id', true));

                        if ($quiz_pro_id && $question_pro_id) {
                            $essay_ld_data = learndash_get_submitted_essay_data($quiz_pro_id, $question_pro_id, $essay_post);
                            if (is_array($essay_ld_data)) {
                                $essay_ld_data['status']         = $new_status;
                                $essay_ld_data['points_awarded'] = ($result === 'ungraded') ? 0 : $points_earned;
                                learndash_update_submitted_essay_data($quiz_pro_id, $question_pro_id, $essay_post, $essay_ld_data);
                            }
                        }
                    }
                }
            }

            // Recalculate totals from all stat rows
            $stat_rows = $wpdb->get_results(
                $wpdb->prepare(
                    "SELECT s.points AS points_earned, q.points AS points_max,
                            q.answer_type, s.correct_count, s.incorrect_count, s.answer_data
                     FROM {$stat_table} s
                     LEFT JOIN {$question_table} q ON q.id = s.question_id
                     WHERE s.statistic_ref_id = %d",
                    $statistic_ref_id
                ),
                ARRAY_A
            );

            $total_earned = 0.0;
            $total_max    = 0.0;
            $has_ungraded = false;

            foreach ($stat_rows as $row) {
                $answer_type = $row['answer_type'] ?? '';
                $total_max   += floatval($row['points_max']);
                $total_earned += floatval($row['points_earned']);

                if ($answer_type === 'essay') {
                    $e_data    = json_decode($row['answer_data'] ?? '', true);
                    $graded_id = isset($e_data['graded_id']) ? intval($e_data['graded_id']) : 0;
                    if (!$graded_id || get_post_status($graded_id) !== 'graded') {
                        $has_ungraded = true;
                    }
                } elseif (
                    in_array($answer_type, array('assessment_answer', 'free_answer'), true)
                    && intval($row['correct_count']) === 0
                    && intval($row['incorrect_count']) === 0
                ) {
                    $has_ungraded = true;
                }
            }

            $percentage = $total_max > 0 ? ($total_earned / $total_max) * 100.0 : 0.0;
            $pass       = $has_ungraded ? null : ($percentage >= $pass_mark ? 1 : 0);

            // Update activity meta: points, percentage, and conditionally pass
            $meta_updates = array('points' => $total_earned, 'percentage' => $percentage);
            if (!$has_ungraded) {
                $meta_updates['pass'] = $pass;
            }

            foreach ($meta_updates as $key => $value) {
                $exists = (int) $wpdb->get_var(
                    $wpdb->prepare(
                        "SELECT COUNT(*) FROM {$meta_table}
                         WHERE activity_id = %d AND activity_meta_key = %s",
                        $activity_id, $key
                    )
                );

                if ($exists) {
                    $wpdb->update(
                        $meta_table,
                        array('activity_meta_value' => $value),
                        array('activity_id' => $activity_id, 'activity_meta_key' => $key),
                        array('%s'),
                        array('%d', '%s')
                    );
                } else {
                    $wpdb->insert(
                        $meta_table,
                        array(
                            'activity_id'         => $activity_id,
                            'activity_meta_key'   => $key,
                            'activity_meta_value' => $value,
                        ),
                        array('%d', '%s', '%s')
                    );
                }
            }

            return new \WP_REST_Response(array(
                'success'       => true,
                'points_scored' => $total_earned,
                'points_total'  => $total_max,
                'percentage'    => $percentage,
                'pass'          => $pass,
            ), 200);
        }

        /**
         * Parse a user's answer from the statistic table and the question's answer options
         * into a structured format suitable for the frontend.
         *
         * Supported answer types:
         *   - single / multiple  → list of choices with is_correct + was_selected flags
         *   - free_answer / essay → plain user text
         *
         * Returns null for complex types (sort, matrix, cloze, assessment) where a
         * structured breakdown isn't yet implemented.
         */
        private function parse_question_answers($stat_answer_raw, $q_answer_raw, $answer_type) {

            // ── Choice-based questions ─────────────────────────────────────────
            if (in_array($answer_type, array('single', 'multiple'), true)) {

                // Question answer options — array of WpProQuiz_Model_AnswerTypes objects
                $q_options = @unserialize($q_answer_raw); // phpcs:ignore
                if (!is_array($q_options)) {
                    return null;
                }

                // User's selections — serialized array, index → 1 (selected) or 0 (not selected)
                $s_data = @unserialize($stat_answer_raw, array('allowed_classes' => false)); // phpcs:ignore
                if (!is_array($s_data)) {
                    $s_data = array();
                }

                $choices = array();
                foreach ($q_options as $i => $opt) {
                    $text       = '';
                    $is_correct = false;
                    $is_html    = false;

                    if (is_object($opt) && !($opt instanceof \__PHP_Incomplete_Class)) {
                        if (method_exists($opt, 'getAnswer'))  $text       = $opt->getAnswer();
                        if (method_exists($opt, 'isCorrect'))  $is_correct = (bool) $opt->isCorrect();
                        if (method_exists($opt, 'isHtml'))     $is_html    = (bool) $opt->isHtml();
                    }

                    $was_selected = isset($s_data[$i]) && (int) $s_data[$i] === 1;

                    $choices[] = array(
                        'text'         => $is_html ? wp_kses_post($text) : sanitize_text_field($text),
                        'is_html'      => $is_html,
                        'is_correct'   => $is_correct,
                        'was_selected' => $was_selected,
                    );
                }

                return array('type' => 'choices', 'items' => $choices);
            }

            // ── Essay questions (manual grading) ───────────────────────────────
            // LearnDash stores {"graded_id": XXXX} in answer_data, where XXXX is
            // the post ID of the sfwd-essays CPT holding the student's actual text.
            if ($answer_type === 'essay') {
                $data      = json_decode($stat_answer_raw, true);
                $graded_id = isset($data['graded_id']) ? intval($data['graded_id']) : 0;
                if ($graded_id) {
                    $essay_post = get_post($graded_id);
                    if ($essay_post && !empty($essay_post->post_content)) {
                        return array('type' => 'text', 'user_text' => wp_kses_post($essay_post->post_content));
                    }
                }
                return null; // Submitted but no content available yet
            }

            // ── Free-text / cloze (fill-in-the-blank) (auto-graded) ───────────
            if (in_array($answer_type, array('free_answer', 'cloze_answer'), true)) {
                $s_data = @unserialize($stat_answer_raw, array('allowed_classes' => false)); // phpcs:ignore

                if (is_array($s_data)) {
                    // PHP-serialised array — flatten to comma-separated string
                    $text = implode(', ', array_filter(array_map('strval', $s_data), 'strlen'));
                } elseif (is_string($s_data) && $s_data !== '') {
                    $text = $s_data;
                } else {
                    // Fallback: try JSON (LearnDash sometimes stores ["answer"] JSON)
                    $j_data = json_decode($stat_answer_raw, true);
                    if (is_array($j_data)) {
                        $text = implode(', ', array_filter(array_map('strval', $j_data), 'strlen'));
                    } else {
                        $text = is_string($stat_answer_raw) ? $stat_answer_raw : '';
                    }
                }

                if ($text === '') {
                    return null;
                }
                return array('type' => 'text', 'user_text' => wp_kses_post($text));
            }

            return null;
        }

        /**
         * Extract the expected correct answer(s) for a question.
         *
         * - single / multiple : deserialise answer_data, return options where isCorrect() is true.
         * - cloze_answer      : deserialise answer_data, format {word}/[a|b] template for display.
         * - free_answer       : all listed options are valid correct answers — return all of them.
         * - essay             : no programmatic answer; look up the 'essay_answer_key' post meta.
         *
         * $question_id is the WpProQuiz ID used as a fallback to resolve the WordPress post ID
         * when $question_post_id is 0 in the stat table.
         */
        private function parse_correct_answer($q_answer_raw, $answer_type, $question_post_id = 0, $question_id = 0) {

            // ── Choice-based (single / multiple) ──────────────────────────────
            if (in_array($answer_type, array('single', 'multiple'), true)) {
                $q_options = @unserialize($q_answer_raw); // phpcs:ignore
                if (!is_array($q_options)) {
                    return null;
                }

                $correct = array();
                foreach ($q_options as $opt) {
                    if (!is_object($opt) || ($opt instanceof \__PHP_Incomplete_Class)) {
                        continue;
                    }
                    if (!method_exists($opt, 'isCorrect') || !$opt->isCorrect()) {
                        continue;
                    }
                    $text    = method_exists($opt, 'getAnswer') ? $opt->getAnswer() : '';
                    $is_html = method_exists($opt, 'isHtml')    && $opt->isHtml();
                    if ($text !== '') {
                        $correct[] = array(
                            'text'    => $is_html ? wp_kses_post($text) : sanitize_text_field($text),
                            'is_html' => $is_html,
                        );
                    }
                }

                return $correct ?: null;
            }

            // ── Cloze / fill-in-the-blank ─────────────────────────────────────
            // The question's answer_data holds the full answer template, e.g.
            // "{41.34} tonnes" or "I {play} [football|soccer]".
            // We unserialise, grab the template string, and format it for display.
            if ($answer_type === 'cloze_answer') {
                $q_options = @unserialize($q_answer_raw); // phpcs:ignore
                if (!is_array($q_options)) {
                    return null;
                }

                $correct = array();
                foreach ($q_options as $opt) {
                    if (!is_object($opt) || ($opt instanceof \__PHP_Incomplete_Class)) {
                        continue;
                    }
                    $template = method_exists($opt, 'getAnswer') ? $opt->getAnswer() : '';
                    if ($template === '') {
                        continue;
                    }

                    // Convert {word} and {[a|b]} → the word/alternatives (required blank)
                    $formatted = preg_replace_callback(
                        '/\{(\[([^\]]+)\]|([^}]+))\}/',
                        function ($m) {
                            $inner = $m[2] !== '' ? $m[2] : $m[3];
                            return str_replace('|', ' / ', $inner);
                        },
                        $template
                    );
                    // Convert remaining [a|b] outside braces → alternatives
                    $formatted = preg_replace_callback(
                        '/\[([^\]]+)\]/',
                        function ($m) {
                            return str_replace('|', ' / ', $m[1]);
                        },
                        $formatted
                    );

                    $correct[] = array(
                        'text'    => sanitize_text_field($formatted),
                        'is_html' => false,
                    );
                }

                return $correct ?: null;
            }

            // ── Free-answer ───────────────────────────────────────────────────
            // Every option the admin enters is a valid correct answer, so we
            // return all of them rather than filtering by isCorrect().
            if ($answer_type === 'free_answer') {
                $q_options = @unserialize($q_answer_raw); // phpcs:ignore
                if (!is_array($q_options)) {
                    return null;
                }

                $correct = array();
                foreach ($q_options as $opt) {
                    if (!is_object($opt) || ($opt instanceof \__PHP_Incomplete_Class)) {
                        continue;
                    }
                    $text = method_exists($opt, 'getAnswer') ? $opt->getAnswer() : '';
                    if ($text !== '') {
                        $correct[] = array(
                            'text'    => nl2br(esc_html($text)),
                            'is_html' => true,
                        );
                    }
                }

                return $correct ?: null;
            }

            // ── Essay ─────────────────────────────────────────────────────────
            // No programmatic correct answer — look for an instructor-set answer key.
            // $question_post_id is resolved upstream from the LDLMS question table's
            // post_id column, which is the reliable link to the sfwd-question post.
            if ($answer_type === 'essay' && $question_post_id) {
                $answer_key = get_post_meta($question_post_id, 'essay_answer_key', true);
                if ($answer_key) {
                    return array(array('text' => wp_kses_post(nl2br($answer_key)), 'is_html' => true));
                }
            }

            return null;
        }

        /**
         * Returns true if the attempt identified by $statistic_ref_id contains
         * any questions that require manual grading (essay, assessment, or an
         * auto-graded free_answer with no recorded result yet).
         */
        private function attempt_has_ungraded_questions($statistic_ref_id) {
            if (!$statistic_ref_id) {
                return false;
            }

            global $wpdb;
            $stat_table     = LDLMS_DB::get_table_name('quiz_statistic');
            $question_table = LDLMS_DB::get_table_name('quiz_question');

            if (!$stat_table || !$question_table) {
                return false;
            }

            // Check assessment_answer / free_answer via counts (LD leaves these at 0,0 when ungraded)
            $count = (int) $wpdb->get_var(
                $wpdb->prepare(
                    "SELECT COUNT(*)
                     FROM {$stat_table} s
                     INNER JOIN {$question_table} q ON q.id = s.question_id
                     WHERE s.statistic_ref_id = %d
                       AND q.answer_type IN ('assessment_answer', 'free_answer')
                       AND s.correct_count = 0 AND s.incorrect_count = 0",
                    $statistic_ref_id
                )
            );

            if ($count > 0) {
                return true;
            }

            // Check essay questions via sfwd-essays post_status ('not_graded' means ungraded).
            // LearnDash sets incorrect_count=1 on essays by default so counts are unreliable.
            $essay_answer_data = $wpdb->get_col(
                $wpdb->prepare(
                    "SELECT s.answer_data
                     FROM {$stat_table} s
                     INNER JOIN {$question_table} q ON q.id = s.question_id
                     WHERE s.statistic_ref_id = %d AND q.answer_type = 'essay'",
                    $statistic_ref_id
                )
            );

            foreach ($essay_answer_data as $raw) {
                $data      = json_decode($raw, true);
                $graded_id = isset($data['graded_id']) ? intval($data['graded_id']) : 0;
                if (!$graded_id || get_post_status($graded_id) !== 'graded') {
                    return true;
                }
            }

            return false;
        }

        /**
         * Get per-quiz submission stats for all group members.
         * Accepts ?quiz_ids=1,2,3 (comma-separated).
         * Returns: [ { quiz_id, total_submissions, last_submission_gmt }, ... ]
         */
        public function get_group_quiz_submission_stats($request) {
            $group_id = intval($request['group_id']);
            if (!$group_id) {
                return new \WP_REST_Response(array('error' => 'Invalid group ID'), 400);
            }

            $quiz_ids_param = $request->get_param('quiz_ids');
            if (empty($quiz_ids_param)) {
                return new \WP_REST_Response(array('error' => 'quiz_ids parameter required'), 400);
            }

            $quiz_ids = array_filter(array_map('intval', explode(',', $quiz_ids_param)));
            if (empty($quiz_ids)) {
                return new \WP_REST_Response(array('error' => 'No valid quiz IDs provided'), 400);
            }

            // Get all user IDs in this group directly via LD function (no API call needed)
            $user_ids = learndash_get_groups_user_ids($group_id);
            if (empty($user_ids)) {
                // Return zeroed-out stats rather than an error
                $result = array();
                foreach ($quiz_ids as $qid) {
                    $result[] = array(
                        'quiz_id'             => $qid,
                        'total_submissions'   => 0,
                        'ungraded_count'      => 0,
                        'last_submission_gmt' => null,
                    );
                }
                return new \WP_REST_Response($result, 200);
            }

            global $wpdb;
            $ld_table   = $wpdb->prefix . 'learndash_user_activity';
            $meta_table = $wpdb->prefix . 'learndash_user_activity_meta';
            $stat_table     = LDLMS_DB::get_table_name('quiz_statistic');
            $question_table = LDLMS_DB::get_table_name('quiz_question');

            $user_placeholders = implode(',', array_fill(0, count($user_ids), '%d'));
            $quiz_placeholders = implode(',', array_fill(0, count($quiz_ids), '%d'));

            // ── Submissions + unique members who have submitted per quiz ─────────
            // attempted_users = distinct members who submitted at least once (activity_completed > 0).
            $rows = $wpdb->get_results(
                $wpdb->prepare(
                    "SELECT post_id AS quiz_id,
                            COUNT(*) AS total_submissions,
                            COUNT(DISTINCT CASE WHEN activity_completed > 0 THEN user_id END) AS attempted_users,
                            MAX(activity_completed) AS last_submission_ts
                     FROM {$ld_table}
                     WHERE activity_type = 'quiz'
                       AND user_id IN ({$user_placeholders})
                       AND post_id IN ({$quiz_placeholders})
                     GROUP BY post_id",
                    ...array_merge($user_ids, $quiz_ids)
                ),
                ARRAY_A
            );

            // Index results by quiz_id
            $stats_map = array();
            foreach ($rows as $row) {
                $stats_map[intval($row['quiz_id'])] = array(
                    'total_submissions'   => intval($row['total_submissions']),
                    'attempted_users'     => intval($row['attempted_users']),
                    'ungraded_count'      => 0,
                    'last_submission_gmt' => $row['last_submission_ts']
                        ? gmdate('Y-m-d\TH:i:s', intval($row['last_submission_ts']))
                        : null,
                );
            }

            // ── Ungraded submissions per quiz ─────────────────────────────────
            // Count distinct attempts that contain at least one question requiring
            // manual grading (essay, assessment, or unscored free_answer).
            if ($stat_table && $question_table) {
                $ungraded_rows = $wpdb->get_results(
                    $wpdb->prepare(
                        "SELECT a.post_id AS quiz_id,
                                COUNT(DISTINCT a.activity_id) AS ungraded_count
                         FROM {$ld_table} a
                         INNER JOIN {$meta_table} m
                             ON m.activity_id = a.activity_id
                             AND m.activity_meta_key = 'statistic_ref_id'
                         INNER JOIN {$stat_table} s
                             ON s.statistic_ref_id = CAST(m.activity_meta_value AS UNSIGNED)
                         INNER JOIN {$question_table} q
                             ON q.id = s.question_id
                         WHERE a.activity_type = 'quiz'
                           AND a.user_id IN ({$user_placeholders})
                           AND a.post_id IN ({$quiz_placeholders})
                           AND (
                               q.answer_type = 'essay'
                               OR q.answer_type = 'assessment_answer'
                               OR (q.answer_type = 'free_answer' AND s.correct_count = 0 AND s.incorrect_count = 0)
                           )
                         GROUP BY a.post_id",
                        ...array_merge($user_ids, $quiz_ids)
                    ),
                    ARRAY_A
                );

                foreach ($ungraded_rows as $row) {
                    $qid = intval($row['quiz_id']);
                    if (isset($stats_map[$qid])) {
                        $stats_map[$qid]['ungraded_count'] = intval($row['ungraded_count']);
                    }
                }
            }

            // Return a result for every requested quiz_id (zero-fill missing)
            $result = array();
            foreach ($quiz_ids as $qid) {
                $result[] = array(
                    'quiz_id'             => $qid,
                    'total_submissions'   => $stats_map[$qid]['total_submissions'] ?? 0,
                    'attempted_users'     => $stats_map[$qid]['attempted_users'] ?? 0,
                    'ungraded_count'      => $stats_map[$qid]['ungraded_count'] ?? 0,
                    'last_submission_gmt' => $stats_map[$qid]['last_submission_gmt'] ?? null,
                );
            }

            return new \WP_REST_Response($result, 200);
        }

        /**
         * Get quiz steps for a course
         * Returns quizzes in a course with caching
         */
        public function get_course_quiz_steps($request) {
            $course_id = intval($request['course_id']);

            if (!$course_id) {
                return new \WP_REST_Response(array('error' => 'Invalid course ID'), 400);
            }

            // 'grading' filter uses show_test_grading_config; default uses show_in_reporting
            $filter   = sanitize_key($request->get_param('filter') ?? '');
            $meta_key = ($filter === 'grading') ? 'show_test_grading_config' : 'show_in_reporting';

            // Check transient cache (keyed by filter so the two sets don't collide)
            $cache_key = "bys_quiz_steps_v4_{$filter}_{$course_id}";
            $cached = get_transient($cache_key);
            if ($cached !== false) {
                return new \WP_REST_Response($cached, 200);
            }

            global $wpdb;
            $steps = $wpdb->get_results($wpdb->prepare(
                "SELECT p.ID as step_id, p.post_title as step_title
                 FROM {$wpdb->posts} p
                 JOIN {$wpdb->postmeta} pm   ON p.ID = pm.post_id
                 JOIN {$wpdb->postmeta} pm_r ON p.ID = pm_r.post_id
                 WHERE pm.meta_key = 'course_id' AND pm.meta_value = %d
                 AND p.post_type = 'sfwd-quiz' AND p.post_status = 'publish'
                 AND pm_r.meta_key = %s AND pm_r.meta_value = '1'
                 ORDER BY p.menu_order ASC",
                $course_id,
                $meta_key
            ));

            if (!$steps) {
                $steps = array();
            }

            $result = array();
            foreach ($steps as $step) {
                $result[] = array(
                    'step_id'    => intval($step->step_id),
                    'step_title' => $step->step_title,
                );
            }

            set_transient($cache_key, $result, HOUR_IN_SECONDS);

            return new \WP_REST_Response($result, 200);
        }

        /**
         * GET /courses/{course_id}/quizzes
         *
         * Returns every published sfwd-quiz attached to a course, regardless of
         * the show_in_reporting / show_test_grading_config meta. Distinct from
         * get_course_quiz_steps() which scopes by those flags for reporting.
         */
        public function get_course_quizzes($request) {
            $course_id = intval($request['course_id']);

            if (!$course_id) {
                return new \WP_REST_Response(array('error' => 'Invalid course ID'), 400);
            }

            $cache_key = "bys_course_quizzes_all_v1_{$course_id}";
            $cached = get_transient($cache_key);
            if ($cached !== false) {
                return new \WP_REST_Response($cached, 200);
            }

            global $wpdb;
            $rows = $wpdb->get_results($wpdb->prepare(
                "SELECT p.ID as id, p.post_title as title
                 FROM {$wpdb->posts} p
                 JOIN {$wpdb->postmeta} pm ON p.ID = pm.post_id
                 WHERE pm.meta_key = 'course_id' AND pm.meta_value = %d
                   AND p.post_type = 'sfwd-quiz' AND p.post_status = 'publish'
                 ORDER BY p.menu_order ASC, p.post_title ASC",
                $course_id
            ));

            $result = array();
            foreach ((array) $rows as $row) {
                $result[] = array(
                    'id'    => intval($row->id),
                    'title' => $row->title,
                );
            }

            set_transient($cache_key, $result, HOUR_IN_SECONDS);

            return new \WP_REST_Response($result, 200);
        }

        /**
         * Get quiz attempts for a user in a course
         * Returns the best attempt (highest percentage) for each quiz with configured pass threshold
         */
        /**
         * Batch quiz progress for multiple users in a single course.
         * Returns { user_id: { quiz_id: { total_attempts, percent_highest, pass_highest } } }
         * Uses direct DB queries — two queries total regardless of user/quiz count.
         * Params: ?user_ids=1,2,3
         */
        public function get_course_quiz_progress_batch($request) {
            $course_id     = intval($request['course_id']);
            $user_ids_param = $request->get_param('user_ids');

            if (!$course_id || !$user_ids_param) {
                return new \WP_REST_Response(array('error' => 'course_id and user_ids are required'), 400);
            }

            $user_ids = array_values(array_unique(array_filter(array_map('intval', explode(',', $user_ids_param)))));
            if (empty($user_ids)) {
                return new \WP_REST_Response(array(), 200);
            }

            global $wpdb;
            $activity_table = $wpdb->prefix . 'learndash_user_activity';
            $meta_table     = $wpdb->prefix . 'learndash_user_activity_meta';

            // Sanitise IDs for inline IN() — all guaranteed integers
            $user_ids_str = implode(',', $user_ids);

            // ── Query 1: all completed quiz activities for these users in this course ──
            $activities = $wpdb->get_results($wpdb->prepare(
                "SELECT a.activity_id, a.user_id, a.post_id AS quiz_id, a.activity_status
                 FROM {$activity_table} a
                 WHERE a.course_id   = %d
                   AND a.user_id    IN ({$user_ids_str})
                   AND a.activity_type      = 'quiz'
                   AND a.activity_completed > 0",
                $course_id
            ));

            if (empty($activities)) {
                return new \WP_REST_Response(array(), 200);
            }

            // ── Query 2: percentage metadata for all returned activity rows ──
            $activity_ids     = array_unique(array_map(function($a) { return intval($a->activity_id); }, $activities));
            $activity_ids_str = implode(',', $activity_ids);

            $metas = $wpdb->get_results(
                "SELECT activity_id, activity_meta_value
                 FROM {$meta_table}
                 WHERE activity_id     IN ({$activity_ids_str})
                   AND activity_meta_key = 'percentage'"
            );

            $pct_map = array(); // activity_id => float
            foreach ($metas as $meta) {
                $pct_map[intval($meta->activity_id)] = floatval($meta->activity_meta_value);
            }

            // ── Group activities: [user_id][quiz_id] = [ {pass, pct}, … ] ──
            $grouped = array();
            foreach ($activities as $act) {
                $uid = intval($act->user_id);
                $qid = intval($act->quiz_id);
                $aid = intval($act->activity_id);
                $grouped[$uid][$qid][] = array(
                    'pass' => intval($act->activity_status) === 1,
                    'pct'  => $pct_map[$aid] ?? 0.0,
                );
            }

            // ── Build summary per user/quiz ──
            $result = array();
            foreach ($grouped as $uid => $quizzes) {
                foreach ($quizzes as $qid => $attempts) {
                    $best = $attempts[0];
                    foreach ($attempts as $attempt) {
                        if ($attempt['pct'] > $best['pct']) $best = $attempt;
                    }
                    $result[$uid][$qid] = array(
                        'total_attempts'  => count($attempts),
                        'percent_highest' => round($best['pct'], 2),
                        'pass_highest'    => $best['pass'],
                    );
                }
            }

            return new \WP_REST_Response($result, 200);
        }

        /**
         * Get quiz progress summary for all quizzes a user has ever attempted.
         * Drives from wp_learndash_user_activity so no custom-field filtering
         * is applied and quizzes from courses the user is no longer enrolled in
         * are still returned.
         */
        public function get_user_quiz_progress_summary($request) {
            $user_id = intval($request['user_id']);

            if (!$user_id) {
                return new \WP_REST_Response(array('error' => 'user_id parameter required'), 400);
            }

            $auth_result = $this->get_validated_auth_header();
            if (is_a($auth_result, 'WP_REST_Response')) {
                return $auth_result;
            }
            $auth_header = $auth_result;

            // Get every quiz the user has attempted, with the associated course,
            // straight from the activity table — no enrollment or meta filtering.
            global $wpdb;
            $rows = $wpdb->get_results($wpdb->prepare(
                "SELECT DISTINCT post_id AS quiz_id, course_id
                 FROM {$wpdb->prefix}learndash_user_activity
                 WHERE user_id = %d AND activity_type = 'quiz'",
                $user_id
            ), ARRAY_A);

            if (empty($rows)) {
                return new \WP_REST_Response(array(), 200);
            }

            // Build quiz_id -> course_id map (keep first-seen course per quiz)
            $quiz_course_map = array();
            foreach ($rows as $row) {
                $quiz_id   = intval($row['quiz_id']);
                $course_id = intval($row['course_id']);
                if ($quiz_id > 0 && !isset($quiz_course_map[$quiz_id])) {
                    $quiz_course_map[$quiz_id] = $course_id;
                }
            }

            // Fetch attempt details for each quiz from LD API
            $result = array();
            foreach ($quiz_course_map as $quiz_id => $course_id) {
                $ld_api_url = get_home_url() . "/wp-json/ldlms/v2/users/{$user_id}/quiz-progress?quiz={$quiz_id}";

                $response = wp_remote_get($ld_api_url, array(
                    'headers'   => array('Authorization' => $auth_header),
                    'timeout'   => 60,
                    'sslverify' => false,
                ));

                if (is_wp_error($response)) {
                    error_log('[BYS Groups] Quiz progress fetch failed for quiz ' . $quiz_id . ': ' . $response->get_error_message());
                    continue;
                }

                $status = wp_remote_retrieve_response_code($response);
                if ($status !== 200) {
                    error_log('[BYS Groups] Quiz progress API returned status ' . $status . ' for quiz ' . $quiz_id);
                    continue;
                }

                $attempts = json_decode(wp_remote_retrieve_body($response), true);
                if (!is_array($attempts) || empty($attempts)) {
                    continue;
                }

                $quiz  = get_post($quiz_id);
                $title = $quiz ? $quiz->post_title : 'Quiz #' . $quiz_id;

                $course_post  = $course_id ? get_post($course_id) : null;
                $course_title = $course_post ? $course_post->post_title : ($course_id ? 'Course #' . $course_id : '');

                // Sort descending by completion time to isolate latest attempt
                usort($attempts, function ($a, $b) {
                    return strtotime($b['completed'] ?? 0) - strtotime($a['completed'] ?? 0);
                });

                $latest_attempt  = $attempts[0];
                $highest_attempt = $attempts[0];
                foreach ($attempts as $attempt) {
                    if (floatval($attempt['percentage'] ?? 0) > floatval($highest_attempt['percentage'] ?? 0)) {
                        $highest_attempt = $attempt;
                    }
                }

                $result[] = array(
                    'id'                      => $quiz_id,
                    'quiz_id'                 => $quiz_id,
                    'title'                   => $title,
                    'parent_course_id'        => $course_id,
                    'parent_course_title'     => $course_title,
                    'total_attempts'          => count($attempts),
                    'percent_highest'         => floatval($highest_attempt['percentage'] ?? 0),
                    'percent_latest'          => floatval($latest_attempt['percentage'] ?? 0),
                    'points_scored_highest'   => floatval($highest_attempt['points_scored'] ?? 0),
                    'points_total_highest'    => floatval($highest_attempt['points_total'] ?? 0),
                    'points_scored_latest'    => floatval($latest_attempt['points_scored'] ?? 0),
                    'points_total_latest'     => floatval($latest_attempt['points_total'] ?? 0),
                    'pass_highest'            => (bool)($highest_attempt['pass'] ?? false),
                    'pass_latest'             => (bool)($latest_attempt['pass'] ?? false),
                    'latest_timestamp'        => $latest_attempt['completed'] ?? null,
                );
            }

            usort($result, function ($a, $b) {
                return strtotime($b['latest_timestamp'] ?? 0) - strtotime($a['latest_timestamp'] ?? 0);
            });

            return new \WP_REST_Response($result, 200);
        }

        /**
         * Get all attempts for a specific quiz
         */
        public function get_user_quiz_attempts($request) {
            $user_id = intval($request['user_id']);
            $quiz_id = intval($request['quiz_id']);

            if (!$user_id || !$quiz_id) {
                return new \WP_REST_Response(array('error' => 'user_id and quiz_id parameters required'), 400);
            }

            // Get validated auth header for LD API
            $auth_result = $this->get_validated_auth_header();
            if (is_a($auth_result, 'WP_REST_Response')) {
                return $auth_result;
            }
            $auth_header = $auth_result;

            $ld_api_url = get_home_url() . "/wp-json/ldlms/v2/users/{$user_id}/quiz-progress?quiz={$quiz_id}";

            $response = wp_remote_get($ld_api_url, array(
                'headers' => array(
                    'Authorization' => $auth_header,
                ),
                'timeout'   => 60,
                'sslverify' => false,
            ));

            if (is_wp_error($response)) {
                return new \WP_REST_Response(array('error' => $response->get_error_message()), 500);
            }

            $status = wp_remote_retrieve_response_code($response);
            if ($status !== 200) {
                return new \WP_REST_Response(array('error' => 'Failed to fetch quiz attempts from LearnDash API', 'status' => $status), $status);
            }

            $body = wp_remote_retrieve_body($response);
            $attempts = json_decode($body, true);

            if (!is_array($attempts)) {
                $attempts = array();
            }

            // Normalize attempt data to include score breakdown
            $normalized = array();
            foreach ($attempts as $attempt) {
                $normalized[] = array(
                    'id'              => $attempt['id'] ?? null,
                    'completed'       => $attempt['completed'] ?? null,
                    'percentage'      => floatval($attempt['percentage'] ?? 0),
                    'pass'            => (bool)($attempt['pass'] ?? false),
                    'points_scored'   => floatval($attempt['points_scored'] ?? 0),
                    'points_total'    => floatval($attempt['points_total'] ?? 0),
                );
            }

            // Sort by completed timestamp descending (most recent first)
            usort($normalized, function ($a, $b) {
                $ts_a = strtotime($a['completed'] ?? 0);
                $ts_b = strtotime($b['completed'] ?? 0);
                return $ts_b - $ts_a;
            });

            return new \WP_REST_Response($normalized, 200);
        }

        /**
         * Internal helper to fetch group courses (reusable by other endpoints)
         * Returns array of course objects with id and title
         */
        private function get_group_courses_internal($group_id, $auth_header) {
            // Fetch group users from LD API
            $ld_api_url = get_home_url() . "/wp-json/ldlms/v2/groups/{$group_id}/courses?_fields=id,title";

            $response = wp_remote_get($ld_api_url, array(
                'headers' => array(
                    'Authorization' => $auth_header,
                ),
                'timeout'   => 30,
                'sslverify' => false,
            ));

            if (is_wp_error($response)) {
                return new \WP_REST_Response(array('error' => $response->get_error_message()), 500);
            }

            $status = wp_remote_retrieve_response_code($response);
            $body = wp_remote_retrieve_body($response);

            if ($status !== 200) {
                return new \WP_REST_Response(array('error' => 'Failed to fetch courses from LearnDash API', 'status' => $status), $status);
            }

            $courses = json_decode($body, true);
            if (!is_array($courses)) {
                $courses = array();
            }

            // Ensure each course has both id and title
            $result = array();
            foreach ($courses as $course) {
                if (isset($course['id'])) {
                    $course_title = $course['title'];
                    if (is_array($course_title) && isset($course_title['rendered'])) {
                        $course_title = $course_title['rendered'];
                    }

                    $result[] = array(
                        'id'    => intval($course['id']),
                        'title' => $course_title,
                    );
                }
            }

            return $result;
        }

        /**
         * Get last accessed timestamp for a lesson or topic
         *
         * Queries LearnDash user activity to find when the user last accessed the given object
         * Returns RFC3339 formatted timestamp or null if never accessed
         */
        private function get_last_accessed_timestamp($user_id, $post_id, $object_type) {
            // Map object_type to LearnDash activity_type
            $activity_type = ($object_type === 'topic') ? 'topic' : 'lesson';

            // Query LearnDash activity
            $activity = learndash_get_user_activity([
                'user_id'       => $user_id,
                'post_id'       => $post_id,
                'activity_type' => $activity_type,
            ]);

            if (!$activity) {
                return null;
            }

            // Use activity_updated if available (most recent activity update)
            // Fall back to activity_completed or activity_started
            $timestamp = $activity->activity_updated ?: $activity->activity_completed ?: $activity->activity_started;

            if ($timestamp <= 0) {
                return null;
            }

            // Convert Unix timestamp to RFC3339 format
            return mysql_to_rfc3339(date('Y-m-d H:i:s', $timestamp));
        }

        /**
         * Get user activity log with pagination and filtering
         */
        public function get_user_activity($request) {
            global $wpdb;

            $user_id = intval($request['user_id']);
            if (!$user_id) {
                return new \WP_REST_Response(array('error' => 'Invalid user ID'), 400);
            }

            // Check if course_id is provided - if so, return last activity for that course only
            $course_id = intval($request->get_param('course_id') ?? 0);
            if ($course_id) {
                return $this->get_user_course_last_activity($user_id, $course_id);
            }

            // Handle multiple activity filters (activity[]=val1&activity[]=val2)
            $activity_filters = $request->get_param('activity');
            if (is_string($activity_filters)) {
                $activity_filters = array($activity_filters);
            } elseif (!is_array($activity_filters)) {
                $activity_filters = array();
            }
            $activity_filters = array_map('sanitize_text_field', $activity_filters);
            $activity_filters = array_filter($activity_filters); // Remove empty values

            $date_from = sanitize_text_field($request->get_param('date_from') ?? '');
            $date_to = sanitize_text_field($request->get_param('date_to') ?? '');
            $per_page = min(intval($request->get_param('per_page') ?? 20), 100);
            $page = max(intval($request->get_param('page') ?? 1), 1);

            if ($per_page < 1) $per_page = 20;

            // Fetch custom table activities
            $where_clauses = array(
                $wpdb->prepare("user_id = %d", $user_id)
            );

            if (!empty($activity_filters)) {
                $placeholders = implode(',', array_fill(0, count($activity_filters), '%s'));
                $where_clauses[] = $wpdb->prepare("activity IN ({$placeholders})", ...$activity_filters);
            }

            // Handle object_type[] filters (resource type)
            $object_type_filters = $request->get_param('object_type');
            if (is_string($object_type_filters)) {
                $object_type_filters = array($object_type_filters);
            } elseif (!is_array($object_type_filters)) {
                $object_type_filters = array();
            }
            $object_type_filters = array_map('sanitize_text_field', $object_type_filters);
            $object_type_filters = array_filter($object_type_filters);

            $skip_db_query = false;

            if (!empty($object_type_filters)) {
                // Object types now sourced exclusively from external APIs, NOT the custom DB table:
                // - 'achievement' → GamiPress REST API
                // - 'form'        → Gravity Forms REST API
                // - 'lesson'      → wp_learndash_user_activity (direct $wpdb query)
                // - 'topic'       → wp_learndash_user_activity (direct $wpdb query)
                // - 'quiz'        → wp_learndash_user_activity (direct $wpdb query)
                // Note: 'course' still has DB rows: course_enrolled, course_unenrolled, certificate_earned, certificate_viewed
                $non_db_types = ['achievement', 'form', 'lesson', 'topic', 'quiz'];
                $db_object_types = array_filter($object_type_filters, fn($t) => !in_array($t, $non_db_types));
                if (!empty($db_object_types)) {
                    $placeholders = implode(',', array_fill(0, count($db_object_types), '%s'));
                    $where_clauses[] = $wpdb->prepare("object_type IN ({$placeholders})", ...$db_object_types);
                } else {
                    // If all object_type filters were excluded from DB, skip DB query entirely
                    $skip_db_query = true;
                }
            }

            if (!empty($date_from)) {
                $where_clauses[] = $wpdb->prepare("DATE(created_at) >= %s", $date_from);
            }

            if (!empty($date_to)) {
                $where_clauses[] = $wpdb->prepare("DATE(created_at) <= %s", $date_to);
            }

            $rows = array();

            if (!$skip_db_query) {
                $where = implode(" AND ", $where_clauses);
                $table = $wpdb->prefix . BYS_GROUPS_USER_ACTIVITY_TABLE;

                $rows = $wpdb->get_results(
                    "SELECT id, activity, initiated_by, object_id, object_title, object_type, meta, created_at
                     FROM {$table}
                     WHERE {$where}",
                    ARRAY_A
                );
            }

            $items = array();
            foreach ($rows as $row) {
                $activity_slug = $row['activity'];
                $object_type = $row['object_type'] ?? '';
                $object_id = intval($row['object_id']);
                $meta = !empty($row['meta']) ? json_decode($row['meta'], true) : array();

                // Enrich lesson/topic entries with last_accessed timestamp from LearnDash
                if (in_array($object_type, ['lesson', 'topic']) && $object_id > 0) {
                    $last_accessed = $this->get_last_accessed_timestamp($user_id, $object_id, $object_type);
                    if ($last_accessed) {
                        $meta['last_accessed'] = $last_accessed;
                    }
                }

                $items[] = array(
                    'id'              => intval($row['id']),
                    'activity'        => $activity_slug,
                    'initiated_by'    => $row['initiated_by'] ?? '',
                    'object_id'       => $object_id,
                    'object_title'    => $row['object_title'] ?? '',
                    'object_type'     => $object_type,
                    'meta'            => $meta,
                    'created_at'      => $row['created_at'],
                );
            }

            // Fetch and transform GamiPress achievement logs if:
            // 1. No activity filter OR achievement_earned is in activity filters
            // 2. No object_type filter OR 'achievement' is in object_type filters
            $should_fetch_gamipress = (
                (empty($activity_filters) || in_array('achievement_earned', $activity_filters))
                && (empty($object_type_filters) || in_array('achievement', $object_type_filters))
            );
            if ($should_fetch_gamipress) {
                $gamipress_items = $this->get_gamipress_achievements($user_id, $date_from, $date_to);
                if ($gamipress_items) {
                    $items = array_merge($items, $gamipress_items);
                }
            }

            // Fetch Gravity Forms submissions if not filtered away by activity or object_type
            $should_fetch_gf = (
                (empty($activity_filters) || in_array('profile_update', $activity_filters) || in_array('account_settings_update', $activity_filters))
                && (empty($object_type_filters) || in_array('form', $object_type_filters))
            );

            if ($should_fetch_gf) {
                $gf_items = $this->get_gravity_forms_submissions($user_id, $date_from, $date_to);
                if ($gf_items) {
                    $items = array_merge($items, $gf_items);
                }
            }

            // Fetch LearnDash activity from wp_learndash_user_activity if:
            // 1. No activity filter OR at least one LD-sourced slug is in activity filters
            // 2. No object_type filter OR at least one LD-managed type (lesson/topic/quiz) is in object_type filters
            $ld_sourced_slugs = ['lesson_completed', 'topic_completed', 'quiz_submitted', 'quiz_completed'];
            $ld_object_types  = ['lesson', 'topic', 'quiz'];

            $should_fetch_ld = (
                (empty($activity_filters) || !empty(array_intersect($activity_filters, $ld_sourced_slugs)))
                && (empty($object_type_filters) || !empty(array_intersect($object_type_filters, $ld_object_types)))
            );

            if ($should_fetch_ld) {
                $ld_items = $this->get_learndash_activity($user_id, $date_from, $date_to, $activity_filters, $object_type_filters);
                if ($ld_items) {
                    $items = array_merge($items, $ld_items);
                }
            }

            // Sort by created_at descending
            usort($items, function ($a, $b) {
                return strtotime($b['created_at']) - strtotime($a['created_at']);
            });

            // Apply pagination to merged results
            $total = count($items);
            $offset = ($page - 1) * $per_page;
            $paginated_items = array_slice($items, $offset, $per_page);

            // Convert created_at to RFC3339 format for API response
            foreach ($paginated_items as &$item) {
                $item['created_at'] = mysql_to_rfc3339($item['created_at']);
            }

            $pages = $per_page > 0 ? ceil($total / $per_page) : 0;

            return new \WP_REST_Response(array(
                'total' => $total,
                'pages' => $pages,
                'items' => $paginated_items,
            ), 200);
        }

        /**
         * Log certificate view event via REST API
         *
         * Called by certificate-link-tracker.js when user clicks a certificate link
         */
        public function log_certificate_view($request) {
            global $wpdb;

            $user_id = intval($request['user_id']);
            $course_id = intval($request->get_param('course_id') ?? 0);

            if (!$user_id || !$course_id) {
                return new \WP_REST_Response(array('error' => 'Invalid user_id or course_id'), 400);
            }

            $user = get_user_by('ID', $user_id);
            if (!$user) {
                return new \WP_REST_Response(array('error' => 'User not found'), 404);
            }

            // Prevent duplicate logs within 30 minutes
            $cache_key = "bys_cert_viewed_{$user_id}_{$course_id}";
            if (get_transient($cache_key)) {
                return new \WP_REST_Response(array('message' => 'Certificate view already logged within 30 minutes'), 200);
            }

            $course_title = get_the_title($course_id);
            $table = $wpdb->prefix . BYS_GROUPS_USER_ACTIVITY_TABLE;

            // Fetch certificate details from LD API
            $cert_id = null;
            $awarded_cert_url = null;
            $auth_header = $this->get_validated_auth_header();
            if ($auth_header && !is_wp_error($auth_header)) {
                $ld_api_url = get_home_url() . "/wp-json/ldlms/v2/users/{$user_id}/courses?include={$course_id}";
                $response = wp_remote_get($ld_api_url, array(
                    'headers' => array('Authorization' => $auth_header),
                    'timeout' => 30,
                    'sslverify' => false,
                ));

                if (!is_wp_error($response) && wp_remote_retrieve_response_code($response) === 200) {
                    $body = wp_remote_retrieve_body($response);
                    if (preg_match('/\[.*\]/s', $body, $matches)) {
                        $body = $matches[0];
                    } elseif (preg_match('/\{.*\}/s', $body, $matches)) {
                        $body = $matches[0];
                    }
                    $data = json_decode($body, true);
                    if (is_array($data) && !empty($data)) {
                        $course = $data[0];
                        $cert_id = intval($course['certificate'] ?? 0);
                        $awarded_cert_url = $course['awarded_certificate_url'] ?? null;
                    }
                }
            }

            $wpdb->insert(
                $table,
                array(
                    'user_id'      => $user_id,
                    'activity'     => 'certificate_viewed',
                    'initiated_by' => 'self',
                    'object_id'    => $course_id,
                    'object_title' => $course_title ?: null,
                    'object_type'  => 'course',
                    'meta'         => json_encode(array(
                        'viewed_at'              => current_time('mysql'),
                        'certificate_id'        => $cert_id,
                        'awarded_certificate_url' => $awarded_cert_url,
                    )),
                    'created_at'   => current_time('mysql'),
                ),
                array('%d', '%s', '%s', '%d', '%s', '%s', '%s', '%s')
            );

            set_transient($cache_key, true, 30 * MINUTE_IN_SECONDS);

            return new \WP_REST_Response(array('message' => 'Certificate view logged'), 200);
        }

        /**
         * Fetch GamiPress achievement logs and transform to activity log format
         *
         * @param int $user_id User ID
         * @param string $date_from Optional start date (YYYY-MM-DD format)
         * @param string $date_to Optional end date (YYYY-MM-DD format)
         * @return array Transformed GamiPress achievement items
         */
        private function get_gamipress_achievements($user_id, $date_from = '', $date_to = '') {
            $user_id = intval($user_id);
            if (!$user_id) {
                return array();
            }

            $items = array();

            // Fetch achievements from gamipress-user-earnings endpoint (has post_id and title)
            $base_url = get_home_url() . '/wp-json/wp/v2/gamipress-user-earnings';
            $args = array(
                'user_id' => $user_id,
                'per_page' => 100,
                'orderby' => 'date',
                'order'   => 'desc'
            );

            $url = add_query_arg($args, $base_url);

            $auth_header = BYS_Groups_Auth::get_auth_header();
            $request_args = array(
                'timeout'   => 10,
                'sslverify' => false,
            );

            if ($auth_header) {
                $request_args['headers'] = array('Authorization' => $auth_header);
            }

            $response = wp_remote_get($url, $request_args);

            if (is_wp_error($response) || wp_remote_retrieve_response_code($response) !== 200) {
                return array();
            }

            $body = wp_remote_retrieve_body($response);
            $earnings = json_decode($body, true);

            if (!is_array($earnings)) {
                return array();
            }

            // Now fetch the logs to get trigger_type (which determines initiated_by)
            $logs_base_url = get_home_url() . '/wp-json/wp/v2/gamipress-logs';
            $logs_args = array(
                'user_id' => $user_id,
                'type'    => 'achievement_award',
                'per_page' => 100,
                'orderby' => 'date',
                'order'   => 'desc'
            );

            $logs_url = add_query_arg($logs_args, $logs_base_url);

            $logs_response = wp_remote_get($logs_url, $request_args);

            $logs_by_date = array();
            if (!is_wp_error($logs_response) && wp_remote_retrieve_response_code($logs_response) === 200) {
                $logs_body = wp_remote_retrieve_body($logs_response);
                $logs = json_decode($logs_body, true);
                if (is_array($logs)) {
                    // Index logs by date for quick lookup
                    foreach ($logs as $log) {
                        $logs_by_date[$log['date']] = $log;
                    }
                }
            }

            foreach ($earnings as $earning) {
                // Only include badge post_type
                if (($earning['post_type'] ?? '') !== 'badge') {
                    continue;
                }

                // Parse earning date
                $earning_date = $earning['date'] ?? null;
                if (!$earning_date) {
                    continue;
                }

                // Filter by date range if provided
                if ($date_from && strtotime($earning_date) < strtotime($date_from)) {
                    continue;
                }
                if ($date_to && strtotime($earning_date) > strtotime($date_to . ' 23:59:59')) {
                    continue;
                }

                // Get trigger_type from matching log entry
                $trigger_type = 'gamipress_earned_achievement'; // default
                if (isset($logs_by_date[$earning_date])) {
                    $trigger_type = $logs_by_date[$earning_date]['trigger_type'] ?? 'gamipress_earned_achievement';
                }

                // Only include these specific trigger_type
                if ($trigger_type !== 'gamipress_award_achievement' && $trigger_type !== 'gamipress_earned_achievement') {
                    continue;
                }

                // Determine initiated_by based on trigger type
                $initiated_by = ($trigger_type === 'gamipress_award_achievement') ? 'admin' : 'system';

                // Extract achievement details from earning
                $achievement_id = intval($earning['post_id'] ?? 0);
                $achievement_title = $earning['title'] ?? 'Achievement Earned';

                // Build metadata
                $meta = array(
                    'gamipress_earning' => array(
                        'earning_id'   => $earning['id'] ?? null,
                        'title'        => $earning['title'] ?? null,
                        'post_type'    => $earning['post_type'] ?? null,
                        'points'       => $earning['points'] ?? null,
                        'points_type'  => $earning['points_type'] ?? null,
                        'date'         => $earning['date'] ?? null,
                    ),
                );

                $mysql_date = date('Y-m-d H:i:s', strtotime($earning_date));

                $items[] = array(
                    'id'              => 0, // GamiPress items don't have ID in custom table (handled by REST API)
                    'activity'        => 'achievement_earned',
                    'initiated_by'    => $initiated_by,
                    'object_id'       => $achievement_id,
                    'object_title'    => $achievement_title,
                    'object_type'     => 'achievement',
                    'meta'            => $meta,
                    'created_at'      => $mysql_date,
                );
            }

            return $items;
        }

        /**
         * Fetch Gravity Forms submissions from REST API
         * Mirrors the GamiPress pattern: query GF API instead of logging to custom table
         * Maps form IDs to activity slugs (16 → profile_update, 15 → account_settings_update)
         */
        private function get_gravity_forms_submissions($user_id, $date_from = '', $date_to = '') {
            $user_id = intval($user_id);
            if (!$user_id) {
                return array();
            }

            // Map form ID → activity slug
            $form_map = array(
                16 => 'profile_update',
                15 => 'account_settings_update',
            );

            $auth_header = BYS_Groups_Auth::get_auth_header();

            $request_args = array(
                'timeout'   => 10,
                'sslverify' => false,
            );
            if ($auth_header) {
                $request_args['headers'] = array('Authorization' => $auth_header);
            }

            $items = array();

            foreach ($form_map as $form_id => $activity_slug) {
                $args = array(
                    'search'  => json_encode(array(
                        'field_filters' => array(
                            array('key' => 'created_by', 'value' => $user_id)
                        )
                    )),
                    'sorting' => json_encode(array('key' => 'date_created', 'direction' => 'DESC')),
                    'paging'  => json_encode(array('page_size' => 100)),
                );

                $url = add_query_arg($args, get_home_url() . "/wp-json/gf/v2/forms/{$form_id}/entries");

                $response = wp_remote_get($url, $request_args);

                if (is_wp_error($response) || wp_remote_retrieve_response_code($response) !== 200) {
                    continue;
                }

                $body = wp_remote_retrieve_body($response);
                $data = json_decode($body, true);

                if (!is_array($data)) {
                    continue;
                }

                $entries = $data['entries'] ?? (is_array($data) ? $data : array());

                foreach ($entries as $entry) {
                    $entry_date = $entry['date_created'] ?? null;
                    if (!$entry_date) {
                        continue;
                    }

                    // Apply date range filters
                    if ($date_from && strtotime($entry_date) < strtotime($date_from)) {
                        continue;
                    }
                    if ($date_to && strtotime($entry_date) > strtotime($date_to . ' 23:59:59')) {
                        continue;
                    }

                    // Extract field values (numeric keys are field data)
                    $field_data = array();
                    foreach ($entry as $key => $value) {
                        if (is_numeric($key) && $value !== '' && $value !== null) {
                            $field_data[$key] = $value;
                        }
                    }

                    $items[] = array(
                        'id'           => 0,
                        'activity'     => $activity_slug,
                        'initiated_by' => 'self',
                        'object_id'    => $form_id,
                        'object_title' => $entry['form_title'] ?? '',
                        'object_type'  => 'form',
                        'meta'         => array(
                            'entry_id' => intval($entry['id'] ?? 0),
                            'form_id'  => $form_id,
                            'fields'   => $field_data,
                        ),
                        'created_at'   => date('Y-m-d H:i:s', strtotime($entry_date)),
                    );
                }
            }

            return $items;
        }

        /**
         * Fetch LearnDash activity directly from wp_learndash_user_activity table.
         */
        private function get_learndash_activity($user_id, $date_from = '', $date_to = '', $activity_filters = [], $object_type_filters = []) {
            global $wpdb;

            $user_id = intval($user_id);
            if (!$user_id) {
                return [];
            }

            // Map BYS activity slugs to LD activity_type values
            $ld_slug_to_type = [
                'lesson_completed' => 'lesson',
                'topic_completed'  => 'topic',
                'quiz_submitted'   => 'quiz',
                'quiz_completed'   => 'quiz',
            ];

            $ld_object_type_to_type = [
                'lesson' => 'lesson',
                'topic'  => 'topic',
                'quiz'   => 'quiz',
            ];

            // Determine which LD types to query based on filters
            $ld_activity_types_needed = [];
            $all_ld_types = ['lesson', 'topic', 'quiz'];

            if (!empty($activity_filters)) {
                // Only include LD types that match the requested activity slugs
                foreach ($activity_filters as $slug) {
                    if (isset($ld_slug_to_type[$slug])) {
                        $ld_activity_types_needed[] = $ld_slug_to_type[$slug];
                    }
                }
                $ld_activity_types_needed = array_unique($ld_activity_types_needed);
                if (empty($ld_activity_types_needed)) {
                    return []; // No LD-sourced activities match filter
                }
            } elseif (!empty($object_type_filters)) {
                // Get LD types from object_type filter
                foreach ($object_type_filters as $ot) {
                    if (isset($ld_object_type_to_type[$ot])) {
                        $ld_activity_types_needed[] = $ld_object_type_to_type[$ot];
                    }
                }
                $ld_activity_types_needed = array_unique($ld_activity_types_needed);
                if (empty($ld_activity_types_needed)) {
                    return [];
                }
            } else {
                $ld_activity_types_needed = $all_ld_types;
            }

            $where_clauses = [
                $wpdb->prepare("a.user_id = %d", $user_id),
            ];

            $type_placeholders = implode(',', array_fill(0, count($ld_activity_types_needed), '%s'));
            $where_clauses[] = $wpdb->prepare(
                "a.activity_type IN ({$type_placeholders})",
                ...$ld_activity_types_needed
            );

            // Completed status filter
            $where_clauses[] = "(
                (a.activity_type IN ('lesson','topic') AND a.activity_status = 1 AND a.activity_completed > 0)
                OR (a.activity_type = 'quiz' AND a.activity_completed > 0)
            )";

            // Date range filters
            if (!empty($date_from)) {
                $ts_from = strtotime($date_from . ' 00:00:00');
                $where_clauses[] = $wpdb->prepare("a.activity_completed >= %d", $ts_from);
            }
            if (!empty($date_to)) {
                $ts_to = strtotime($date_to . ' 23:59:59');
                $where_clauses[] = $wpdb->prepare("a.activity_completed <= %d", $ts_to);
            }

            $where = implode(' AND ', $where_clauses);
            $ld_table = $wpdb->prefix . 'learndash_user_activity';

            // Fetch activity rows — join posts table for object title
            $rows = $wpdb->get_results(
                "SELECT a.activity_id, a.user_id, a.post_id, a.course_id,
                        a.activity_type, a.activity_status,
                        a.activity_started, a.activity_completed, a.activity_updated,
                        p.post_title
                 FROM {$ld_table} a
                 LEFT JOIN {$wpdb->posts} p ON p.ID = a.post_id
                 WHERE {$where}
                 ORDER BY a.activity_completed DESC",
                ARRAY_A
            );

            if (empty($rows)) {
                return [];
            }

            // For quiz rows: batch-fetch meta (score, percentage, pass, timespent, points)
            $quiz_activity_ids = [];
            foreach ($rows as $row) {
                if ($row['activity_type'] === 'quiz') {
                    $quiz_activity_ids[] = intval($row['activity_id']);
                }
            }

            $quiz_meta_map = [];
            if (!empty($quiz_activity_ids)) {
                $meta_table = $wpdb->prefix . 'learndash_user_activity_meta';
                $id_placeholders = implode(',', array_fill(0, count($quiz_activity_ids), '%d'));
                $meta_keys = ['score', 'percentage', 'pass', 'timespent', 'points', 'total_points', 'count'];
                $key_placeholders = implode(',', array_fill(0, count($meta_keys), '%s'));

                $meta_rows = $wpdb->get_results(
                    $wpdb->prepare(
                        "SELECT activity_id, activity_meta_key, activity_meta_value
                         FROM {$meta_table}
                         WHERE activity_id IN ({$id_placeholders})
                         AND activity_meta_key IN ({$key_placeholders})",
                        ...array_merge($quiz_activity_ids, $meta_keys)
                    ),
                    ARRAY_A
                );

                foreach ($meta_rows as $meta_row) {
                    $aid = intval($meta_row['activity_id']);
                    if (!isset($quiz_meta_map[$aid])) {
                        $quiz_meta_map[$aid] = [];
                    }
                    $quiz_meta_map[$aid][$meta_row['activity_meta_key']] = $meta_row['activity_meta_value'];
                }
            }

            $items = [];

            foreach ($rows as $row) {
                $type    = $row['activity_type'];
                $post_id = intval($row['post_id']);
                $course_id = intval($row['course_id']);
                $title   = $row['post_title'] ?? '';
                $activity_id = intval($row['activity_id']);

                if ($type === 'lesson') {
                    $timestamp = intval($row['activity_completed']);
                    $items[] = [
                        'id'           => 0,
                        'activity'     => 'lesson_completed',
                        'initiated_by' => 'system',
                        'object_id'    => $post_id,
                        'object_title' => $title,
                        'object_type'  => 'lesson',
                        'meta'         => ['course_id' => $course_id],
                        'created_at'   => date('Y-m-d H:i:s', $timestamp),
                    ];
                } elseif ($type === 'topic') {
                    $timestamp = intval($row['activity_completed']);
                    $items[] = [
                        'id'           => 0,
                        'activity'     => 'topic_completed',
                        'initiated_by' => 'system',
                        'object_id'    => $post_id,
                        'object_title' => $title,
                        'object_type'  => 'topic',
                        'meta'         => ['course_id' => $course_id],
                        'created_at'   => date('Y-m-d H:i:s', $timestamp),
                    ];
                } elseif ($type === 'quiz') {
                    $timestamp = intval($row['activity_completed']);
                    $meta_raw  = $quiz_meta_map[$activity_id] ?? [];
                    $meta = [
                        'course_id'    => $course_id,
                        'score'        => intval($meta_raw['score'] ?? 0),
                        'points'       => intval($meta_raw['points'] ?? 0),
                        'total_points' => intval($meta_raw['total_points'] ?? 0),
                        'percentage'   => floatval($meta_raw['percentage'] ?? 0),
                        'timespent'    => intval($meta_raw['timespent'] ?? 0),
                        'pass'         => filter_var($meta_raw['pass'] ?? false, FILTER_VALIDATE_BOOLEAN),
                    ];
                    $dt = date('Y-m-d H:i:s', $timestamp);

                    // Emit quiz_submitted if filter includes it or no filter
                    $include_submitted = empty($activity_filters) || in_array('quiz_submitted', $activity_filters);
                    // Emit quiz_completed if filter includes it or no filter
                    $include_completed = empty($activity_filters) || in_array('quiz_completed', $activity_filters);

                    if ($include_submitted) {
                        $items[] = [
                            'id'           => 0,
                            'activity'     => 'quiz_submitted',
                            'initiated_by' => 'self',
                            'object_id'    => $post_id,
                            'object_title' => $title,
                            'object_type'  => 'quiz',
                            'meta'         => $meta,
                            'created_at'   => $dt,
                        ];
                    }
                    if ($include_completed) {
                        $items[] = [
                            'id'           => 0,
                            'activity'     => 'quiz_completed',
                            'initiated_by' => 'system',
                            'object_id'    => $post_id,
                            'object_title' => $title,
                            'object_type'  => 'quiz',
                            'meta'         => $meta,
                            'created_at'   => $dt,
                        ];
                    }
                }
            }

            return $items;
        }

        /**
         * Get last activity timestamp for user in a specific course
         * Uses LearnDash native function learndash_get_user_activity()
         */
        private function get_user_course_last_activity($user_id, $course_id) {
            try {
                // Use LearnDash native function to get last activity
                if (function_exists('learndash_get_user_activity')) {
                    $activity = learndash_get_user_activity(array(
                        'user_id'   => intval($user_id),
                        'course_id' => intval($course_id)
                    ));

                    if ($activity && isset($activity->activity_updated)) {
                        // activity_updated is a MySQL GMT timestamp string
                        $last_activity_gmt = $activity->activity_updated;

                        return new \WP_REST_Response(array(
                            'last_activity_gmt' => $last_activity_gmt
                        ), 200);
                    }
                } else {
                    error_log('[BYS Groups] learndash_get_user_activity function not found');
                }
            } catch (\Exception $e) {
                error_log('[BYS Groups] Error getting user last activity: ' . $e->getMessage());
                return new \WP_REST_Response(array('error' => $e->getMessage()), 500);
            }

            return new \WP_REST_Response(array('last_activity_gmt' => null), 200);
        }

        /**
         * Get all steps progress for a user in a course
         * Fetches lessons, topics, and quizzes with their completion status
         * Handles pagination to get all steps (not just first 10)
         */
        public function get_user_course_steps_progress($request) {
            $user_id = intval($request['user_id']);
            $course_id = intval($request['course_id']);

            if (!$user_id || !$course_id) {
                return new \WP_REST_Response(array('error' => 'Invalid user_id or course_id'), 400);
            }

            // Get validated auth header for LD API
            $auth_result = $this->get_validated_auth_header();
            if (is_a($auth_result, 'WP_REST_Response')) {
                return $auth_result;
            }
            $auth_header = $auth_result;

            // Fetch all steps progress for user in course using LD API endpoint
            // The LD API paginates by default, so we need to fetch all pages
            $all_steps = array();
            $page = 1;
            $per_page = 100; // Request max per page to minimize API calls

            while (true) {
                $ld_api_url = get_home_url() . "/wp-json/ldlms/v2/users/{$user_id}/course-progress/{$course_id}/steps?per_page={$per_page}&page={$page}";

                $response = wp_remote_get($ld_api_url, array(
                    'headers' => array('Authorization' => $auth_header),
                    'timeout' => 30,
                    'sslverify' => false,
                ));

                if (is_wp_error($response)) {
                    return new \WP_REST_Response(array('error' => $response->get_error_message()), 500);
                }

                $status = wp_remote_retrieve_response_code($response);
                $body = wp_remote_retrieve_body($response);

                if ($status !== 200) {
                    return new \WP_REST_Response(array('error' => 'Failed to fetch course steps progress from LearnDash API', 'status' => $status), $status);
                }

                $data = json_decode($body, true);

                if (!is_array($data) || empty($data)) {
                    break; // No more pages
                }

                $all_steps = array_merge($all_steps, $data);

                // Check if there are more pages
                if (count($data) < $per_page) {
                    break; // Last page
                }

                $page++;
            }

            // Augment steps with activity detail (last accessed, time spent, visits)
            // via batch DB queries — no N+1
            if ( ! empty( $all_steps ) ) {
                global $wpdb;
                $ld_table   = $wpdb->prefix . 'learndash_user_activity';
                $meta_table = $wpdb->prefix . 'learndash_user_activity_meta';

                // Query 1: all topic/lesson activity rows for this user + course
                $activity_rows = $wpdb->get_results( $wpdb->prepare(
                    "SELECT post_id, activity_id, activity_started, activity_completed, activity_updated
                     FROM {$ld_table}
                     WHERE user_id = %d AND course_id = %d AND activity_type IN ('topic','lesson')
                     ORDER BY activity_updated DESC",
                    $user_id, $course_id
                ), ARRAY_A );

                // Key by post_id — keep the most-recent row per step
                $activity_map = [];
                foreach ( $activity_rows as $row ) {
                    $pid = intval( $row['post_id'] );
                    if ( ! isset( $activity_map[ $pid ] ) ) {
                        $activity_map[ $pid ] = $row;
                    }
                }

                // Query 2: timespent + count meta for those activity IDs (Uncanny Owl xAPI)
                $meta_map = [];
                $activity_ids = array_column( $activity_rows, 'activity_id' );
                if ( ! empty( $activity_ids ) ) {
                    $placeholders = implode( ',', array_fill( 0, count( $activity_ids ), '%d' ) );
                    $meta_rows = $wpdb->get_results( $wpdb->prepare(
                        "SELECT activity_id, meta_key, meta_value
                         FROM {$meta_table}
                         WHERE activity_id IN ({$placeholders}) AND meta_key IN ('timespent','count')",
                        ...$activity_ids
                    ), ARRAY_A );

                    foreach ( $meta_rows as $m ) {
                        $meta_map[ intval( $m['activity_id'] ) ][ $m['meta_key'] ] = $m['meta_value'];
                    }
                }

                // Query 3: batch-fetch custom visit counts from user meta (bys_topic_visits_{id})
                $step_ids = array_keys( $activity_map );
                $visit_map = [];
                if ( ! empty( $step_ids ) ) {
                    $meta_key_placeholders = implode( ',', array_fill( 0, count( $step_ids ), '%s' ) );
                    $meta_keys_needed = array_map( fn($id) => 'bys_topic_visits_' . $id, $step_ids );
                    $visit_rows = $wpdb->get_results( $wpdb->prepare(
                        "SELECT meta_key, meta_value FROM {$wpdb->usermeta}
                         WHERE user_id = %d AND meta_key IN ({$meta_key_placeholders})",
                        $user_id, ...$meta_keys_needed
                    ), ARRAY_A );
                    foreach ( $visit_rows as $vr ) {
                        $pid_from_key = intval( str_replace( 'bys_topic_visits_', '', $vr['meta_key'] ) );
                        $visit_map[ $pid_from_key ] = intval( $vr['meta_value'] );
                    }
                }

                // Merge extra fields into each step
                foreach ( $all_steps as &$step ) {
                    $pid = intval( $step['step'] );
                    if ( ! isset( $activity_map[ $pid ] ) ) continue;

                    $act  = $activity_map[ $pid ];
                    $meta = $meta_map[ intval( $act['activity_id'] ) ] ?? [];

                    // last_accessed_gmt — most recent activity_updated timestamp
                    if ( ! empty( $act['activity_updated'] ) ) {
                        $step['last_accessed_gmt'] = gmdate( 'Y-m-d\TH:i:s', intval( $act['activity_updated'] ) );
                    }

                    // time_spent_seconds — Uncanny Owl meta first, then calculated fallback
                    if ( isset( $meta['timespent'] ) && intval( $meta['timespent'] ) > 0 ) {
                        $step['time_spent_seconds'] = intval( $meta['timespent'] );
                    } elseif ( ! empty( $act['activity_completed'] ) && ! empty( $act['activity_started'] ) ) {
                        $diff = intval( $act['activity_completed'] ) - intval( $act['activity_started'] );
                        if ( $diff > 0 ) {
                            $step['time_spent_seconds'] = $diff;
                        }
                    }

                    // visits — from our custom bys_topic_visits_{id} user meta
                    if ( isset( $visit_map[ $pid ] ) && $visit_map[ $pid ] > 0 ) {
                        $step['visits'] = $visit_map[ $pid ];
                    }
                }
                unset( $step );
            }

            return new \WP_REST_Response($all_steps, 200);
        }

        /**
         * Increment a per-topic visit counter stored in user meta.
         * Meta key: bys_topic_visits_{topic_id}
         */
        public function track_topic_visit($request) {
            $user_id  = intval($request['user_id']);
            $topic_id = intval($request->get_param('topic_id'));

            if (!$user_id || !$topic_id) {
                return new \WP_REST_Response(array('error' => 'Missing user_id or topic_id'), 400);
            }

            $meta_key = 'bys_topic_visits_' . $topic_id;
            $current  = intval(get_user_meta($user_id, $meta_key, true));
            $new_count = $current + 1;
            update_user_meta($user_id, $meta_key, $new_count);

            return new \WP_REST_Response(array('visits' => $new_count), 200);
        }

        /**
         * Set a group's post status to draft (archive).
         * Verifies the group exists and belongs to the 'groups' post type.
         */
        public function archive_group($request) {
            $group_id = intval($request->get_param('group_id'));

            $group = get_post($group_id);
            if (!$group || $group->post_type !== 'groups') {
                return new \WP_REST_Response(array('error' => 'Group not found'), 404);
            }

            $result = wp_update_post(array(
                'ID'          => $group_id,
                'post_status' => 'draft',
            ), true);

            if (is_wp_error($result)) {
                return new \WP_REST_Response(array('error' => $result->get_error_message()), 500);
            }

            update_post_meta($group_id, '_bys_archived_date', time());

            return new \WP_REST_Response(array('success' => true, 'group_id' => $group_id), 200);
        }

        /**
         * Restore a group's post status to publish (unarchive).
         */
        public function unarchive_group($request) {
            $group_id = intval($request->get_param('group_id'));

            $group = get_post($group_id);
            if (!$group || $group->post_type !== 'groups') {
                return new \WP_REST_Response(array('error' => 'Group not found'), 404);
            }

            $result = wp_update_post(array(
                'ID'          => $group_id,
                'post_status' => 'publish',
            ), true);

            if (is_wp_error($result)) {
                return new \WP_REST_Response(array('error' => $result->get_error_message()), 500);
            }

            delete_post_meta($group_id, '_bys_archived_date');

            return new \WP_REST_Response(array('success' => true, 'group_id' => $group_id), 200);
        }

        /**
         * Get all draft-status groups the current user leads.
         * Returns id, title, and the timestamp stored when the group was archived.
         * Falls back to post_modified if the meta was not set (pre-existing drafts).
         */
        public function get_current_user_archived_groups($request) {
            $user_id = intval($request->get_param('user_id')) ?: get_current_user_id();

            if (!$user_id) {
                return new \WP_REST_Response(array('groups' => array()), 200);
            }

            $user_group_metas = get_user_meta($user_id);
            $led_group_ids    = array();

            foreach ($user_group_metas as $meta_key => $meta_values) {
                if (strpos($meta_key, 'learndash_group_leaders_') === 0) {
                    $group_id = intval(str_replace('learndash_group_leaders_', '', $meta_key));
                    if ($group_id > 0) {
                        $led_group_ids[] = $group_id;
                    }
                }
            }

            $archived_groups = array();

            foreach ($led_group_ids as $group_id) {
                $group = get_post($group_id);
                if (!$group || $group->post_type !== 'groups' || $group->post_status !== 'draft') {
                    continue;
                }

                $archived_date = get_post_meta($group_id, '_bys_archived_date', true);
                if (!$archived_date) {
                    $archived_date = get_post_modified_time('U', false, $group_id);
                }

                $archived_groups[] = array(
                    'id'            => $group->ID,
                    'title'         => $group->post_title,
                    'archived_date' => (int) $archived_date,
                );
            }

            return new \WP_REST_Response(array('groups' => $archived_groups), 200);
        }

        public function get_all_courses($request) {
            $search = sanitize_text_field($request->get_param('search') ?? '');

            $args = array(
                'post_type'      => 'sfwd-courses',
                'post_status'    => 'publish',
                'posts_per_page' => 100,
                'orderby'        => 'title',
                'order'          => 'ASC',
                'no_found_rows'  => true,
            );
            if ($search) {
                $args['s'] = $search;
            }

            $result = array();
            foreach (get_posts($args) as $course) {
                $result[] = array(
                    'id'    => $course->ID,
                    'title' => $course->post_title,
                );
            }
            return new \WP_REST_Response($result, 200);
        }

        public function add_group_course($request) {
            $group_id  = intval($request['group_id']);
            $course_id = intval($request['course_id']);

            if (!$group_id || !$course_id) {
                return new \WP_REST_Response(array('error' => 'Invalid IDs'), 400);
            }

            ld_update_course_group_access($course_id, $group_id, false);
            return new \WP_REST_Response(array('success' => true), 200);
        }

        public function remove_group_course($request) {
            $group_id  = intval($request['group_id']);
            $course_id = intval($request['course_id']);

            if (!$group_id || !$course_id) {
                return new \WP_REST_Response(array('error' => 'Invalid IDs'), 400);
            }

            ld_update_course_group_access($course_id, $group_id, true);

            // Also clean up the required status for this course
            $ids = get_post_meta($group_id, '_bys_required_course_ids', true);
            if (is_array($ids)) {
                $ids = array_values(array_filter(array_map('intval', $ids), function ($id) use ($course_id) {
                    return $id !== $course_id;
                }));
                update_post_meta($group_id, '_bys_required_course_ids', $ids);
            }

            return new \WP_REST_Response(array('success' => true), 200);
        }

        public function toggle_required_course($request) {
            $group_id  = intval($request['group_id']);
            $course_id = intval($request['course_id']);

            if (!$group_id || !$course_id) {
                return new \WP_REST_Response(array('error' => 'Invalid IDs'), 400);
            }

            $ids = get_post_meta($group_id, '_bys_required_course_ids', true);
            $ids = is_array($ids) ? array_values(array_map('intval', array_filter($ids))) : array();

            $idx = array_search($course_id, $ids, true);
            if ($idx !== false) {
                array_splice($ids, $idx, 1);
                $required = false;
            } else {
                $ids[] = $course_id;
                $required = true;
            }

            update_post_meta($group_id, '_bys_required_course_ids', $ids);
            return new \WP_REST_Response(array('success' => true, 'required' => $required), 200);
        }

        public function get_group_leaders($request) {
            $group_id = intval($request['group_id']);
            if (!$group_id) {
                return new \WP_REST_Response(array('error' => 'Invalid group ID'), 400);
            }

            $leaders = get_users(array(
                'meta_key'   => 'learndash_group_leaders_' . $group_id,
                'meta_value' => $group_id,
            ));

            $result = array();
            foreach ($leaders as $leader) {
                $result[] = array(
                    'id'           => $leader->ID,
                    'display_name' => $leader->display_name,
                    'first_name'   => get_user_meta($leader->ID, 'first_name', true),
                    'last_name'    => get_user_meta($leader->ID, 'last_name', true),
                    'email'        => $leader->user_email,
                    'avatar'       => get_avatar_url($leader->ID, array('size' => 64)),
                );
            }

            return new \WP_REST_Response($result, 200);
        }

        public function remove_group_leader($request) {
            $group_id  = intval($request['group_id']);
            $target_id = intval($request['user_id']);

            if (!$group_id || !$target_id) {
                return new \WP_REST_Response(array('error' => 'Invalid parameters'), 400);
            }

            $caller_id = get_current_user_id();
            if (!current_user_can('manage_options') && !$this->is_org_admin_of_group($caller_id, $group_id)) {
                return new \WP_REST_Response(array('error' => 'Forbidden'), 403);
            }

            ld_update_leader_group_access($target_id, $group_id, false);

            return new \WP_REST_Response(array('success' => true), 200);
        }

        private function is_org_admin_of_group($user_id, $group_id) {
            $orgs = get_posts(array('post_type' => 'organization', 'post_status' => 'publish', 'posts_per_page' => -1));
            foreach ($orgs as $org) {
                $raw_groups = get_field('groups', $org->ID);
                $group_ids  = array_map(fn($g) => $g instanceof \WP_Post ? $g->ID : intval($g), (array) $raw_groups);
                if (!in_array($group_id, $group_ids, true)) continue;
                $raw_admins = get_field('administrators', $org->ID);
                $admin_ids  = array_map(fn($a) => $a instanceof \WP_User ? $a->ID : intval($a), (array) $raw_admins);
                if (in_array($user_id, $admin_ids, true)) return true;
            }
            return false;
        }

        // ── Invite endpoints ──────────────────────────────────────────────────

        /**
         * POST /groups/{group_id}/invite
         * Body: { email, role, invited_by_user_id }
         *
         * If a WP user already exists with this email → enroll them immediately.
         * Otherwise → insert a pending invite row and send the invitation email.
         */
        public function invite_member( $request ) {
            $group_id = intval( $request['group_id'] );
            $body     = json_decode( $request->get_body(), true );
            $email    = sanitize_email( $body['email'] ?? '' );
            $role     = in_array( $body['role'] ?? '', [ 'learner', 'leader' ], true )
                        ? $body['role']
                        : 'learner';
            $invited_by = intval( $body['invited_by_user_id'] ?? 0 );

            if ( ! $group_id || ! is_email( $email ) ) {
                return new \WP_REST_Response( array( 'error' => 'Invalid group_id or email' ), 400 );
            }

            $group = get_post( $group_id );
            if ( ! $group || $group->post_type !== 'groups' ) {
                return new \WP_REST_Response( array( 'error' => 'Group not found' ), 404 );
            }

            // Case 1: user already exists → enroll directly
            $existing_user = get_user_by( 'email', $email );
            if ( $existing_user ) {
                BYS_Groups_Invites::add_to_group( $existing_user->ID, $group_id, $role );
                return new \WP_REST_Response( array(
                    'status'  => 'enrolled',
                    'user_id' => $existing_user->ID,
                    'email'   => $email,
                ), 200 );
            }

            // Case 2: no account → check for duplicate pending invite
            global $wpdb;
            $table = $wpdb->prefix . BYS_GROUPS_INVITES_TABLE;

            $existing = $wpdb->get_var( $wpdb->prepare(
                "SELECT id FROM {$table} WHERE group_id = %d AND email = %s AND status = 'pending'",
                $group_id, $email
            ) );

            if ( $existing ) {
                return new \WP_REST_Response( array( 'error' => 'A pending invite already exists for this email.' ), 409 );
            }

            // Insert invite row
            $wpdb->insert( $table, array(
                'group_id'   => $group_id,
                'email'      => $email,
                'role'       => $role,
                'status'     => 'pending',
                'invited_by' => $invited_by,
                'invited_at' => current_time( 'mysql' ),
            ), array( '%d', '%s', '%s', '%s', '%d', '%s' ) );

            $invite_id = $wpdb->insert_id;

            // Send invite email (non-fatal: log failure but still return success)
            $mail_result = BYS_Groups_Invites::send_invite_email( $email, $group_id, $invited_by );
            if ( is_wp_error( $mail_result ) ) {
                error_log( '[bys-groups] Invite email failed for ' . $email . ': ' . $mail_result->get_error_message() );
            }

            return new \WP_REST_Response( array(
                'status'    => 'invited',
                'invite_id' => $invite_id,
                'email'     => $email,
            ), 201 );
        }

        /**
         * POST /groups/{group_id}/invite-bulk
         * Bulk add/invite multiple users in one request.
         *
         * Request body:
         * {
         *   "emails": ["a@example.com", "b@example.com"],
         *   "role": "learner",
         *   "dry_run": false
         * }
         *
         * Response:
         * {
         *   "enrolled": [{ "email": "a@example.com", "user_id": 5 }],
         *   "invited":  [{ "email": "b@example.com", "invite_id": 12 }],
         *   "failed":   [{ "email": "c@example.com", "reason": "..." }]
         * }
         */
        public function bulk_user_addition( $request ) {
            $group_id = intval( $request['group_id'] );
            $body     = json_decode( $request->get_body(), true );
            $emails   = isset( $body['emails'] ) && is_array( $body['emails'] ) ? $body['emails'] : array();
            $role     = in_array( $body['role'] ?? '', [ 'learner', 'leader' ], true ) ? $body['role'] : 'learner';
            $dry_run  = isset( $body['dry_run'] ) ? (bool) $body['dry_run'] : false;
            $invited_by = get_current_user_id();

            if ( ! $group_id ) {
                return new \WP_REST_Response( array( 'error' => 'Invalid group_id' ), 400 );
            }

            if ( empty( $emails ) ) {
                return new \WP_REST_Response( array( 'error' => 'No emails provided' ), 400 );
            }

            $group = get_post( $group_id );
            if ( ! $group || $group->post_type !== 'groups' ) {
                return new \WP_REST_Response( array( 'error' => 'Group not found' ), 404 );
            }

            global $wpdb;
            $table = $wpdb->prefix . BYS_GROUPS_INVITES_TABLE;

            $enrolled = array();
            $invited  = array();
            $failed   = array();

            // Sanitize and deduplicate emails
            $emails = array_unique( array_map( 'sanitize_email', $emails ) );

            foreach ( $emails as $email ) {
                // Validate email format
                if ( ! is_email( $email ) ) {
                    $failed[] = array(
                        'email'  => $email,
                        'reason' => 'Invalid email format',
                    );
                    continue;
                }

                // Case 1: user already exists → enroll directly
                $existing_user = get_user_by( 'email', $email );
                if ( $existing_user ) {
                    if ( ! $dry_run ) {
                        BYS_Groups_Invites::add_to_group( $existing_user->ID, $group_id, $role );
                    }
                    $enrolled[] = array(
                        'email'   => $email,
                        'user_id' => $existing_user->ID,
                    );
                    continue;
                }

                // Case 2: no account → check for duplicate pending invite
                $existing = $wpdb->get_var( $wpdb->prepare(
                    "SELECT id FROM {$table} WHERE group_id = %d AND email = %s AND status = 'pending'",
                    $group_id, $email
                ) );

                if ( $existing ) {
                    $failed[] = array(
                        'email'  => $email,
                        'reason' => 'Pending invite already exists',
                    );
                    continue;
                }

                // Insert invite row (or skip if dry_run)
                if ( ! $dry_run ) {
                    $wpdb->insert( $table, array(
                        'group_id'   => $group_id,
                        'email'      => $email,
                        'role'       => $role,
                        'status'     => 'pending',
                        'invited_by' => $invited_by,
                        'invited_at' => current_time( 'mysql' ),
                    ), array( '%d', '%s', '%s', '%s', '%d', '%s' ) );

                    $invite_id = $wpdb->insert_id;

                    // Send invite email (non-fatal)
                    $mail_result = BYS_Groups_Invites::send_invite_email( $email, $group_id, $invited_by );
                    if ( is_wp_error( $mail_result ) ) {
                        error_log( '[bys-groups] Invite email failed for ' . $email . ': ' . $mail_result->get_error_message() );
                    }
                } else {
                    $invite_id = 0; // Placeholder for dry_run
                }

                $invited[] = array(
                    'email'     => $email,
                    'invite_id' => $invite_id,
                );
            }

            return new \WP_REST_Response( array(
                'enrolled' => $enrolled,
                'invited'  => $invited,
                'failed'   => $failed,
            ), 200 );
        }

        /**
         * GET /groups/{group_id}/pending-invites
         * Returns all pending invite rows for the group.
         */
        public function get_pending_invites( $request ) {
            $group_id = intval( $request['group_id'] );
            if ( ! $group_id ) {
                return new \WP_REST_Response( array( 'error' => 'Invalid group_id' ), 400 );
            }

            global $wpdb;
            $table = $wpdb->prefix . BYS_GROUPS_INVITES_TABLE;

            $rows = $wpdb->get_results( $wpdb->prepare(
                "SELECT id, email, role, invited_at FROM {$table}
                 WHERE group_id = %d AND status = 'pending'
                 ORDER BY invited_at DESC",
                $group_id
            ), ARRAY_A );

            return new \WP_REST_Response( $rows ?: array(), 200 );
        }

        /**
         * POST /groups/{group_id}/invites/{invite_id}/cancel
         * Marks the invite as cancelled (deletes the row).
         */
        public function cancel_invite( $request ) {
            $group_id  = intval( $request['group_id'] );
            $invite_id = intval( $request['invite_id'] );

            if ( ! $group_id || ! $invite_id ) {
                return new \WP_REST_Response( array( 'error' => 'Invalid IDs' ), 400 );
            }

            global $wpdb;
            $table   = $wpdb->prefix . BYS_GROUPS_INVITES_TABLE;
            $deleted = $wpdb->delete(
                $table,
                array( 'id' => $invite_id, 'group_id' => $group_id ),
                array( '%d', '%d' )
            );

            if ( ! $deleted ) {
                return new \WP_REST_Response( array( 'error' => 'Invite not found' ), 404 );
            }

            return new \WP_REST_Response( array( 'success' => true ), 200 );
        }

        public function group_quiz_access($request) {
            $group_id = intval($request['group_id']);

            if (!$group_id) {
                return new \WP_REST_Response(array('error' => 'Invalid group_id'), 400 );
            }

            // GET rest method: returns all quiz access dates set for a sfwd-group
            if ('GET' === $request->get_method()) {
                $access_dates = BYS_Groups_Quiz_Access::get_group_quiz_access_dates($group_id);
                return new \WP_REST_Response($access_dates, 200);
            }

            // POST rest method: saves quiz access dates for a sfwd-group
            if ('POST' === $request->get_method()) {
                $quiz_id = intval($request->get_json_params()['quiz_id'] ?? 0);

                if (!$quiz_id) {
                    return new \WP_REST_Response(array('error' => 'Invalid quiz_id', 400));
                }

                $start = sanitize_text_field($request->get_json_params()['start'] ?? '');
                $end = sanitize_text_field($request->get_json_params()['end'] ?? '');

                BYS_Groups_Quiz_Access::save_group_quiz_access_dates($group_id, $quiz_id, $start, $end);

                return new \WP_REST_Response(array('success' => true), 200);
            }

            return new \WP_REST_Response(array('error' => 'Error executing this request.'), 405);
        }

        public function user_quiz_access($request) {
            $group_id = intval($request['group_id']);
            $user_id = intval($request['user_id']);

            if (!$group_id || !$user_id) {
                return new \WP_REST_Response(array('error' => 'Invalid group_id or user_id'), 400);
            }

            // GET rest method: returns all quiz access date overrides for a user in a group
            if ('GET' === $request->get_method()) {
                $access_dates = BYS_Groups_Quiz_Access::get_user_quiz_access_dates($user_id, $group_id);
                return new \WP_REST_Response($access_dates, 200);
            }

            // POST rest method: saves quiz access date override for a user in a group
            if ('POST' === $request->get_method()) {
                $quiz_id = intval($request->get_json_params()['quiz_id'] ?? 0);

                if (!$quiz_id) {
                    return new \WP_REST_Response(array('error' => 'Invalid quiz_id'), 400);
                }

                $start = sanitize_text_field($request->get_json_params()['start'] ?? '');
                $end = sanitize_text_field($request->get_json_params()['end'] ?? '');

                BYS_Groups_Quiz_Access::save_user_quiz_access_dates($user_id, $group_id, $quiz_id, $start, $end);

                return new \WP_REST_Response(array('success' => true), 200);
            }

            return new \WP_REST_Response(array('error' => 'Error executing this request.'), 405);
        }

        /**
         * Send group communication (emails via prompts or custom messages)
         *
         * @param WP_REST_Request $request Request object with group_id and JSON body
         * @return WP_REST_Response Response with success/error and sent_count
         */
        public function send_group_communication($request) {
            $group_id = intval($request['group_id']);

            if (!$group_id) {
                return new \WP_REST_Response(array('error' => 'Invalid group ID'), 400);
            }

            // Verify current user is logged in (mailer will check group leader permission)
            if (!get_current_user_id()) {
                return new \WP_REST_Response(array('error' => 'Not logged in'), 401);
            }

            // Parse request body — try get_json_params first, fall back to get_param
            $body = $request->get_json_params();
            if (empty($body) || !is_array($body)) {
                // Fallback for malformed JSON: attempt to parse individual params
                $body = array(
                    'prompt_type' => $request->get_param('prompt_type'),
                    'recipient_type' => $request->get_param('recipient_type'),
                    'recipient_ids' => $request->get_param('recipient_ids'),
                    'custom_subject' => $request->get_param('custom_subject'),
                    'custom_message' => $request->get_param('custom_message'),
                    'scheduled_at' => $request->get_param('scheduled_at'),
                    'condition' => $request->get_param('condition'),
                );
            }

            $prompt_type = sanitize_text_field($body['prompt_type'] ?? '');
            $recipient_type = sanitize_text_field($body['recipient_type'] ?? '');
            $recipient_ids = isset($body['recipient_ids']) && is_array($body['recipient_ids']) ? array_map('intval', $body['recipient_ids']) : array();
            $custom_subject = sanitize_text_field($body['custom_subject'] ?? '');
            $custom_message = wp_kses_post($body['custom_message'] ?? '');
            $scheduled_at = sanitize_text_field($body['scheduled_at'] ?? '');

            $condition = array();
            if ($recipient_type === 'condition' && isset($body['condition']) && is_array($body['condition'])) {
                $condition = array(
                    'type'      => sanitize_key($body['condition']['type'] ?? ''),
                    'days'      => intval($body['condition']['days'] ?? 0),
                    'course_id' => intval($body['condition']['course_id'] ?? 0),
                    'quiz_id'   => intval($body['condition']['quiz_id'] ?? 0),
                );
            }

            if (!$prompt_type || !$recipient_type) {
                return new \WP_REST_Response(array('error' => 'Missing prompt_type or recipient_type'), 400);
            }

            // For custom prompts, require both subject and message
            if ($prompt_type === 'custom' && (empty($custom_subject) || empty($custom_message))) {
                return new \WP_REST_Response(array('error' => 'Custom prompts require both subject and message'), 400);
            }

            // Conditional sends must include the snapshotted recipient_ids and a condition.type
            if ($recipient_type === 'condition') {
                if (empty($recipient_ids)) {
                    return new \WP_REST_Response(array('error' => 'Conditional send requires resolved recipients'), 400);
                }
                if (empty($condition['type'])) {
                    return new \WP_REST_Response(array('error' => 'Conditional send requires a condition type'), 400);
                }
            }

            // Use mailer class to send (includes leader and group validation)
            require_once BYS_GROUPS_PLUGIN_DIR . 'includes/classes/class-mailer.php';
            $mailer = new BYS_Groups_Mailer();

            $result = $mailer->send_group_communication(
                $group_id,
                $prompt_type,
                $recipient_type,
                $recipient_ids,
                $custom_subject,
                $custom_message,
                $scheduled_at,
                $condition
            );

            $status_code = $result['success'] ? 200 : 400;
            return new \WP_REST_Response($result, $status_code);
        }

        /**
         * Get prompt-based email template for preview in send modal
         *
         * @param WP_REST_Request $request Request with group_id and prompt_type
         * @return WP_REST_Response Response with subject, html, and plain template
         */
        public function get_email_template($request) {
            $group_id = intval($request['group_id']);
            $prompt_type = sanitize_text_field($request['prompt_type']);

            if (!$group_id || !$prompt_type) {
                return new \WP_REST_Response(array('error' => 'Missing group_id or prompt_type'), 400);
            }

            // Validate group exists
            $group = get_post($group_id);
            if (!$group || $group->post_type !== 'groups') {
                return new \WP_REST_Response(array('error' => 'Invalid group ID'), 404);
            }

            // Load template with group context
            require_once BYS_GROUPS_PLUGIN_DIR . 'includes/emails/group-comms.php';

            $email = bys_get_comm_email($prompt_type, array(
                'group_name' => $group->post_title,
                'site_name' => get_bloginfo('name'),
                'site_url' => home_url(),
                'sender_email' => get_bloginfo('admin_email'),
            ));

            if (empty($email['subject']) || empty($email['html'])) {
                return new \WP_REST_Response(array('error' => 'Template not found'), 404);
            }

            return new \WP_REST_Response(array(
                'subject' => $email['subject'],
                'html' => $email['html'],
                'plain' => $email['plain'],
            ), 200);
        }

        /**
         * Fetch outbound email log from Postmark API.
         * Route: GET /bys-groups/v1/groups/{group_id}/communication-log
         *
         * @param WP_REST_Request $request
         * @return WP_REST_Response
         */
        public function get_group_communication_log($request) {

            // Validate group
            $group_id = intval($request['group_id']);
            if (!$group_id) {
                return new \WP_REST_Response(array('error' => 'Invalid group ID'), 400);
            }
            $group = get_post($group_id);
            if (!$group || $group->post_type !== 'groups') {
                return new \WP_REST_Response(array('error' => 'Group not found'), 404);
            }

            // Verify current user and if user is a group leader
            $user_id = get_current_user_id();
            if (!$user_id) {
                return new \WP_REST_Response(array('error' => 'Not logged in'), 401);
            }
            if (!$this->is_authorized_for_group($user_id, $group_id)) {
                return new \WP_REST_Response(array('error' => 'Forbidden'), 403);
            }

            // Read Postmark token
            $token = get_option('bys_postmark_token', '');
            if (empty($token)) {
                return new \WP_REST_Response(array('error' => 'Postmark token not configured'), 500);
            }

            // Parse pagination params
            $count = 25;
            $offset = max(0, intval($request->get_param('offset') ?: 0));

            // Call Postmark Messages/Outbound API (WIP non-filtered for now)
            $postmark_url = add_query_arg(
                array('count' => $count, 'offset' => $offset),
                'https://api.postmarkapp.com/messages/outbound'
            );

            $response = wp_remote_get($postmark_url, array(
                'headers' => array(
                    'X-Postmark-Server-Token' => $token,
                    'Accept' => 'application/json',
                ),
                'timeout' => 15,
                'sslverify' => true,
            ));

            // Handle errors
            if (is_wp_error($response)) {
                return new \WP_REST_Response(
                    array('error' => 'Postmark API error: ' . $response->get_error_message()),
                    500
                );
            }

            $status = wp_remote_retrieve_response_code($response);
            $body = json_decode(wp_remote_retrieve_body($response), true);

            if ($status !== 200) {
                $pm_error = isset($body['Message']) ? $body['Message'] : 'Unknown Postmark error';
                return new \WP_REST_Response(
                    array('error' => 'Postmark returned ' . $status . ': ' . $pm_error),
                    502
                );
            }

            // Extract MessageIDs for filtering by group and sender
            $postmark_ids = array_column($body['Messages'] ?? [], 'MessageID');

            if (empty($postmark_ids)) {
                return new \WP_REST_Response(
                    array('total' => 0, 'messages' => array(), 'offset' => $offset, 'count' => $count),
                    200
                );
            }

            // Query bys_group_communication_log for this group (all senders), grouped by batch_id
            // Include all emails that have been sent to Postmark (message_id IS NOT NULL)
            global $wpdb;
            $placeholders = implode(',', array_fill(0, count($postmark_ids), '%s'));
            $log_rows = $wpdb->get_results(
                $wpdb->prepare(
                    "SELECT message_id, batch_id, prompt_type, subject, delivery_status, bounce_type, sender_user_id, scheduled_at FROM {$wpdb->prefix}" . BYS_GROUPS_COMMS_TABLE . "
                     WHERE message_id IN ($placeholders)
                     AND group_id = %d
                     AND message_id IS NOT NULL",
                    array_merge($postmark_ids, array($group_id))
                ),
                ARRAY_A
            );

            // Also fetch emails still waiting to be scheduled (not yet sent to Postmark)
            $scheduled_rows = $wpdb->get_results(
                $wpdb->prepare(
                    "SELECT batch_id, prompt_type, subject, delivery_status, sender_user_id, scheduled_at, created_at FROM {$wpdb->prefix}" . BYS_GROUPS_COMMS_TABLE . "
                     WHERE group_id = %d
                     AND delivery_status = 'scheduled'
                     AND message_id IS NULL
                     ORDER BY scheduled_at DESC
                     LIMIT %d",
                    $group_id,
                    $count
                ),
                ARRAY_A
            );

            // If no sent or scheduled emails, return empty
            if (empty($log_rows) && empty($scheduled_rows)) {
                return new \WP_REST_Response(
                    array('total' => 0, 'messages' => array(), 'offset' => $offset, 'count' => $count),
                    200
                );
            }

            // Index log rows by batch_id to group them
            $batches_by_id = array();
            $postmark_msgs_by_id = array();

            // Build Postmark lookup by message_id
            foreach ((array) ($body['Messages'] ?? array()) as $msg) {
                $mid = $msg['MessageID'] ?? '';
                if (!empty($mid)) {
                    $postmark_msgs_by_id[$mid] = $msg;
                }
            }

            // Group log rows by batch_id
            foreach ($log_rows as $row) {
                $batch_id = $row['batch_id'];
                if (!isset($batches_by_id[$batch_id])) {
                    $batches_by_id[$batch_id] = array(
                        'batch_id' => $batch_id,
                        'message_ids' => array(),
                        'prompt_type' => $row['prompt_type'],
                        'subject' => $row['subject'],
                        'delivery_statuses' => array(),
                        'first_message_id' => $row['message_id'],
                        'first_postmark_msg' => null,
                        'sender_user_id' => $row['sender_user_id'],
                        'scheduled_at' => $row['scheduled_at'],
                    );
                }
                $batches_by_id[$batch_id]['message_ids'][] = $row['message_id'];
                $batches_by_id[$batch_id]['delivery_statuses'][] = $row['delivery_status'] ?? 'pending';

                // Store first postmark message for subject/sent_at
                if ($batches_by_id[$batch_id]['first_postmark_msg'] === null && isset($postmark_msgs_by_id[$row['message_id']])) {
                    $batches_by_id[$batch_id]['first_postmark_msg'] = $postmark_msgs_by_id[$row['message_id']];
                }
            }

            // Process scheduled emails
            foreach ($scheduled_rows as $row) {
                $batch_id = $row['batch_id'];
                if (!isset($batches_by_id[$batch_id])) {
                    $batches_by_id[$batch_id] = array(
                        'batch_id' => $batch_id,
                        'message_ids' => array(),
                        'prompt_type' => $row['prompt_type'],
                        'subject' => $row['subject'],
                        'delivery_statuses' => array('scheduled'),
                        'first_message_id' => null,
                        'first_postmark_msg' => null,
                        'sender_user_id' => $row['sender_user_id'],
                        'scheduled_at' => $row['scheduled_at'],
                    );
                }
            }

            // Get Postmark token for fetching live MessageEvents
            $postmark_token = get_option('bys_postmark_token', '');

            // Transform batches into response items
            $messages = array();
            foreach ($batches_by_id as $batch_id => $batch) {
                $prompt_type = $batch['prompt_type'];
                $postmark_msg = $batch['first_postmark_msg'] ?? array();
                // Use stored subject first, fall back to Postmark's subject
                $subject = !empty($batch['subject']) ? $batch['subject'] : ($postmark_msg['Subject'] ?? '(No subject)');
                $sent_at = $postmark_msg['ReceivedAt'] ?? '';
                $first_message_id = $batch['first_message_id'];

                // Determine delivery status based on all recipients in the batch
                $delivery_status = 'pending';
                $postmark_detail = null;

                // If all recipients are still scheduled, status is 'scheduled'
                if (count($batch['delivery_statuses']) > 0 &&
                    count($batch['delivery_statuses']) === count(array_filter($batch['delivery_statuses'], fn($s) => $s === 'scheduled'))) {
                    $delivery_status = 'scheduled';
                } elseif (!empty($postmark_token) && !empty($first_message_id)) {
                    // Fetch live delivery status from Postmark for the first message
                    $postmark_detail = $this->fetch_postmark_message_detail($first_message_id, $postmark_token);
                    if ($postmark_detail && isset($postmark_detail['MessageEvents'])) {
                        $status_info = $this->extract_delivery_status_from_events($postmark_detail['MessageEvents']);
                        $delivery_status = $status_info['status'];
                    } else {
                        // If live fetch failed, fall back to aggregate of DB delivery_statuses
                        if (!empty($batch['delivery_statuses'])) {
                            if (in_array('bounced', $batch['delivery_statuses'])) {
                                $delivery_status = 'bounced';
                            } elseif (in_array('spam', $batch['delivery_statuses'])) {
                                $delivery_status = 'spam';
                            } elseif (in_array('scheduled', $batch['delivery_statuses'])) {
                                // Some are still scheduled, some may be sent
                                $delivery_status = 'pending';
                            } elseif (!in_array('pending', $batch['delivery_statuses'])) {
                                $delivery_status = 'delivered';
                            }
                        }
                    }
                }

                // If subject still empty, try to get it from the detail fetch
                if ($subject === '(No subject)' && !empty($postmark_detail['Subject'])) {
                    $subject = $postmark_detail['Subject'];
                }

                // Also use ReceivedAt from the detail if not already set
                if (empty($sent_at) && !empty($postmark_detail['ReceivedAt'])) {
                    $sent_at = $postmark_detail['ReceivedAt'];
                }

                // For scheduled emails, use scheduled_at; otherwise use sent_at
                // Convert UTC to local time for display
                $display_time = $delivery_status === 'scheduled' ? $this->utc_to_local_datetime($batch['scheduled_at']) : $sent_at;

                $messages[] = array(
                    'batch_id' => $batch_id,
                    'message_id' => $first_message_id,
                    'subject' => $subject,
                    'sent_at' => $display_time,
                    'prompt_type' => $prompt_type,
                    'badge_type' => $prompt_type === 'custom' ? 'custom' : 'prompt',
                    'recipient_count' => count($batch['message_ids']),
                    'delivery_status' => $delivery_status,
                    'sender_user_id' => $batch['sender_user_id'],
                );
            }

            // Return response with filtered count
            return new \WP_REST_Response(array(
                'total' => count($messages),
                'messages' => $messages,
                'offset' => $offset,
                'count' => $count,
            ), 200);
        }

        /**
         * Handle Postmark webhook events (Delivery, Bounce, SpamComplaint)
         *
         * @param WP_REST_Request $request
         * @return WP_REST_Response Always returns 200 (Postmark expects this for any response)
         */
        public function handle_postmark_webhook($request) {
            // Validate Postmark token in header
            $postmark_token = get_option('bys_postmark_token', '');
            if (empty($postmark_token)) {
                // No token configured, but still return 200 so Postmark doesn't retry
                return new \WP_REST_Response(array('ok' => false, 'reason' => 'token_not_configured'), 200);
            }

            $request_token = $request->get_header('X-Postmark-Server-Token');
            if ($request_token !== $postmark_token) {
                // Invalid token, but still return 200 (security: don't reveal token mismatch)
                return new \WP_REST_Response(array('ok' => false, 'reason' => 'invalid_token'), 200);
            }

            // Parse webhook body
            $body = $request->get_json_params();
            if (empty($body)) {
                return new \WP_REST_Response(array('ok' => true), 200);
            }

            $record_type = $body['RecordType'] ?? '';
            $message_id = $body['MessageID'] ?? '';

            if (empty($record_type) || empty($message_id)) {
                return new \WP_REST_Response(array('ok' => true), 200);
            }

            global $wpdb;
            $update_data = array();
            $update_format = array();

            // Map Postmark events to delivery status
            switch ($record_type) {
                case 'Delivery':
                    $update_data['delivery_status'] = 'delivered';
                    $update_data['delivered_at'] = current_time('mysql');
                    $update_format = array('%s', '%s');
                    break;

                case 'Bounce':
                    $update_data['delivery_status'] = 'bounced';
                    $bounce_type = $body['Details']['BounceType'] ?? 'unknown';
                    $update_data['bounce_type'] = $bounce_type;
                    $update_data['delivered_at'] = current_time('mysql');
                    $update_format = array('%s', '%s', '%s');
                    break;

                case 'SpamComplaint':
                    $update_data['delivery_status'] = 'spam';
                    $update_data['delivered_at'] = current_time('mysql');
                    $update_format = array('%s', '%s');
                    break;

                default:
                    // Unknown record type, acknowledge but don't process
                    return new \WP_REST_Response(array('ok' => true), 200);
            }

            // Update the communication log — only update if new status is "better" (not a downgrade)
            if (!empty($update_data)) {
                // Get current status
                $current_row = $wpdb->get_row(
                    $wpdb->prepare(
                        "SELECT delivery_status FROM {$wpdb->prefix}" . BYS_GROUPS_COMMS_TABLE . " WHERE message_id = %s",
                        $message_id
                    ),
                    ARRAY_A
                );

                $current_status = $current_row['delivery_status'] ?? 'pending';
                $new_status = $update_data['delivery_status'] ?? '';

                // Status hierarchy: pending < delivered < bounced/spam
                // Only update if new status is "better" or equal
                $status_order = array('pending' => 0, 'delivered' => 1, 'bounced' => 2, 'spam' => 2);
                $current_rank = $status_order[$current_status] ?? 0;
                $new_rank = $status_order[$new_status] ?? 0;

                // Only update if new status has higher or equal rank (no downgrade)
                if ($new_rank >= $current_rank) {
                    $wpdb->update(
                        $wpdb->prefix . BYS_GROUPS_COMMS_TABLE,
                        $update_data,
                        array('message_id' => $message_id),
                        $update_format,
                        array('%s')
                    );
                }
            }

            // Always return 200 so Postmark knows we got the webhook
            return new \WP_REST_Response(array('ok' => true), 200);
        }

        /**
         * Get all recipients in a batch send by batch_id
         *
         * @param WP_REST_Request $request Request with batch_id
         * @return WP_REST_Response Response with recipient list
         */
        public function get_communication_recipients($request) {
            $batch_id = sanitize_text_field($request['batch_id']);
            $user_id = get_current_user_id();

            if (empty($batch_id)) {
                return new \WP_REST_Response(array('error' => 'Missing batch_id'), 400);
            }

            if (!$user_id) {
                return new \WP_REST_Response(array('error' => 'Not logged in'), 401);
            }

            global $wpdb;

            // Query all rows for this batch (all leaders in the group can view)
            $rows = $wpdb->get_results(
                $wpdb->prepare(
                    "SELECT message_id, recipient_email, delivery_status, bounce_type, group_id
                     FROM {$wpdb->prefix}" . BYS_GROUPS_COMMS_TABLE . "
                     WHERE batch_id = %s",
                    $batch_id
                ),
                ARRAY_A
            );

            if (empty($rows)) {
                return new \WP_REST_Response(array('error' => 'Batch not found'), 404);
            }

            // Get Postmark token for fetching live status
            $postmark_token = get_option('bys_postmark_token', '');

            // Resolve recipient emails to display names and fetch live delivery status
            $recipients = array();
            foreach ($rows as $row) {
                $user = get_user_by('email', $row['recipient_email']);
                $display_name = $user ? ($user->display_name ?: $user->user_login) : $row['recipient_email'];

                // Get live delivery status from Postmark MessageEvents if token is available
                $delivery_status = $row['delivery_status'] ?? 'pending';
                $bounce_type = $row['bounce_type'];

                if (!empty($postmark_token)) {
                    $pm_detail = $this->fetch_postmark_message_detail($row['message_id'], $postmark_token);
                    if ($pm_detail && !empty($pm_detail['MessageEvents'])) {
                        // Parse MessageEvents to get current delivery status
                        $status_info = $this->extract_delivery_status_from_events($pm_detail['MessageEvents']);
                        $delivery_status = $status_info['status'];
                        $bounce_type = $status_info['bounce_type'];
                    }
                }

                $recipients[] = array(
                    'message_id' => $row['message_id'],
                    'recipient_name' => $display_name,
                    'recipient_email' => $row['recipient_email'],
                    'delivery_status' => $delivery_status,
                    'bounce_type' => $bounce_type,
                );
            }

            return new \WP_REST_Response($recipients, 200);
        }

        /**
         * Fetch message details from Postmark API
         *
         * @param string $message_id Postmark MessageID
         * @param string $postmark_token Server token
         * @return array|null Decoded response or null on error
         */
        private function fetch_postmark_message_detail($message_id, $postmark_token) {
            $url = "https://api.postmarkapp.com/messages/outbound/{$message_id}/details";

            $response = wp_remote_get(
                $url,
                array(
                    'headers' => array(
                        'X-Postmark-Server-Token' => $postmark_token,
                        'Accept' => 'application/json',
                    ),
                    'timeout' => 10,
                    'sslverify' => true,
                )
            );

            if (is_wp_error($response)) {
                error_log("[fetch_postmark_message_detail] WP Error for message_id $message_id: " . $response->get_error_message());
                return null;
            }

            $status = wp_remote_retrieve_response_code($response);
            if ($status !== 200) {
                $body = wp_remote_retrieve_body($response);
                error_log("[fetch_postmark_message_detail] Status $status for message_id $message_id: $body");
                return null;
            }

            $body = wp_remote_retrieve_body($response);
            $decoded = json_decode($body, true);

            if (!$decoded) {
                error_log("[fetch_postmark_message_detail] Failed to decode JSON for message_id $message_id");
                return null;
            }

            return $decoded;
        }

        /**
         * Extract delivery status from MessageEvents array
         *
         * @param array $events MessageEvents array from Postmark
         * @return array With 'status' and 'bounce_type' keys
         */
        private function extract_delivery_status_from_events($events) {
            $status = 'pending';
            $bounce_type = null;

            if (empty($events) || !is_array($events)) {
                return array('status' => $status, 'bounce_type' => $bounce_type);
            }

            // Find the latest event of each type
            $events_by_type = array();
            foreach ($events as $event) {
                $type = $event['Type'] ?? '';
                $received_at = $event['ReceivedAt'] ?? '';
                if (!empty($type)) {
                    if (!isset($events_by_type[$type]) || $received_at > $events_by_type[$type]['ReceivedAt']) {
                        $events_by_type[$type] = $event;
                    }
                }
            }

            // Determine status (priority order)
            if (isset($events_by_type['Bounced'])) {
                $status = 'bounced';
                $bounce_type = $events_by_type['Bounced']['Details']['Summary'] ?? 'unknown';
            } elseif (isset($events_by_type['SubscriptionChanged'])) {
                $status = 'spam';
            } elseif (isset($events_by_type['Delivered'])) {
                $status = 'delivered';
            } elseif (isset($events_by_type['Opened']) || isset($events_by_type['LinkClicked'])) {
                $status = 'delivered'; // Opened/clicked implies delivered
            } elseif (isset($events_by_type['Transient'])) {
                $status = 'pending'; // Temporary failure
            }

            return array('status' => $status, 'bounce_type' => $bounce_type);
        }

        /**
         * Get detail for a single message (email body from Postmark)
         *
         * @param WP_REST_Request $request Request with message_id
         * @return WP_REST_Response Response with message detail
         */
        public function get_communication_detail($request) {
            $message_id = sanitize_text_field($request['message_id']);
            $user_id = get_current_user_id();

            if (empty($message_id)) {
                return new \WP_REST_Response(array('error' => 'Missing message_id'), 400);
            }

            if (!$user_id) {
                return new \WP_REST_Response(array('error' => 'Not logged in'), 401);
            }

            global $wpdb;

            // Look up message in DB
            $msg_row = $wpdb->get_row(
                $wpdb->prepare(
                    "SELECT recipient_email, delivery_status, bounce_type, sender_user_id
                     FROM {$wpdb->prefix}" . BYS_GROUPS_COMMS_TABLE . "
                     WHERE message_id = %s",
                    $message_id
                ),
                ARRAY_A
            );

            if (!$msg_row) {
                return new \WP_REST_Response(array('error' => 'Message not found'), 404);
            }

            // Get Postmark token
            $postmark_token = get_option('bys_postmark_token', '');
            if (empty($postmark_token)) {
                return new \WP_REST_Response(array('error' => 'Postmark token not configured'), 500);
            }

            // Fetch message details from Postmark
            $postmark_body = $this->fetch_postmark_message_detail($message_id, $postmark_token);

            if (!$postmark_body) {
                error_log("[get_communication_detail] Failed to fetch Postmark details for message_id: $message_id");
                return new \WP_REST_Response(array('error' => 'Failed to fetch message details from Postmark'), 502);
            }

            // Parse MessageEvents from Postmark to get latest delivery status
            $delivery_status = $msg_row['delivery_status'] ?? 'pending';
            $bounce_type = $msg_row['bounce_type'];
            $delivered_at = null;

            if (!empty($postmark_body['MessageEvents']) && is_array($postmark_body['MessageEvents'])) {
                // Use helper to extract status from events
                $status_info = $this->extract_delivery_status_from_events($postmark_body['MessageEvents']);
                $delivery_status = $status_info['status'];
                $bounce_type = $status_info['bounce_type'];

                // Get delivered_at from the latest event
                $events_by_type = array();
                foreach ($postmark_body['MessageEvents'] as $event) {
                    $type = $event['Type'] ?? '';
                    $received_at = $event['ReceivedAt'] ?? '';
                    if (!empty($type)) {
                        if (!isset($events_by_type[$type]) || $received_at > $events_by_type[$type]['ReceivedAt']) {
                            $events_by_type[$type] = $event;
                        }
                    }
                }

                // Get ReceivedAt from the most relevant event
                if (isset($events_by_type['Delivered'])) {
                    $delivered_at = $events_by_type['Delivered']['ReceivedAt'] ?? null;
                } elseif (isset($events_by_type['Opened'])) {
                    $delivered_at = $events_by_type['Opened']['ReceivedAt'] ?? null;
                } elseif (isset($events_by_type['Bounced'])) {
                    $delivered_at = $events_by_type['Bounced']['ReceivedAt'] ?? null;
                }
            }

            // Resolve recipient email to display name
            $user = get_user_by('email', $msg_row['recipient_email']);
            $display_name = $user ? ($user->display_name ?: $user->user_login) : $msg_row['recipient_email'];

            // Clean HTML body: remove meta tags, style tags, and excess whitespace
            $html_body = $postmark_body['HtmlBody'] ?? '';
            if (!empty($html_body)) {
                // Remove <meta> tags
                $html_body = preg_replace('/<meta[^>]*>/i', '', $html_body);
                // Remove <style> tags and content
                $html_body = preg_replace('/<style[^>]*>.*?<\/style>/is', '', $html_body);
                // Remove multiple consecutive whitespace (preserve single spaces)
                $html_body = preg_replace('/\s{2,}/s', ' ', $html_body);
                // Trim
                $html_body = trim($html_body);
            }

            // Build response
            $result = array(
                'message_id' => $message_id,
                'subject' => $postmark_body['Subject'] ?? '(No subject)',
                'recipient_name' => $display_name,
                'recipient_email' => $msg_row['recipient_email'],
                'delivery_status' => $delivery_status,
                'bounce_type' => $bounce_type,
                'delivered_at' => $delivered_at,
                'body_html' => $html_body,
                'body_text' => $postmark_body['TextBody'] ?? '',
            );

            return new \WP_REST_Response($result, 200);
        }

        /**
         * Convert UTC datetime string to local time for display
         *
         * @param string $utc_datetime UTC datetime in 'Y-m-d H:i:s' format
         * @return string Formatted local datetime string or empty if invalid
         */
        private function utc_to_local_datetime($utc_datetime) {
            if (empty($utc_datetime)) {
                return '';
            }

            // Parse the UTC datetime to a timestamp
            $timestamp = strtotime($utc_datetime);
            if (!$timestamp) {
                return '';
            }

            // Convert to local time using wp_date which applies site timezone
            return wp_date('Y-m-d H:i:s', $timestamp);
        }
    }
}