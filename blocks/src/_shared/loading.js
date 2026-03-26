/**
 * Shared loading state component
 *
 * Usage:
 *   import { LOADING_HTML } from '../_shared/loading.js';
 * 
 */
export const LOADING_HTML = `
    <div class="bys-groups-loading-wrapper" role="status" aria-live="polite" aria-label="Loading">
        <div class="bys-groups-loading" aria-hidden="true">
            <span class="bys-groups-loading__dot"></span>
            <span class="bys-groups-loading__dot"></span>
            <span class="bys-groups-loading__dot"></span>
        </div>
        <span class="bys-sr-only">Loading</span>
    </div>
`;
