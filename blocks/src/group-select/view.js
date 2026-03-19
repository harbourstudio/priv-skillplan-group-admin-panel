import { store } from '@wordpress/interactivity';

// console.log('group-select view.js loaded');

store('bys-groups', {
    state: {
        groups: [],
        selectedGroup: null,
        loading: true,
        error: null
    },
    actions: {
        async initGroups() {
            // console.log('initGroups called');
            const { state } = store('bys-groups');
            state.loading = true;
            state.error = null;

            try {
                const response = await fetch('/wp-json/bys-groups/v1/me/groups');
                if (!response.ok) {
                    throw new Error('Failed to fetch data from endpoint');
                }

                const data = await response.json();
                state.groups = data.groups || [];
                // console.log('fetched groups:', state.groups);

                if (state.groups.length > 0) {
                    state.selectedGroup = state.groups[0].id;
                }
                // console.log('state after init:', { groups: state.groups, selectedGroup: state.selectedGroup, loading: state.loading, error: state.error });

                // Populate the select dropdown manually
                const select = document.getElementById('group-select');
                if (select) {
                    // Remove all options except the first one
                    while (select.options.length > 1) {
                        select.remove(1);
                    }

                    // Add new options
                    state.groups.forEach(group => {
                        const option = document.createElement('option');
                        option.value = group.id;
                        option.textContent = group.title;
                        select.appendChild(option);
                    });

                    // Set the selected value
                    if (state.selectedGroup) {
                        select.value = state.selectedGroup;
                    }
                }
            } catch(err) {
                // console.error('error fetching groups:', err);
                state.error = err.message;
            } finally {
                state.loading = false;
                // console.log('final state.loading:', state.loading);
            }
        },
        selectGroup(event) {
            const { state } = store('bys-groups');
            state.selectedGroup = parseInt(event.target.value) || null;
            // console.log('selectGroup:', state.selectedGroup);
        },
    },
})