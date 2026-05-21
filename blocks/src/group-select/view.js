import { api, endpoints } from '../_shared/api-client.js';
import store from '../_shared/store.js';

jQuery(document).ready(($) => {
  const $block = $('.wp-block-bys-groups-group-select').first(); // will only have 1 instance of this block per page
  if (!$block) return;

  const $select = $block.find('#group-select');
  const $button = $block.find('.group-selector__button');
  const $spinnerWrapper = $block.find('.group-selector__spinner-wrapper');
  if (!$select.length || !$button.length) return;

  // Determine which group to select: stored > first valid > nothing
  const storedGroupId = sessionStorage.getItem('bys_selected_group_id');
  const $validOptions = $select.find('option.group-option');
  const $emptyOption = $select.find('option[value=""]');
  const storedGroupExists = storedGroupId && $select.find(`option[value="${storedGroupId}"]`).length > 0;

  let groupIdToSelect = null;

  if (storedGroupExists) {
    groupIdToSelect = storedGroupId;
  } else if ($validOptions.length > 0) {
    groupIdToSelect = $validOptions.first().val();
  }

  if (groupIdToSelect) {
    $select.val(groupIdToSelect);
    // Remove the empty option now that we've selected a real group
    $emptyOption.remove();
  }

  // Show loading state on page load
  $spinnerWrapper.show();

  /**
   * fetch group data and trigger bys:groupSelected event
   */
  const fetchAndTriggerGroup = async (groupId) => {
    if (!groupId) return;

    try {
      // call custom rest route; callback method makes the request to LD API for the data
      // shared data will be available in the document (data payload) and can be accessed by any element listening to the bys:groupSelected event

      // Fetch shared data that both group-stats and group-reporting blocks need
      const baseUsersStats = await api.get(endpoints.groupBaseUsersStats(groupId), true); // Force refresh
      const courses = await api.get(endpoints.groupCourses(groupId), true); // Force refresh

      // Populate the shared store so other blocks can read user_ids and courses
      // without re-fetching.
      store.setCurrentGroup(groupId);
      store.setUserIdsAsStubs(baseUsersStats.user_ids || []);
      store.setCourses(Array.isArray(courses) ? courses : []);
      console.log('[bys-store] group-select wrote users (stubs) for group', parseInt(groupId), store.getUsers());
      console.log('[bys-store] group-select wrote courses for group', parseInt(groupId), store.getCourses());

      // Read org-admin flag from the selected <option> data attribute
      const isOrgAdmin    = $select.find(`option[value="${groupId}"]`).data('is-org-admin') === 1;
      const isGrader      = window.bysGroupsAuth?.isGrader      === true;
      const isSiteEditor  = window.bysGroupsAuth?.isSiteEditor  === true;

      // store globally for blocks to reference
      window.bysGroupData = {
        groupId: parseInt(groupId),
        baseUsersStats: baseUsersStats,
        courses: courses,
        isOrgAdmin: isOrgAdmin,
        isGrader: isGrader,
        isSiteEditor: isSiteEditor,
      };

      // trigger event with all shared data
      $(document).trigger('bys:groupSelected', {
        groupId: parseInt(groupId),
        baseUsersStats: baseUsersStats,
        courses: courses,
        isOrgAdmin: isOrgAdmin,
        isGrader: isGrader,
        isSiteEditor: isSiteEditor,
      })

      $spinnerWrapper.hide();
    } catch(err) {
      console.error('[group-select] Failed to fetch group data', err)
      // Hide spinner even on error so user can retry
      $spinnerWrapper.hide();
    }
  };

  // when user clicks "Show Group" button, fetch shared data from LearnDash API
  $button.on('click', async function(e) {
    e.preventDefault();
    const groupId = $select.val();
    // Store the selected group to sessionStorage
    sessionStorage.setItem('bys_selected_group_id', groupId);
    await fetchAndTriggerGroup(groupId);
  });

  // Auto-trigger the selected group on page load
  const groupIdToTrigger = $select.val();
  if (groupIdToTrigger) {
    fetchAndTriggerGroup(groupIdToTrigger);
  }
});