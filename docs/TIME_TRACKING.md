# Time Tracking


Measures how much active time each learner spends on LearnDash content pages (courses, lessons, topics, quizzes), stores per-post cumulative seconds in a dedicated table.

Replaces the previous approach of relying on Uncanny Course Timer meta + a fallback in the reporting endpoint.


## At a glance

```
Learner opens an LD content page
  │
  ├─ class-time-tracking.php enqueues time-tracking.js + CSS
  │  and emits window.bysTimeTracking config (rest URL, IDs, intervals)
  │
  ▼
time-tracking.js runs in the browser
  │
  ├─ Counts active seconds while tab is visible and user is not idle 
  ├─ Every [updateInterval] seconds → POSTs delta to the REST endpoint
  ├─ On tab hide/close → sendBeacon flushes remaining delta
  ├─ On idleThreshold reached → shows idle modal that checks in with the user
  │
  ▼
POST /wp-json/bys-groups/v1/me/time-tracking
class-time-tracking-router.php
  │
  ├─ Validates payload
  ├─ Throttles (rejects if last write for this row was too recent)
  ├─ Caps delta (rejects payloads larger than interval + 30s)
  ├─ INSERT ... ON DUPLICATE KEY UPDATE
  │
  ▼
{prefix}bys_groups_time_tracking table
  │
  │  Consumers:
  │
  ├─▶ class-users-router.php (get_user_course_steps_progress)
  │   Sums tracker seconds + Tin Canny timespent → Time Spent column
  │
  └─▶ [bys_time_tracking_total user_id="X"] shortcode
      Sums all tracker seconds for a user → Total Time widget
```


**Constants** (defined in `skillplan-bys-groups.php`):
- `BYS_GROUPS_TIME_TRACKING_TABLE` — table name
- `BYS_GROUPS_TIME_TRACKING_UPDATE_INTERVAL_DEFAULT`
- `BYS_GROUPS_TIME_TRACKING_IDLE_THRESHOLD_DEFAULT`

**Wired in `class-core.php`:** `BYS_Groups_Time_Tracking` and `BYS_Groups_Time_Tracking_Router` are both instantiated on plugin init.

## Database Table

Single table, one row per `(user_id, course_id, post_id)`. Schema defined in  `class-activator.php`.

- Table name constant: `BYS_GROUPS_TIME_TRACKING_TABLE` (defined in the main plugin file).
- Composite PK mirrors Uncanny CourseTimer's legacy `uo_timer_{course_id}_{post_id}` meta-key shape for 1:1 backfill.
- Created by `dbDelta` on the `BYS_GROUPS_DB_VERSION` bump.


## Write pipeline

### Client (browser)

**File:** `assets/js/time-tracking.js` + `assets/css/time-tracking.css`

**Enqueued when:** the visitor is logged in AND page viewed is included in `LD_CONTENT_TYPES`.

