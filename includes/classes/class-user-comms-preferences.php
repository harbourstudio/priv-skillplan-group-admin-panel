<?php
/**
 * User group-communications preference.
 *
 * Handles `bys_groups_enable_comms` user meta
 * Gravity Forms — Form#15, Field#6 checkbox → user meta.
 * Checked = opt in ('1'); unchecked = opt out ('0').
 * Missing meta is treated as opted-in. Site transactional email (wp password reset,
 * invites) is NOT gated by this preference.
 *
 * @package BYS_Groups
 */

if (!defined('ABSPATH')) exit;

const BYS_GROUPS_COMMS_META_KEY = 'bys_groups_enable_comms';

/**
 * Whether $user_id may receive plugin-generated group communications.
 *
 * Consulted by every Postmark send path (broadcasts, quiz-access
 * notifications, etc.). Missing meta = opted in, so pre-existing users
 * keep receiving emails until an explicitly opt out via Form #15.
 *
 * @param integer $user_id
 * @return boolean
 */
function bys_groups_user_can_receive_comms($user_id) {
    if (!$user_id) {
        return false;
    }

    $val = get_user_meta($user_id, BYS_GROUPS_COMMS_META_KEY, true);
    
    return $val === '' || $val === '1' || $val === 1 || $val === true;
}

/**
 * Write the opt-in/opt-out preference for $user_id.
 *
 * Stored as the string '1' or '0' to match how the GF checkbox
 * submission is normalised and what bys_groups_user_can_receive_comms()
 * expects on read.
 *
 * @param integer $user_id
 * @param boolean $enabled
 * @return void
 */
function bys_groups_set_user_comms_enabled($user_id,$enabled): void {
    update_user_meta($user_id, BYS_GROUPS_COMMS_META_KEY, $enabled ? '1' : '0');
}

if (!class_exists('BYS_Groups_User_Comms_Preferences')) {
    class BYS_Groups_User_Comms_Preferences {

        const FORM_ID  = 15;
        const FIELD_ID = 6;

        public function __construct() {
            add_action('gform_after_submission_' . self::FORM_ID, [$this, 'save_preference'], 10, 2);
            add_filter('gform_field_content_' . self::FORM_ID . '_' . self::FIELD_ID, [$this, 'prefill_consent'], 10, 5);
        }

        /**
         * Persist the Form #15 consent submission to user meta.
         *
         * @param array $entry Gravity Forms entry.
         * @param array $form  Gravity Forms form definition (unused).
         * @return void
         */
        public function save_preference($entry, $form) {
            $user_id = (int) rgar($entry, 'created_by');
            if (!$user_id) {
                $user_id = get_current_user_id();
            }
            if (!$user_id) return;

            $raw = rgar($entry, self::FIELD_ID . '.1');
            $enabled = ($raw !== '' && $raw !== null);
            bys_groups_set_user_comms_enabled($user_id, $enabled);
        }

        /**
         * Render the consent checkbox pre-checked when the current user
         * is opted in.
         *
         * GF Consent fields have no built-in prefill (they're designed
         * for legal consent, which is meant to be affirmed each time),
         * so we inject `checked` into the rendered <input> HTML via the
         * gform_field_content filter. Missing meta is treated as opted
         * in — matches bys_groups_user_can_receive_comms() semantics —
         * so the box appears checked by default for users who have
         * never submitted the form.
         *
         * @param string $field_content Rendered field HTML.
         * @param object $field         GF field object.
         * @param mixed  $value         Submitted value (unused).
         * @param int    $lead_id       Entry id (unused).
         * @param int    $form_id       Form id (unused).
         * @return string
         */
        public function prefill_consent($field_content, $field, $value, $lead_id, $form_id) {
            $user_id = get_current_user_id();
            if (!$user_id) return $field_content;
            if (!bys_groups_user_can_receive_comms($user_id)) return $field_content;

            return preg_replace(
                '/(<input\b[^>]*\bname=[\'"]input_' . self::FIELD_ID . '\.1[\'"][^>]*?)(\s*\/?>)/i',
                '$1 checked=\'checked\'$2',
                $field_content,
                1
            );
        }
    }
}
