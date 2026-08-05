<?php
/**
 * Group Invite Management
 *
 * Handles sending invitations, the user_register hook that auto-enrolls
 * invited users when they complete registration, and helper utilities.
 *
 * @package BYS_Groups
 */

if ( ! defined( 'ABSPATH' ) ) exit;

if ( ! class_exists( 'BYS_Groups_Invites' ) ) {
    class BYS_Groups_Invites {

        /**
         * Groups this request has already assigned as leader, keyed by user_id.
         * Populated by handle_registration, drained by reapply_leader_assignments.
         * Kept in-memory so the reapply step needs no extra DB query.
         *
         * @var array<int, int[]>
         */
        private $pending_leader_reapply = array();

        public function __construct() {
            add_action( 'user_register', array( $this, 'handle_registration' ), 10, 1 );
            // GF User Registration calls wp_update_user() inside its create_user()
            // AFTER user_register fires, which invokes set_role() and wipes any addiitonal role assigned 
            // (and leaves the leader user_meta in an inconsistent state). gform_user_registered fires
            // after GF is done mutating the user, so rehydrate the leader role + meta here
            add_action('gform_user_registered', array($this, 'reapply_leader_assignments'), 20, 1);
        }

        /**
         * Reapplies leader-role + meta for groups this request already
         * assigned via handle_registration. Runs after GF's wp_update_user in
         * the same request; no-op if queue is empty.
         */
        public function reapply_leader_assignments(int $user_id): void {
            if (empty($this->pending_leader_reapply[$user_id])) return;

            foreach ($this->pending_leader_reapply[$user_id] as $gid) {
                self::add_to_group( $user_id, $gid, 'leader', true );
            }
            unset($this->pending_leader_reapply[$user_id]);
        }

        /**
         * Fires on user_register. Looks for any pending invites matching
         * the new user's email and auto-enrolls them into each group.
         */
        public function handle_registration( int $user_id ): void {
            $user = get_userdata( $user_id );
            if ( ! $user ) return;

            global $wpdb;
            $table = $wpdb->prefix . BYS_GROUPS_INVITES_TABLE;

            $invites = $wpdb->get_results( $wpdb->prepare(
                "SELECT * FROM {$table} WHERE email = %s AND status = 'pending'",
                $user->user_email
            ) );

            if ( empty( $invites ) ) return;

            foreach ( $invites as $invite ) {
                $group_id = intval( $invite->group_id );
                $role     = $invite->role;

                // Fresh-registration context: for leader invites, swap the GF-assigned role 
                // from the User Registration feed with group_leader
                self::add_to_group($user_id, $group_id, $role, $role === 'leader');

                if ($role === 'leader') {
                    $this->pending_leader_reapply[$user_id][] = $group_id;
                }

                $wpdb->update(
                    $table,
                    array(
                        'status'      => 'enrolled',
                        'enrolled_at' => current_time( 'mysql' ),
                        'user_id'     => $user_id,
                    ),
                    array( 'id' => intval( $invite->id ) ),
                    array( '%s', '%s', '%d' ),
                    array( '%d' )
                );
            }
        }

        /**
         * Add a user to a LearnDash group with the given role.
         *
         * $replace_role only applies to the leader path:
         * false (default): add group_leader alongside the user's existing roles.
         * true: swap the user's roles for group_leader role only.
         */
        public static function add_to_group(int $user_id, int $group_id, string $role = 'learner', bool $replace_role = false): void {
            if ($role === 'leader') {
                // LD's programmatic API only writes the learndash_group_leaders_{group_id}
                // user_meta and fires an action. In particular it does NOT
                // assign the WP group_leader role, which LD's own leader-detection
                // (learndash_is_group_leader_user → user_can) requires.
                if (function_exists('ld_update_leader_group_access')) {
                    ld_update_leader_group_access($user_id, $group_id, false);
                }
                $user = new \WP_User($user_id);
                if (!$user->exists()) return;

                if ($replace_role) {
                    if(array('group_leader') !== (array) $user->roles) {
                        $user->set_role('group_leader');
                    }
                } elseif (!in_array('group_leader', (array) $user->roles, true)) {
                    $user->add_role('group_leader');
                }
                return;
            }

            // Default: learner / group-member enrollment.
            ld_update_group_access($user_id, $group_id, false);
        }

        /**
         * Send an invite email to $email for $group_id.
         * Returns true on success, WP_Error on failure.
         */
        public static function send_invite_email( string $email, int $group_id, int $invited_by_user_id ): bool|\WP_Error {
            require_once BYS_GROUPS_PLUGIN_DIR . 'includes/emails/invite.php';

            $group          = get_post( $group_id );
            $group_name     = $group ? $group->post_title : 'the group';
            $inviter        = get_userdata( $invited_by_user_id );
            $invited_by     = $inviter ? $inviter->display_name : get_bloginfo( 'name' );
            $site_name      = get_bloginfo( 'name' );
            $site_url       = home_url();
            // Use the org-specific registration URL if this group belongs to an org.
            $register_url = home_url( '/register/' );
            if ( function_exists( 'get_field' ) ) {
                $orgs = get_posts( [
                    'post_type'      => 'organization',
                    'post_status'    => 'publish',
                    'posts_per_page' => -1,
                    'fields'         => 'ids',
                ] );
                foreach ( $orgs as $oid ) {
                    $org_group_ids = array_map(
                        fn( $g ) => $g instanceof \WP_Post ? $g->ID : intval( $g ),
                        (array) get_field( 'groups', $oid )
                    );
                    if ( in_array( $group_id, $org_group_ids, true ) ) {
                        $org_slug     = get_post_field( 'post_name', $oid );
                        $register_url = home_url( '/register/?organization=' . rawurlencode( $org_slug ) );
                        break;
                    }
                }
            }

            $email_data = bys_get_invite_email( $group_name, $register_url, $invited_by, $site_name, $site_url );

            // Send as HTML. From header forces wp_mail to use the configured
            // Postmark sender signature instead of WordPress' default
            // (wordpress@<host>), which Postmark would reject as unverified.
            $from_email = BYS_Groups_Postmark::get_from_email();
            $headers    = array(
                'Content-Type: text/html; charset=UTF-8',
                'From: ' . $site_name . ' <' . $from_email . '>',
            );

            $sent = wp_mail( $email, $email_data['subject'], $email_data['html'], $headers );

            if ( ! $sent ) {
                return new \WP_Error( 'mail_failed', 'wp_mail() returned false — check your mail configuration.' );
            }

            return true;
        }
    }
}
