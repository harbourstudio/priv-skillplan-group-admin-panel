import { api, endpoints } from '../_shared/api-client.js';
import store from '../_shared/store.js';

jQuery(document).ready(($) => {
  const $block = $('.wp-block-bys-groups-group-select').first(); // will only have 1 instance of this block per page
  if (!$block.length) return;

  const $input = $block.find('.group-select__input');
  const $selectValue = $block.find('.group-select__value');
  const $selectList = $block.find('.group-select__list');
  const $selectOptions = $block.find('.group-select__option');
  const $submit = $block.find('.group-select__button');
  const $empty = $block.find('.group-select__empty');

  const selectOption = ($opt) => {
    $selectValue.val($opt.data('group-id'));
    $input.val($opt.text().trim());
  }
  if (!$selectList.length || !$submit.length) return;
  const $spinnerWrapper = $block.find('.group-select__spinner-wrapper');

  // Determine which group to select: stored > first valid > nothing.
  // Exclude the placeholder "" option from $validOptions so .first() can't
  // resolve to it.
  const storedGroupId = localStorage.getItem('bys_selected_group_id');
  const storedGroupExists = storedGroupId && $selectOptions.filter(`[data-group-id="${storedGroupId}"]`).length > 0;


  let groupIdToSelect = null;

  if (storedGroupExists) {
    groupIdToSelect = storedGroupId;
  } else if ($selectOptions.length > 0) {
    groupIdToSelect = $selectOptions.first().data('group-id');
  }

  if (groupIdToSelect) {
    const $opt = $selectOptions.filter(`[data-group-id="${groupIdToSelect}"]`);
    selectOption($opt);

  }

  /**
   * fetch group data and trigger bys:groupSelected event
   */
  const fetchAndTriggerGroup = async (groupId) => {
    if (!groupId) return;

    try {
      const basegroupdata = await api.get(endpoints.baseGroupData(groupId), true); // Force refresh
      const users         = Array.isArray(basegroupdata?.users)   ? basegroupdata.users   : [];
      const courses       = Array.isArray(basegroupdata?.courses) ? basegroupdata.courses : [];
      const leaders       = Array.isArray(basegroupdata?.leaders) ? basegroupdata.leaders : [];
      const pendingUsers  = Number.isFinite(basegroupdata?.pending_users) ? basegroupdata.pending_users : 0;

      // Populate the shared store with hydrated users + courses + leaders + pending count.
      store.setCurrentGroup(groupId);
      store.setUsers(users);
      store.setCourses(courses);
      store.setLeaders(leaders);
      store.setPendingUsers(pendingUsers);

      // Group-specific capability flags — server computes them in /me/groups
      // and we surface them on the <option data-*>. Blocks gate UI on
      // canManageMembers / canManageGroup; isOrgAdmin stays for blocks that
      // still need it (group-add-member). canManageGroup also gates
      // leader-management — there is no separate flag.
      const $opt              = $selectOptions.filter(`[data-group-id="${groupId}"]`);
      const isOrgAdmin        = $opt.data('is-org-admin')        === 1;
      const canManageMembers  = $opt.data('can-manage-members')  === 1;
      const canManageGroup    = $opt.data('can-manage-group')    === 1;
      const groupTitle        = ($opt.text() || '').trim();

      $(document).trigger('bys:groupSelected', {
        groupId: parseInt(groupId),
        groupTitle: groupTitle,
        isOrgAdmin: isOrgAdmin,
        canManageMembers: canManageMembers,
        canManageGroup: canManageGroup,
      });

      $spinnerWrapper.hide();
    } catch(err) {
      console.error('[group-select] Failed to fetch group data', err)
      $spinnerWrapper.hide(); // hide spinner so user can retry
    }
  };

  // Shows the list
 const openList = () => {
  $selectList.prop('hidden', false);
  $input.attr('aria-expanded', 'true')
};

// Closes the list
// Finds the hidden input value and set it back into the visible input
const closeList = () => {
  $selectList.prop('hidden', true);
  $input.attr('aria-expanded', 'false')

  $selectOptions.prop('hidden', false);
  $empty.prop('hidden', true);

  const $current = $selectOptions.filter(`[data-group-id="${$selectValue.val()}"]`);
  selectOption($current);

};

$input.on('focus click', openList);

// Select the clicked option, then close the list
$selectOptions.on('click', function () {
  selectOption($(this));
  closeList();
});

// Closes list if clicked outside
$(document).on('click', (e) => {
  if($(e.target).closest($block).length === 0) {
    closeList()
  }
});

$input.on('keydown', (e) => {
  if (e.key === 'Escape') {
    closeList()
  }
});

// Check for matches in the input and filters the list
$input.on('input', () => {
  const query = $input.val().toLowerCase().trim();
  let matches = 0;

  $selectOptions.each(function () {
    const $opt = $(this);
    const isMatch = $opt.text().toLowerCase().includes(query);

    $opt.prop('hidden', !isMatch);
    if (isMatch) matches++;
  });

   $empty.prop('hidden', matches > 0);

  openList();
});

  // when user clicks "Show Group" button, fetch shared data from LearnDash API
  $submit.on('click', async function(e) {
    e.preventDefault();
    const groupId = $selectValue.val();
    if (!groupId) return; // empty placeholder selected — nothing to do
    localStorage.setItem('bys_selected_group_id', groupId);
    $spinnerWrapper.show();
    await fetchAndTriggerGroup(groupId);
  });

  // Auto-trigger the selected group on page load. Spinner is only shown when
  // we're actually about to fetch — otherwise the leader can interact with
  // the dropdown immediately (no infinite-spinner state if no group resolves).
  const groupIdToTrigger = $selectValue.val();
  if (groupIdToTrigger) {
    $spinnerWrapper.show();
    fetchAndTriggerGroup(groupIdToTrigger);
  }
});