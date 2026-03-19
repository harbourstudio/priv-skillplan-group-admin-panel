/**
 * view.js
 * BYS - Group Reporting block.
 * Handles: course column expand/collapse, clickable rows,
 * quiz tooltips, filter panel toggle.
 */

( function () {

	document.addEventListener( 'DOMContentLoaded', function () {
		document.querySelectorAll( '.wp-block-bys-groups-group-reporting' )
			.forEach( initBlock );
	} );

	function initBlock( block ) {
		const table      = block.querySelector( '.reporting-table' );
		const detailUrl  = table?.dataset.detailUrl || '/administrator-dashboard/detailed-user-progress/';
		const tooltip    = block.querySelector( '.bys-tooltip' ) || document.querySelector( '.bys-tooltip' );

		if ( ! table ) return;

		// ── Filter panel toggle ────────────────────────────────────────────
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

		// ── Course column expand/collapse ──────────────────────────────────
		const expandedCourses = new Set();

		table.addEventListener( 'click', ( e ) => {
			const btn = e.target.closest( '.bys-course-toggle' );
			if ( ! btn ) return;
			e.stopPropagation();

			const idx      = parseInt( btn.dataset.courseIdx, 10 );
			const isNowExp = ! expandedCourses.has( idx );

			if ( isNowExp ) {
				expandedCourses.add( idx );
			} else {
				expandedCourses.delete( idx );
			}

			btn.setAttribute( 'aria-expanded', String( isNowExp ) );
			toggleCourseColumn( idx, isNowExp );
		} );

		function toggleCourseColumn( idx, expand ) {
			// ── Header: primary row ──────────────────────────────────────
			const primaryTh = table.querySelector( `.course-col-header[data-course-idx="${ idx }"]` );
			if ( expand ) {
				primaryTh.classList.remove( 'course-col-header--collapsed' );
				primaryTh.classList.add( 'course-col-header--expanded' );
				primaryTh.setAttribute( 'colspan', 4 );
			} else {
				primaryTh.classList.add( 'course-col-header--collapsed' );
				primaryTh.classList.remove( 'course-col-header--expanded' );
				primaryTh.setAttribute( 'colspan', 1 );
				// Remove injected sub-label headers
				primaryTh.parentElement
					.querySelectorAll( `.course-sub-th[data-course-idx="${ idx }"]` )
					.forEach( el => el.remove() );
			}

			// ── Header: secondary row ────────────────────────────────────
			const secondaryTd = table.querySelector( `.course-col-dl[data-course-idx="${ idx }"]` );
			if ( expand ) {
				secondaryTd.classList.remove( 'course-col-dl--collapsed' );
				secondaryTd.setAttribute( 'colspan', 4 );
				// Inject sub-label headers into primary row after the course th
				injectSubHeaders( primaryTh, idx );
				// Inject sub-label tds into secondary row after the dl td
				injectSubDlCells( secondaryTd, idx );
			} else {
				secondaryTd.classList.add( 'course-col-dl--collapsed' );
				secondaryTd.setAttribute( 'colspan', 1 );
				secondaryTd.parentElement
					.querySelectorAll( `.course-sub-dl[data-course-idx="${ idx }"]` )
					.forEach( el => el.remove() );
			}

			// ── Body rows ────────────────────────────────────────────────
			table.querySelectorAll( `.course-cell[data-course-idx="${ idx }"]` )
				.forEach( td => {
					if ( expand ) {
						expandBodyCell( td );
					} else {
						collapseBodyCell( td );
					}
				} );
		}

		// Inject invisible sub-header th elements so column widths are consistent
		function injectSubHeaders( afterTh, idx ) {
			const labels = [ 'Completion Progress', 'Quizzing', 'Enrolment Date', 'Completion Date' ];
			labels.forEach( label => {
				const th = document.createElement( 'th' );
				th.className     = 'course-sub-th';
				th.dataset.courseIdx = idx;
				th.innerHTML     = `<span class="bys-sub-label">${ label }</span>`;
				afterTh.parentElement.insertBefore( th, afterTh.nextSibling );
				// Move reference so they insert in order
				afterTh = th;
			} );
		}

		function injectSubDlCells( afterTd, idx ) {
			for ( let i = 0; i < 3; i++ ) {
				const td = document.createElement( 'td' );
				td.className         = 'course-sub-dl';
				td.dataset.courseIdx = idx;
				afterTd.parentElement.insertBefore( td, afterTd.nextSibling );
				afterTd = td;
			}
		}

		// Expand a body cell: replace single badge with 4 sub-cells
		function expandBodyCell( td ) {
			const progress   = parseInt( td.dataset.progress, 10 ) || 0;
			const enrolment  = td.dataset.enrolment  || '';
			const completion = td.dataset.completion || '';
			let   quizzes    = [];
			try { quizzes = JSON.parse( td.dataset.quizzes || '[]' ); } catch (e) {}

			// Progress bar sub-cell
			const color = progress >= 100 ? 'var(--wp--preset--color--green-500)'
						: progress > 0    ? 'var(--wp--preset--color--orange-500)'
						:                   'var(--wp--preset--color--gray-300)';

			td.classList.remove( 'course-cell--collapsed' );
			td.classList.add( 'course-cell--progress' );
			td.innerHTML = `
				<div class="bys-progress-wrap">
					<div class="bys-progress-bar" style="width:${ progress }%;background:${ color };"></div>
				</div>
				<span class="bys-pct" style="color:${ color };">${ progress }%</span>
			`;

			// Quizzing sub-cell
			const tdQuiz = document.createElement( 'td' );
			tdQuiz.className         = 'course-cell--quizzing course-cell--sub';
			tdQuiz.dataset.courseIdx = td.dataset.courseIdx;
			tdQuiz.innerHTML         = buildQuizIcons( quizzes );
			td.parentElement.insertBefore( tdQuiz, td.nextSibling );

			// Enrolment date sub-cell
			const tdEnrol = document.createElement( 'td' );
			tdEnrol.className         = 'course-cell--date course-cell--sub';
			tdEnrol.dataset.courseIdx = td.dataset.courseIdx;
			tdEnrol.innerHTML         = enrolment
				? enrolment
				: '<span class="bys-date-empty">Not Started</span>';
			td.parentElement.insertBefore( tdEnrol, tdQuiz.nextSibling );

			// Completion date sub-cell
			const tdComp = document.createElement( 'td' );
			tdComp.className         = 'course-cell--date course-cell--sub';
			tdComp.dataset.courseIdx = td.dataset.courseIdx;
			tdComp.innerHTML         = completion
				? completion
				: '<span class="bys-date-empty">Not Completed</span>';
			td.parentElement.insertBefore( tdComp, tdEnrol.nextSibling );
		}

		// Collapse a body cell: remove sub-cells, restore badge
		function collapseBodyCell( td ) {
			// Remove injected sub-cells
			td.parentElement
				.querySelectorAll( `.course-cell--sub[data-course-idx="${ td.dataset.courseIdx }"]` )
				.forEach( el => el.remove() );

			const progress = parseInt( td.dataset.progress, 10 ) || 0;
			td.classList.remove( 'course-cell--progress' );
			td.classList.add( 'course-cell--collapsed' );
			td.innerHTML = completionBadge( progress );
		}

		// ── Row click → detail page ────────────────────────────────────────
		table.addEventListener( 'click', ( e ) => {
			if ( e.target.closest( '.bys-course-toggle' ) ) return;
			if ( e.target.closest( 'a' ) ) return;

			const row = e.target.closest( '.reporting-table__row' );
			if ( ! row ) return;

			const userId = row.dataset.userId;
			if ( userId ) {
				window.location.href = detailUrl + '?user_id=' + userId;
			}
		} );

		// ── Quiz icon tooltips ─────────────────────────────────────────────
		table.addEventListener( 'mouseenter', ( e ) => {
			const icon = e.target.closest( '.bys-quiz-icon[data-tip]' );
			if ( ! icon || ! tooltip ) return;
			tooltip.textContent  = icon.dataset.tip;
			tooltip.setAttribute( 'aria-hidden', 'false' );
			positionTooltip( icon );
		}, true );

		table.addEventListener( 'mouseleave', ( e ) => {
			if ( ! e.target.closest( '.bys-quiz-icon' ) ) return;
			if ( tooltip ) {
				tooltip.setAttribute( 'aria-hidden', 'true' );
				tooltip.textContent = '';
			}
		}, true );

		function positionTooltip( el ) {
			if ( ! tooltip ) return;
			const rect = el.getBoundingClientRect();
			tooltip.style.top  = `${ window.scrollY + rect.bottom + 6 }px`;
			tooltip.style.left = `${ window.scrollX + rect.left + rect.width / 2 - tooltip.offsetWidth / 2 }px`;
		}

		// ── Helpers ────────────────────────────────────────────────────────
		function completionBadge( progress ) {
			if ( progress >= 100 ) {
				return '<span class="completion-badge completion-badge--completed"><i class="fa-solid fa-circle"></i></span>';
			} else if ( progress > 0 ) {
				return '<span class="completion-badge completion-badge--partial"><i class="fa-solid fa-circle-half-stroke"></i></span>';
			}
			return '<span class="completion-badge completion-badge--none"><i class="fa-regular fa-circle"></i></span>';
		}

		function buildQuizIcons( quizzes ) {
			if ( ! quizzes.length ) return '<span class="bys-quiz-empty">—</span>';
			return '<div class="bys-quiz-icons">'
				+ quizzes.map( q => {
					const color = q.score >= 80
						? 'var(--wp--preset--color--green-500)'
						: q.score >= 50
							? 'var(--wp--preset--color--orange-500)'
							: 'var(--wp--preset--color--red-500)';
					const tip   = `${ q.title }: ${ q.points }/${ q.total } (${ q.score }%)`;
					return `<span class="bys-quiz-icon" data-tip="${ escAttr( tip ) }" style="color:${ color };font-size:12px;"><i class="fa-solid fa-circle"></i></span>`;
				} ).join( '' )
				+ '</div>';
		}

		function escAttr( str ) {
			return str.replace( /"/g, '&quot;' ).replace( /'/g, '&#39;' );
		}
	}

} )();