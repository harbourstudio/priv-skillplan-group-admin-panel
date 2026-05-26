import { api, endpoints } from '../_shared/api-client.js';
import store from '../_shared/store.js';

jQuery(document).ready(($) => {
  const $block = $('.wp-block-bys-groups-group-select').first(); // will only have 1 instance of this block per page
  if (!$block) return;

  console.log('[TEMP] test for deploy workflows');

  const $select = $block.find('#group-select');
  const $submit = $block.find('.group-select__button');
  if (!$select.length || !$submit.length) return;
  const $spinnerWrapper = $block.find('.group-select__spinner-wrapper');

  // Determine which group to select: stored > first valid > nothing.
  // Exclude the placeholder "" option from $validOptions so .first() can't
  // resolve to it.
  const storedGroupId = sessionStorage.getItem('bys_selected_group_id');
  const $validOptions = $select.find('option').not('[value=""]');
  const $emptyOption  = $select.find('option[value=""]');
  const storedGroupExists = storedGroupId && $validOptions.filter(`[value="${storedGroupId}"]`).length > 0;

  let groupIdToSelect = null;

  if (storedGroupExists) {
    groupIdToSelect = storedGroupId;
  } else if ($validOptions.length > 0) {
    groupIdToSelect = $validOptions.first().val();
  }

  if (groupIdToSelect) {
    $select.val(groupIdToSelect);
    $emptyOption.remove();
  }

  /**
   * fetch group data and trigger bys:groupSelected event
   */
  const fetchAndTriggerGroup = async (groupId) => {
    if (!groupId) return;

    try {
      const basegroupdata = await api.get(endpoints.baseGroupData(groupId), true); // Force refresh
      const users   = Array.isArray(basegroupdata?.users)   ? basegroupdata.users   : [];
      const courses = Array.isArray(basegroupdata?.courses) ? basegroupdata.courses : [];
      const leaders = Array.isArray(basegroupdata?.leaders) ? basegroupdata.leaders : [];

      // Populate the shared store with hydrated users + courses + leaders.
      store.setCurrentGroup(groupId);
      store.setUsers(users);
      store.setCourses(courses);
      store.setLeaders(leaders);

      // Group-specific capability flags — server computes them in /me/groups
      // and we surface them on the <option data-*>. The blocks gate UI on
      // canManageLeaders / canManageMembers; isOrgAdmin stays for blocks that
      // still need it (group-archive, group-add-member).
      const $opt              = $select.find(`option[value="${groupId}"]`);
      const isOrgAdmin        = $opt.data('is-org-admin')        === 1;
      const canManageLeaders  = $opt.data('can-manage-leaders')  === 1;
      const canManageMembers  = $opt.data('can-manage-members')  === 1;

      $(document).trigger('bys:groupSelected', {
        groupId: parseInt(groupId),
        isOrgAdmin: isOrgAdmin,
        canManageLeaders: canManageLeaders,
        canManageMembers: canManageMembers,
      });

      $spinnerWrapper.hide();
    } catch(err) {
      console.error('[group-select] Failed to fetch group data', err)
      $spinnerWrapper.hide(); // hide spinner so user can retry
    }
  };

  // when user clicks "Show Group" button, fetch shared data from LearnDash API
  $submit.on('click', async function(e) {
    e.preventDefault();
    const groupId = $select.val();
    if (!groupId) return; // empty placeholder selected — nothing to do
    sessionStorage.setItem('bys_selected_group_id', groupId);
    $spinnerWrapper.show();
    await fetchAndTriggerGroup(groupId);
  });

  // Auto-trigger the selected group on page load. Spinner is only shown when
  // we're actually about to fetch — otherwise the leader can interact with
  // the dropdown immediately (no infinite-spinner state if no group resolves).
  const groupIdToTrigger = $select.val();
  if (groupIdToTrigger) {
    $spinnerWrapper.show();
    fetchAndTriggerGroup(groupIdToTrigger);
  }
});