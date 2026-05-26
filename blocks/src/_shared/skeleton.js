/**
 * Shared skeleton helpers.
 *
 * Pairs with _shared/skeleton.css. See that file for the markup convention.
 */

/**
 * Build a string of <td><span class="skeleton" aria-hidden="true"></span></td>
 * cells for a single table-row skeleton.
 *
 * The caller is responsible for wrapping the row(s) in a <tr> and for setting
 * `aria-busy="true"` on the surrounding <tbody> (or other wrapper).
 *
 * @param {number} colCount Number of <td> skeleton cells to emit.
 * @returns {string} HTML string.
 */
export function skeletonCells(colCount) {
    return Array(colCount)
        .fill('<td><span class="skeleton" aria-hidden="true"></span></td>')
        .join('');
}

/**
 * Build one or more skeleton table rows ready to drop inside a <tbody>.
 *
 * @param {number} colCount Cells per row.
 * @param {number} [rowCount=1] Number of rows.
 * @returns {string} HTML string.
 */
export function skeletonRows(colCount, rowCount = 1) {
    const row = `<tr>${skeletonCells(colCount)}</tr>`;
    return Array(rowCount).fill(row).join('');
}

/**
 * Single skeleton bone. Use when a block needs one placeholder element.
 * Carries its own ARIA — drop it straight into any container.
 */
export const SKELETON = `
    <div class="skeleton" role="status" aria-busy="true" aria-live="polite"></div>
`;

/**
 * Grouped skeleton bones with wrapper-level ARIA. Use when multiple bones
 * should be announced as one loading region.
 */
export const SKELETONS = `
    <div class="skeletons" role="status" aria-busy="true" aria-live="polite">
        <div class="skeleton"></div>
        <div class="skeleton"></div>
        <div class="skeleton"></div>
    </div>
`;
