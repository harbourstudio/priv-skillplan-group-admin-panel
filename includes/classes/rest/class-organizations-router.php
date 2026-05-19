<?php
/**
 * Organizations Router
 *
 * Endpoints for managing organizations and their groups:
 *   POST /organizations                       — create a new organization (site admin only)
 *   POST /organizations/{org_id}/groups       — create a new LD group under an organization
 *                                                (site admin OR admin of the organization)
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
            register_rest_route(BYS_Groups_Core::REST_NAMESPACE, '/organizations', [
                'methods'             => WP_REST_Server::CREATABLE,
                'callback'            => [$this, 'create_organization'],
                'permission_callback' => [BYS_Groups_Permissions::class, 'is_site_admin'],
            ]);

            register_rest_route(BYS_Groups_Core::REST_NAMESPACE, '/organizations/(?P<org_id>\d+)/groups', [
                'methods'             => WP_REST_Server::CREATABLE,
                'callback'            => [$this, 'create_organization_group'],
                'permission_callback' => fn($request) => BYS_Groups_Permissions::is_org_admin($request['org_id']),
            ]);
        }

        // ─── REST callbacks ─────────────────────────────────────────────────

        /**
         * POST /organizations
         * Creates a new organization post.
         */
        public function create_organization($request) {
            $name = sanitize_text_field($request->get_param('name'));
            if (empty($name)) return BYS_Groups_Response::bad_request('Organization name is required');

            $org_id = wp_insert_post([
                'post_type'   => 'organization',
                'post_status' => 'publish',
                'post_title'  => $name,
                'post_author' => get_current_user_id(),
            ], true);

            if (is_wp_error($org_id)) return BYS_Groups_Response::server_error($org_id->get_error_message());

            return BYS_Groups_Response::success([
                'id'              => $org_id,
                'name'            => get_the_title($org_id),
                'is_admin'        => true,
                'groups'          => [],
                'archived_groups' => [],
            ], 201);
        }

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
                return BYS_Groups_Response::not_found('Organization not found');
            }

            $name = sanitize_text_field($request->get_param('name'));
            if (empty($name)) return BYS_Groups_Response::bad_request('Group name is required');

            $user_id = get_current_user_id();

            $group_id = wp_insert_post([
                'post_type'   => 'groups',
                'post_status' => 'publish',
                'post_title'  => $name,
                'post_author' => $user_id,
            ], true);

            if (is_wp_error($group_id)) return BYS_Groups_Response::server_error($group_id->get_error_message());

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

            return BYS_Groups_Response::success([
                'id'   => $group_id,
                'name' => get_the_title($group_id),
            ], 201);
        }
    }
}
