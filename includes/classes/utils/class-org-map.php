<?php
/**
 * Organization relationship map.
 *
 * One cached snapshot of every published organization's relationships —
 * groups, landers, administrators, users — plus its title, so permission
 * checks and org/lander resolution are in-memory array lookups instead of
 * a get_posts + per-org ACF field scan repeated on every call.
 *
 * Caching strategy (mirrors the theme's twh_nav_landers cache):
 *   1. Per-request static memo.
 *   2. Transient (12h TTL) — rides the persistent object cache when one
 *      is enabled, falls back to the options table otherwise.
 *   3. Invalidated on any organization save/trash/delete AND on direct
 *      postmeta writes to the relationship keys (update_field() calls in
 *      class-organization.php and class-organizations-router.php bypass
 *      save_post, so meta-level hooks are required).
 *
 * Field values are read as raw postmeta (ACF stores relationship/user
 * fields as arrays of IDs), so building the map never triggers ACF's
 * formatting layer or its per-field post hydration queries.
 *
 * @package BYS_Groups
 */
if (!defined('ABSPATH')) exit;

if (!class_exists('BYS_Groups_Org_Map')) {
    class BYS_Groups_Org_Map {

        const TRANSIENT = 'bys_org_map_v1';
        const TTL       = 12 * HOUR_IN_SECONDS;

        /** ACF field names on the organization CPT that feed the map. */
        const RELATION_KEYS = ['groups', 'landers', 'administrators', 'users'];

        /** @var array|null Per-request memo. */
        private static $map = null;

        // ── Invalidation ────────────────────────────────────────────────────

        public static function register_invalidation_hooks() {
            add_action('save_post_organization', [__CLASS__, 'flush']);
            add_action('acf/save_post',          [__CLASS__, 'flush_if_org']);
            add_action('wp_trash_post',          [__CLASS__, 'flush_if_org']);
            add_action('untrashed_post',         [__CLASS__, 'flush_if_org']);
            add_action('deleted_post',           [__CLASS__, 'flush_if_org']);

            // update_field() on an org writes postmeta without firing
            // save_post — catch those writes at the meta layer.
            add_action('added_post_meta',   [__CLASS__, 'flush_on_meta_write'], 10, 3);
            add_action('updated_postmeta',  [__CLASS__, 'flush_on_meta_write'], 10, 3);
            add_action('deleted_post_meta', [__CLASS__, 'flush_on_meta_write'], 10, 3);
        }

        public static function flush_if_org($post_id) {
            if (get_post_type($post_id) === 'organization') {
                self::flush();
            }
        }

        /**
         * @param int|array $meta_id  Unused (deleted_post_meta passes an array).
         * @param int       $post_id
         * @param string    $meta_key
         */
        public static function flush_on_meta_write($meta_id, $post_id, $meta_key) {
            if (!in_array($meta_key, self::RELATION_KEYS, true)) return;
            if (get_post_type($post_id) !== 'organization') return;
            self::flush();
        }

        public static function flush() {
            self::$map = null;
            delete_transient(self::TRANSIENT);
        }

        // ── Map access ──────────────────────────────────────────────────────

        /**
         * Full map shape:
         *   orgs           => [org_id => [title, groups[], landers[], admins[], users[]]]
         *   group_to_orgs  => [group_id  => [org_id, ...]]
         *   lander_to_orgs => [lander_id => [org_id, ...]]
         *
         * Org iteration order matches get_posts' default (date DESC), the
         * same order the replaced per-callsite scans used.
         */
        public static function get_map(): array {
            if (self::$map !== null) return self::$map;

            $cached = get_transient(self::TRANSIENT);
            if (is_array($cached) && isset($cached['orgs'])) {
                return self::$map = $cached;
            }

            $map = self::build_map();
            set_transient(self::TRANSIENT, $map, self::TTL);
            return self::$map = $map;
        }

        private static function build_map(): array {
            $map = ['orgs' => [], 'group_to_orgs' => [], 'lander_to_orgs' => []];

            $orgs = get_posts([
                'post_type'      => 'organization',
                'post_status'    => 'publish',
                'posts_per_page' => -1,
            ]);
            if (empty($orgs)) return $map;

            update_postmeta_cache(wp_list_pluck($orgs, 'ID'));

            foreach ($orgs as $org) {
                $org_id = (int) $org->ID;
                $entry  = [
                    'title'   => $org->post_title,
                    'groups'  => self::ids_from_meta($org_id, 'groups'),
                    'landers' => self::ids_from_meta($org_id, 'landers'),
                    'admins'  => self::ids_from_meta($org_id, 'administrators'),
                    'users'   => self::ids_from_meta($org_id, 'users'),
                ];
                $map['orgs'][$org_id] = $entry;

                foreach ($entry['groups'] as $gid) {
                    $map['group_to_orgs'][$gid][] = $org_id;
                }
                foreach ($entry['landers'] as $lid) {
                    $map['lander_to_orgs'][$lid][] = $org_id;
                }
            }

            return $map;
        }

        /**
         * Read a relationship/user field's raw stored value straight from
         * postmeta. ACF stores these as arrays of ID strings (or a single
         * ID when the field isn't multiple).
         */
        private static function ids_from_meta($org_id, $key): array {
            $raw = get_post_meta($org_id, $key, true);
            if (empty($raw)) return [];

            $ids = [];
            foreach ((array) $raw as $value) {
                if ($value instanceof WP_Post) {
                    $id = (int) $value->ID;
                } elseif (is_object($value)) {
                    $id = isset($value->ID) ? (int) $value->ID : 0;
                } else {
                    $id = (int) $value;
                }
                if ($id > 0) $ids[] = $id;
            }
            return array_values(array_unique($ids));
        }

        // ── Lookups ─────────────────────────────────────────────────────────

        /** @return int[] Published organization IDs (date DESC). */
        public static function all_org_ids(): array {
            return array_keys(self::get_map()['orgs']);
        }

        /** @return array|null [title, groups[], landers[], admins[], users[]] */
        public static function org_entry(int $org_id): ?array {
            return self::get_map()['orgs'][$org_id] ?? null;
        }

        /** @return int[] Org IDs whose 'groups' field contains this group. */
        public static function orgs_for_group(int $group_id): array {
            return self::get_map()['group_to_orgs'][$group_id] ?? [];
        }

        /** @return int[] Org IDs whose 'landers' field contains this lander. */
        public static function orgs_for_lander(int $lander_id): array {
            return self::get_map()['lander_to_orgs'][$lander_id] ?? [];
        }

        public static function org_group_ids(int $org_id): array {
            return self::get_map()['orgs'][$org_id]['groups'] ?? [];
        }

        public static function org_lander_ids(int $org_id): array {
            return self::get_map()['orgs'][$org_id]['landers'] ?? [];
        }

        public static function org_admin_ids(int $org_id): array {
            return self::get_map()['orgs'][$org_id]['admins'] ?? [];
        }

        public static function org_user_ids(int $org_id): array {
            return self::get_map()['orgs'][$org_id]['users'] ?? [];
        }

        /**
         * True when the user is listed in the org's 'administrators' field.
         * A hit implies the org exists and is published — the map only
         * contains published organizations.
         */
        public static function is_user_org_admin(int $org_id, int $user_id): bool {
            return $user_id > 0 && in_array($user_id, self::org_admin_ids($org_id), true);
        }
    }
}
