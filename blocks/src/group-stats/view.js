import { api, endpoints } from '../_shared/api-client.js';
import store from '../_shared/store.js';

jQuery(document).ready(($) => {
  const $block = $('.wp-block-bys-groups-group-stats').first(); // assume one-time block usage per page
  if (!$block) return;

  const $totalMembers = $block.find('.total_members');
  const $completedCourses = $block.find('.completed_courses');
  const $incompleteCourses = $block.find('.incomplete_courses');
  const $totalInactiveMembers = $block.find('.total_inactive_members');
  const $allStats = $totalMembers.add($completedCourses).add($incompleteCourses).add($totalInactiveMembers);

  function setStat($numberEl, value) {
    $numberEl.html(value);
    $numberEl.siblings('.skeleton').hide();
  }

  function showAllSkeletons() {
    $allStats.each(function () {
      const $n = $(this);
      $n.html('');
      $n.siblings('.skeleton').show();
    });
  }

  /**
   * Data that the block needs to count inactive members are available through the store
   * Read from store first, then send a request to /group-stats as fallback 
   * 
   */
  function paintMembershipStats(users) {
    setStat($totalMembers, users.length);
    const inactive = users.filter((u) => u.last_login === null).length;
    setStat($totalInactiveMembers, inactive);
  }

  // if the store already has users cached (from prior page session), show both stats right away
  const cachedUsers = store.getUsers();
  if (Array.isArray(cachedUsers)) {
    paintMembershipStats(cachedUsers);
  }

  // listen for the custom jquery event triggered by group-select block
  $(document).on('bys:groupSelected', async (_, { groupId }) => {

    showAllSkeletons();

    const storeUsers = store.getUsers();
    if (Array.isArray(storeUsers)) {
      paintMembershipStats(storeUsers);
    } else {
      setStat($totalMembers, 0);
      api.get(endpoints.baseGroupStats(groupId), true)
        .then((stats) => setStat($totalInactiveMembers, stats?.total_inactive_members ?? 0))
        .catch((err) => {
          console.error('[group-stats] Failed to fetch /group-stats', err);
          setStat($totalInactiveMembers, 0);
        });
    }

    // Course-completion stats
    const userIdsForStats = store.getUserIds() || [];
    const coursesForStats = store.getCourses() || [];
    calculateCourseStats(userIdsForStats, coursesForStats);
  });

  // fetch course completion stats for entire group
  async function calculateCourseStats(userIds, courses) {
    try {
      if (!courses.length || !userIds.length) {
        setStat($completedCourses, 0);
        setStat($incompleteCourses, 0);
        return;
      }

      const courseIds = courses.map(c => c.id).join(',');

      const promises = userIds.map(userId => {
        const endpoint = `/wp-json/bys-groups/v1/users/${userId}/course-progress?course_ids=${courseIds}`;
        return api.get(endpoint, false);
      });

      const allProgressStatus = await Promise.all(promises);

      // Count completed and incomplete courses
      let totalCompleted = 0;
      let totalIncomplete = 0;

      allProgressStatus.forEach(progressArray => {
        if (!Array.isArray(progressArray)) return;
        progressArray.forEach(courseProgress => {
          if (courseProgress.progress_status === 'completed') {
            totalCompleted++;
          } else {
            totalIncomplete++;
          }
        });
      });

      setStat($completedCourses, totalCompleted);
      setStat($incompleteCourses, totalIncomplete);
    } catch (err) {
      console.error('Failed to calculate course stats:', err);
      setStat($completedCourses, 0);
      setStat($incompleteCourses, 0);
    }
  }
});
