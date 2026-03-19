/**
 * view.js — BYS Group Reporting block.
 *
 * All sub-column <th> and <td> elements are pre-rendered in render.php
 * with class "course-sub-col--hidden". This script simply toggles that
 * class, so header and body cells are always in sync — no injection,
 * no colspan juggling, no alignment bugs.
 */

( function () {

    document.addEventListener( 'DOMContentLoaded', function () {
        document.querySelectorAll( '.wp-block-bys-groups-group-reporting' )
            .forEach( initBlock );
    } );

    function initBlock( block ) {
        const table     = block.querySelector( '.reporting-table' );
        const detailUrl = table?.dataset.detailUrl || '/administrator-dashboard/user-progress-detail/';
        const tooltip   = document.querySelector( '.bys-tooltip' );

        if ( ! table ) return;

        // ── Filter panel toggle ──────────────────────────────────────────
        const filterToggle = block.querySelector( '.filters__toggle' );
        const filterBox    = block.querySelector( '#filters-box' );

        if ( filterToggle && filterBox ) {
            filterToggle.addEventListener( 'click', () => {
                const isOpen = filterToggle.getAttribute( 'aria-expanded' ) === 'true';
                filterToggle.setAttribute( 'aria-expanded', String( ! isOpen ) );
                filterBox.setAttribute( 'aria-hidden', String( isOpen ) );
                filterBox.classList.toggle( 'hidden', isOpen );
            } );
        }

        // ── Course column expand / collapse ──────────────────────────────
        //
        // Only one course can be expanded at a time (matching your screenshot).
        // When a course is expanded, all OTHER course columns (badge + sub-cols)
        // are hidden so the view focuses entirely on that course's detail.
        //
        let expandedIdx = null;

        table.addEventListener( 'click', ( e ) => {
            const btn = e.target.closest( '.bys-course-toggle' );
            if ( ! btn ) return;
            e.stopPropagation();

            const idx     = parseInt( btn.dataset.courseIdx, 10 );
            const opening = expandedIdx !== idx;

            // Always fully reset first
            resetAllCourses();

            if ( opening ) {
                expandCourse( idx );
                expandedIdx = idx;
            } else {
                expandedIdx = null;
            }
        } );

        function resetAllCourses() {
            // Restore all course badge columns
            table.querySelectorAll( '.course-col-header' ).forEach( th => {
                th.classList.remove( 'course-col-header--expanded' );
                th.classList.add( 'course-col-header--collapsed' );
                th.classList.remove( 'course-col--hidden' );
                const btn = th.querySelector( '.bys-course-toggle' );
                if ( btn ) btn.setAttribute( 'aria-expanded', 'false' );
            } );
            table.querySelectorAll( '.course-cell--badge' ).forEach( td => {
                td.classList.remove( 'course-col--hidden' );
            } );
            // Hide all sub-cols
            table.querySelectorAll( '.course-sub-col' ).forEach( el => {
                el.classList.add( 'course-sub-col--hidden' );
            } );
            table.querySelectorAll( '.course-sub-cell' ).forEach( el => {
                el.classList.add( 'course-sub-col--hidden' );
            } );
        }

        function expandCourse( idx ) {
            // Mark the toggled header as expanded
            const header = table.querySelector( `.course-col-header[data-course-idx="${ idx }"]` );
            if ( header ) {
                header.classList.remove( 'course-col-header--collapsed' );
                header.classList.add( 'course-col-header--expanded' );
                const btn = header.querySelector( '.bys-course-toggle' );
                if ( btn ) btn.setAttribute( 'aria-expanded', 'true' );
            }

            // Show this course's sub-col headers
            table.querySelectorAll( `.course-sub-col[data-course-idx="${ idx }"]` ).forEach( th => {
                th.classList.remove( 'course-sub-col--hidden' );
            } );

            // Show this course's sub-cell body cells
            table.querySelectorAll( `.course-sub-cell[data-course-idx="${ idx }"]` ).forEach( td => {
                td.classList.remove( 'course-sub-col--hidden' );
            } );

            // Hide ALL other course badge columns (header + body)
            table.querySelectorAll( `.course-col-header:not([data-course-idx="${ idx }"])` ).forEach( th => {
                th.classList.add( 'course-col--hidden' );
            } );
            table.querySelectorAll( `.course-cell--badge:not([data-course-idx="${ idx }"])` ).forEach( td => {
                td.classList.add( 'course-col--hidden' );
            } );
        }

        // ── Row click → detail page ──────────────────────────────────────
        table.addEventListener( 'click', ( e ) => {
            if ( e.target.closest( '.bys-course-toggle' ) ) return;
            if ( e.target.closest( 'a' ) ) return;

            const row = e.target.closest( '.reporting-table__row' );
            if ( ! row ) return;

            const userId = row.dataset.userId;
            if ( userId ) window.location.href = detailUrl + '?user_id=' + userId;
        } );

        // ── Quiz icon tooltips ───────────────────────────────────────────
        table.addEventListener( 'mouseenter', ( e ) => {
            const icon = e.target.closest( '.bys-quiz-icon[data-tip]' );
            if ( ! icon || ! tooltip ) return;
            tooltip.textContent = icon.dataset.tip;
            tooltip.setAttribute( 'aria-hidden', 'false' );
            const rect = icon.getBoundingClientRect();
            tooltip.style.top  = ( window.scrollY + rect.bottom + 6 ) + 'px';
            tooltip.style.left = ( window.scrollX + rect.left + rect.width / 2 - tooltip.offsetWidth / 2 ) + 'px';
        }, true );

        table.addEventListener( 'mouseleave', ( e ) => {
            if ( ! e.target.closest( '.bys-quiz-icon' ) ) return;
            if ( tooltip ) {
                tooltip.setAttribute( 'aria-hidden', 'true' );
                tooltip.textContent = '';
            }
        }, true );

    }

} )();