- Reads config from `window.bysTimeTracking` and nonce from `window.bysGroupsAuth`.
- 1-second `setInterval` loop increments a local `activeSecondsBuffer` when the page is visible and the user has interacted within the `idleThreshold` window.
- Every `updateInterval` seconds of accumulated active time → `fetch` POST to the REST endpoint with `{course_id, post_id, delta_seconds}`.
- On `visibilitychange → hidden` or `pagehide` → `navigator.sendBeacon` flushes any unsent buffer (nonce in `?_wpnonce=` query since beacons can't set headers).
- On `idleThreshold` reached → injects an idle modal to the DOM via `.showModal()`.

### Server (REST endpoint)

**File:** `includes/classes/rest/class-time-tracking-router.php`

**Route:** `POST /wp-json/bys-groups/v1/me/time-tracking`

**Permission:** `is_user_logged_in`

**Guardrails, both derived from the current `bys_groups_time_tracking_update_interval` setting:**
- **Max delta** — reject payloads with `delta_seconds > interval + 30`. Blocks batched-replay / scripted inflation.
- **Throttle** — reject if the same `(user, course, post)` was written to within `max(15, floor(interval/2))` seconds. Returns 429 with `Retry-After`; client keeps delta in buffer and retries next cycle.

**Write:** single `INSERT ... ON DUPLICATE KEY UPDATE`. On INSERT, `first_started_gmt` and `last_updated_gmt` are set to now. On UPDATE, `seconds_total` accumulates and `last_updated_gmt` is refreshed; `first_started_gmt` is never touched after the first write.

**Response:** 204 No Content on success, 429 on throttle, 400 on validation failure.


## Read pipeline

### Reporting endpoint (Time Spent column)

**File:** `includes/classes/rest/class-users-router.php`, `get_user_course_steps_progress()`

For each step in a course, `time_spent_seconds` is computed as:

```
time_spent_seconds = bys_groups_time_tracking.seconds_total
                   + learndash_user_activity_meta.timespent  (Tin Canny)
```

- **Tracker seconds** cover parent-page interaction (topic pages, lesson pages, etc.).
- **Tin Canny seconds** cover interaction *inside* SCORM iframes, which our parent-document event listeners can't see. The two sources are complementary; overlap at the start of a SCORM session is bounded by one idle-threshold window and considered acceptable.

### Total-time shortcode

**File:** `includes/classes/class-time-tracking.php`, `shortcode_total()`

```
[bys_time_tracking_total user_id="123"]
```

- Sums `seconds_total` across every row for the given user (no course filter).
- Returns `"Xh Ym"` formatted, or empty string on invalid `user_id`.

## Configuration

**Admin page:** WP Admin → BYS Groups → "Time Tracking" section

**File:** `includes/classes/class-admin-settings.php`

```
bys_groups_time_tracking_update_interval
bys_groups_time_tracking_idle_threshold
bys_groups_time_tracking_idle_redirect_url
```

Runtime effect: settings apply to each learner on their next page load.


## Data reset

**Hook:** `personal_options_update` / `edit_user_profile_update`

When an admin ticks LD's "Delete user data" checkbox on the user profile screen, `handle_user_data_reset()` deletes all rows from `bys_groups_time_tracking` for that user. 

Guarded by:
- `manage_options` capability
- `$_POST['learndash_delete_user_data']` value equal to the user being edited


## Backfill from legacy data

Historical engagement recorded by Uncanny Course Timer lives in `usermeta` as `uo_timer_{course_id}_{post_id}` keys. To preserve that data during the cutover, a WP-CLI command (and equivalent admin button on the settings page) reads those keys and copies the accumulated seconds into `bys_groups_time_tracking`.

- Command: `wp bys-groups migrate-time-tracking [--dry-run] [--batch=<n>]`
- Idempotent via `INSERT IGNORE`.

## Known behaviors and trade-offs


- **Short-session undercount.** If a learner completes a topic in less than one `updateInterval` (default 60s), no update tick fires and the row shows `—`. LD activity row exists (drives Last Accessed and status), but there's no measured time. This is why a topic can show as "completed" with no Time Spent value.
- **Passive-reader undercount.** Idle detection depends on document events (mousemove, scroll, etc.). A learner reading a static page without moving the mouse or scrolling will be marked idle at `idleThreshold` and stop counting.
- **SCORM iframe blindness.** Interaction inside a SCORM iframe doesn't bubble to our parent-document listeners. We compensate by summing Tin Canny's `timespent` meta into the reporting endpoint.
- **Tab-abandoned overcount.** A tab that's switched to the background keeps counting until the idle threshold fires (bounded by that value). Not zeroed by the visibility change — only paused via `sendBeacon` for buffered data preservation.

## Deploy / cutover flow

1. Merge plugin PR — new tracker code deployed. Uncanny Course Timer may still be active in parallel; both write to different storage.
2. Run backfill for legacy data (either `wp bys-groups migrate-time-tracking` or the admin button on the settings page).
3. Deploy theme PR that swaps `[uo_time_total]` → `[bys_time_tracking_total]` in consumers.
4. In WP Admin → Uncanny Toolkit Pro → deactivate the Course Timer module. Only our tracker runs from that point.
5. Verify Time Spent columns populate correctly for a handful of users; verify Total Time widget matches expected values.

Legacy `uo_timer_*` usermeta stays in place as a safety net.