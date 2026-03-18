import { store } from '@wordpress/interactivity';

store('bys-groups', {
    state: {
        groups: [],
        selectedGroup: null,
        loading: true,
        error: null
    },
    actions: {
        async initGroups() {
            this.state.loading = true,
            this.state.error = null;

            try {
                const response = await fetch('/wp-json/bys-groups/v1/me/groups');
                if (!response.ok) {
                    throw new Error('Failed to fetch data from endpoint');
                }
                
                const data = await response.json();
                this.state.groups = data.groups || [];

                if (this.state.groups.length > 0) {
                    this.state.selectedGroup = this.state.groups[0].id;
                }
            } catch(err) {
                this.state.error = err.message;
            } finally {
                this.state.loading = false;
            }
        },
        selectGroup(event) {
            this.state.selectedGroup = parseInt(event.target.value) || null;
        },
    },
})