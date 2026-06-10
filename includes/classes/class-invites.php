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

        public function __construct() {
            add_action( 'user_register', array( $this, 'handle_registration' ), 10, 1 );
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

                self::add_to_group( $user_id, $group_id, $role );

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
         * role = 'learner' → standard group-member enrollment only
         * role = 'leader'  → group-leader assignment only
         */
        public static function add_to_group( int $user_id, int $group_id, string $role = 'learner' ): void {
            if ( $role === 'leader' ) {
                $leaders   = (array) get_post_meta( $group_id, 'learndash_group_leaders', true );
                $leaders[] = $user_id;
                update_post_meta( $group_id, 'learndash_group_leaders', array_unique( $leaders ) );
                update_user_meta( $user_id, "learndash_group_leaders_{$group_id}", $group_id );
                return;
            }

            // Default: learner / group-member enrollment.
            ld_update_group_access( $user_id, $group_id, false );
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
            $register_url   = home_url( '/register/' );

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
