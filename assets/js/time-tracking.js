/**
 * BYS Groups — Time Tracking (client)
 *
 * Runs on LD content pages (course/lesson/topic/quiz) for logged-in users.
 * Accumulates active-time locally and reports it to the server every
 * `updateInterval` seconds. Pauses on tab hide and on user idle. Fires
 * the "Are you still there?" modal at the idle threshold.
 *
 * Reads config from window.bysTimeTracking (localized in class-time-tracking.php).
 * Reads nonce from window.bysGroupsAuth (localized in class-core.php).
 */

(function() {
    'use strict';

    // read globals into local refs
    const config = window.bysTimeTracking;
    const auth = window.bysGroupsAuth;

    if (!config || !auth || !auth.nonce) return;

    const INTERACTION_EVENTS = ['mousemove', 'mousedown', 'keydown', 'scroll', 'wheel', 'touchstart'];
    const INTERACTION_THROTTLE_MS = 5000;

    // Local state
    let activeSecondsBuffer = 0;
    let lastInteractionTs = Date.now();
    let lastInteractionUpdateTs = 0;
    let modalEl = null;
    let isPaused = false;

    /**
     * Detect interaction
     */
    function onInteraction() {
        const now = Date.now();
        if (now - lastInteractionUpdateTs < INTERACTION_THROTTLE_MS) return;

        lastInteractionUpdateTs = now;
        lastInteractionTs = now;
    }

    INTERACTION_EVENTS.forEach(function(e) {
        document.addEventListener(e, onInteraction, {
            passive: true
        });
    });

    /**
     * Check idle state
     * `idleThreshold` comes from the plugin settings.
     * See BYS_Groups_Admin_Settings.
     */
    function isIdle() {
        return (Date.now() - lastInteractionTs > (config.idleThreshold * 1000));
    }

    /**
     * Main ticker
     * Skips ticker under the following conditions:
     * - if modal is already showing
     * - if the tab is hidden (Page Visibility API)
     * - if the user is determined as idle, show modal and skip
     * Otherwise, increment the buffer. If the buffer has reached the
     * update interval, flush to the server.
     * `updateInterval` is a plugin setting. See BYS_Groups_Admin_Settings.
     */
    function tick() {
        if (isPaused) return;
        if (document.hidden) return;
        if (isIdle()) {
            showIdleModal();
            return;
        }

        activeSecondsBuffer++;

        if (activeSecondsBuffer >= config.updateInterval) {
            flush(false);
        }
    }
    setInterval(tick, 1000);

    function flush(useBeacon) {
        if (activeSecondsBuffer < 1) return;

        const payload = {
            course_id: config.courseId,
            post_id: config.postId,
            delta_seconds: activeSecondsBuffer
        };

        const deltaSent = activeSecondsBuffer;
        activeSecondsBuffer = 0;

        // Beacon path — used for tab hide/close where fetch can't be trusted.
        if (useBeacon && navigator.sendBeacon) {
            // sendBeacon can't set custom headers, so nonce goes in the query string.
            // WordPress REST cookie auth reads _wpnonce from $_REQUEST (query OR body).
            const url = config.restUrl + (config.restUrl.indexOf('?') === -1 ? '?' : '&') + '_wpnonce=' + encodeURIComponent(auth.nonce);
            const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
            navigator.sendBeacon(url, blob);
            return;
        }

        fetch(config.restUrl, {
            method: 'POST',
            credentials: 'same-origin',
            headers: {
                'Content-Type': 'application/json',
                'X-WP-Nonce': auth.nonce
            },
            body: JSON.stringify(payload),
            keepalive: true
        }).catch(function(err) {
            // On network failure, restore the delta so we retry next flush.
            // Server-side throttle (429) is expected and non-recoverable — we drop those.
            activeSecondsBuffer += deltaSent;
            if (window.console && console.warn) {
                console.warn('[bys-time-tracking] flush failed', err);
            }
        });
    }

    /**
     * Page visibility and pagehide handlers
     */
    document.addEventListener('visibilitychange', function() {
        if (document.hidden) {
            flush(true);
        }
    });

    window.addEventListener('pagehide', function() {
        flush(true);
    });

    /**
     * Show the idle modal
     */
    function showIdleModal() {
        if (modalEl) return;
        isPaused = true;

        modalEl = document.createElement('dialog');
        modalEl.className = 'bys-time-tracking-modal';
        modalEl.setAttribute('aria-labelledby', 'bys-tt-modal-title');
        modalEl.setAttribute('aria-describedby', 'bys-tt-modal-desc');
        modalEl.innerHTML =
        '<div class="bys-time-tracking-modal__dialog">' +
            '<button type="button" class="bys-time-tracking-modal__close btn-unstyled" data-action="close" aria-label="Close"><svg class="w-3.5 h-3.5" width="8" height="8" viewBox="0 0 8 8" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M0.258206 1.00652C0.351976 0.912791 0.479126 0.860131 0.611706 0.860131C0.744296 0.860131 0.871447 0.912791 0.965207 1.00652L3.61171 3.65302L6.25822 1.00652C6.30432 0.958771 6.35952 0.920671 6.42052 0.894471C6.48152 0.868271 6.54712 0.854471 6.61352 0.853901C6.67992 0.853321 6.74572 0.865971 6.80722 0.891111C6.86862 0.916251 6.92442 0.953381 6.97142 1.00032C7.01832 1.04727 7.05552 1.1031 7.08062 1.16454C7.10572 1.22599 7.11842 1.29183 7.11782 1.35822C7.11722 1.42461 7.10342 1.49022 7.07722 1.55122C7.05102 1.61222 7.01292 1.6674 6.96522 1.71352L4.31871 4.36002L6.96522 7.00648C7.05632 7.10078 7.10672 7.22708 7.10552 7.35818C7.10442 7.48928 7.05182 7.61468 6.95912 7.70738C6.86642 7.80018 6.74102 7.85268 6.60992 7.85388C6.47882 7.85498 6.35252 7.80458 6.25822 7.71348L3.61171 5.06702L0.965207 7.71348C0.870907 7.80458 0.744606 7.85498 0.613506 7.85388C0.482406 7.85268 0.357007 7.80018 0.264297 7.70738C0.171597 7.61468 0.119017 7.48928 0.117877 7.35818C0.116737 7.22708 0.167126 7.10078 0.258206 7.00648L2.90471 4.36002L0.258206 1.71352C0.164476 1.61976 0.111816 1.4926 0.111816 1.36002C0.111816 1.22744 0.164476 1.10028 0.258206 1.00652Z" fill="currentColor"></path></svg></button>' +
            '<h4 id="bys-tt-modal-title" class="bys-time-tracking-modal__title">Are you still there?</h4>' +
            '<p id="bys-tt-modal-desc" class="bys-time-tracking-modal__message">You&rsquo;ve been inactive for a while. Are you still working on this section?</p>' +
            '<div class="bys-time-tracking-modal__actions">' +
                '<button type="button" class="bys-time-tracking-modal__btn bys-time-tracking-modal__btn--primary" data-action="resume" autofocus>Yes, I&rsquo;m still here</button>' +
                '<button type="button" class="bys-time-tracking-modal__btn bys-time-tracking-modal__btn--secondary" data-action="quit">I&rsquo;m done</button>' +
            '</div>' +
        '</div>';

        document.body.appendChild(modalEl);

        modalEl.querySelector('[data-action="close"]').addEventListener('click', dismissModal);
        modalEl.querySelector('[data-action="resume"]').addEventListener('click', dismissModal);

        modalEl.querySelector('[data-action="quit"]').addEventListener('click', function() {
            flush(true);
            window.location.href = config.redirectUrl;
        });
        modalEl.addEventListener('close', dismissModal);

        modalEl.showModal();
    }

    /**
     * Close the idle modal, reset state, resume tracking.
     */
    function dismissModal() {
        if (!modalEl) return;
        const el = modalEl;
        modalEl = null;
        isPaused = false;
        lastInteractionTs = Date.now();
        if (el.open) el.close();
        el.remove();
    }
})();
