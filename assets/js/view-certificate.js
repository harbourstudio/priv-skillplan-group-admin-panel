/**
 * Certificate Link Click Tracker
 * Intercepts clicks on certificate links and logs them via REST API
 */

jQuery(document).ready(function($) {
  // console.log('[BYS] Certificate link tracker loaded');
  const userId = window.bysGroupsAuth?.userId;
  const nonce = window.bysGroupsAuth?.nonce || null;

  if (!userId) {
    console.warn('[BYS] No user ID available');
    return;
  }

  // Listen for clicks on certificate links
  $(document).on('click', 'a[href*="/certificates/"]', function(e) {
    const href = $(this).attr('href');

    // Extract course_id and cert-nonce from URL
    const url = new URL(href, window.location.origin);
    const courseId = url.searchParams.get('course_id');
    const certNonce = url.searchParams.get('cert-nonce');


    if (!courseId || !certNonce) {
      return; // Missing required params, let link work normally
    }

    // Log the certificate view via REST API
    const logView = async () => {
      try {
        const response = await fetch(
          `/wp-json/bys-groups/v1/users/${userId}/activity/view-certificate`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(nonce ? { 'X-WP-Nonce': nonce } : {}),
            },
            credentials: 'same-origin',
            body: JSON.stringify({ course_id: courseId }),
          }
        );

        console.log('[BYS] Log response status:', response.status);
        const data = await response.json();
        console.log('[BYS] Log response:', data);

        if (!response.ok) {
          console.warn('[BYS] Failed to log certificate view:', response.status);
        }
      } catch (err) {
        console.error('[BYS] Error logging certificate view:', err);
      }
    };

    // Log the view and then proceed with the link
    logView();
  });
});
