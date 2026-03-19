import { store } from '@wordpress/interactivity';

// console.log('group-stats view.js loaded');

// Participate in the shared bys-groups store
store('bys-groups', {
    state: {
        groupStats: null,
        groupStatsLoading: false,
        groupStatsError: null,
    },
    actions: {
        async fetchGroupStats() {
            const { state } = store('bys-groups');

            // Only fetch if a group is actually selected
            if (!state.selectedGroup) {
                state.groupStats = null;
                state.groupStatsLoading = false;
                return;
            }

            state.groupStatsLoading = true;
            state.groupStatsError = null;

            try {
                const response = await fetch(`/wp-json/bys-groups/v1/groups/${state.selectedGroup}/stats`);
                if (!response.ok) {
                    throw new Error('Failed to fetch group stats');
                }

                state.groupStats = await response.json();
                // console.log('fetched group stats:', state.groupStats);
            } catch (err) {
                // console.error('error fetching group stats:', err);
                state.groupStatsError = err.message;
            } finally {
                state.groupStatsLoading = false;
            }
        },
    },
});
