<?php
/**
 * Organizations Router
 *
 * Endpoints for managing organizations and their groups:
 *   POST /organizations/{org_id}/groups       — create a new LD group under an organization
 *                                                (site admin OR admin of the organization)
 *
 * Note: organization CPTs themselves are created via wp-admin, not the REST API.
 *
 * @package BYS_Groups
 * @since 1.1.0
 */
if (!defined('ABSPATH')) exit;

if (!class_exists('BYS_Groups_Organizations_Router')) {
    class BYS_Groups_Organizations_Router {

        public function __construct() {
            add_action('rest_api_init', [$this, 'register_routes']);
        }

        public function register_routes() {
            register_rest_route(BYS_Groups_Core::REST_NAMESPACE, '/organizations/(?P<org_id>\d+)/groups', [
                'methods'             => WP_REST_Server::CREATABLE,
                'callback'            => [$this, 'create_organization_group'],
                'permission_callback' => fn($request) =>
                    BYS_Groups_Permissions::is_site_admin()
                    || BYS_Groups_Permissions::is_org_admin($request['org_id']),
            ]);
        }

        // ─── REST callbacks ─────────────────────────────────────────────────

        /**
         * POST /organizations/{org_id}/groups
         * Creates a new LearnDash group, attaches it to the organization,
         * and makes the creating user a group leader.
         *
         * Authorization (in permission_callback): site admin OR admin of the org.
         */
        public function create_organization_group($request) {
            $org_id = intval($request['org_id']);
            $org    = get_post($org_id);
            if (!$org || $org->post_type !== 'organization' || $org->post_status !== 'publish') {
                return new WP_Error('not_found', 'Organization not found', ['status' => 404]);
            }

            $name = sanitize_text_field($request->get_param('name'));
            if (empty($name)) return new WP_Error('bad_request', 'Group name is required', ['status' => 400]);

            $user_id = get_current_user_id();

            $group_id = wp_insert_post([
                'post_type'   => 'groups',
                'post_status' => 'publish',
                'post_title'  => $name,
                'post_author' => $user_id,
            ], true);

            if (is_wp_error($group_id)) return new WP_Error('server_error', $group_id->get_error_message(), ['status' => 500]);

            // Make the creating user a group leader in LearnDash
            ld_update_leader_group_access($user_id, $group_id, false);

            // Append the new group to the org's ACF groups field
            $existing     = get_field('groups', $org_id);
            $existing_ids = [];
            foreach ((array) $existing as $g) {
                $existing_ids[] = $g instanceof \WP_Post ? $g->ID : intval($g);
            }
            $existing_ids[] = $group_id;
            update_field('groups', $existing_ids, $org_id);

            return new WP_REST_Response([
                'id'   => $group_id,
                'name' => get_the_title($group_id),
            ], 201);
        }
    }
}
