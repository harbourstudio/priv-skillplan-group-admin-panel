import { api, endpoints } from '../_shared/api-client.js';

jQuery( document ).ready( function ( $ ) {
    $( '.wp-block-bys-groups-user-group-list' ).each( function () {
        const $block    = $( this );
        const $skeleton = $block.find( '.user-groups__skeleton' );
        const $list     = $block.find( '.user-groups__list' );

        api.get( endpoints.currentUserMemberGroups() )
            .then( function ( data ) {
                $skeleton.hide();

                const groups = data?.groups ?? [];

                if ( ! groups.length ) {
                    $list.append(
                        $( '<p>' )
                            .addClass( 'user-groups__empty' )
                            .text( 'You are not currently a member of any groups.' )
                    );
                    return;
                }

                // Bucket groups by org
                const orgs  = new Map(); // org_id => { id, title, groups[] }
                const noOrg = [];

                groups.forEach( function ( group ) {
                    if ( group.org_id ) {
                        if ( ! orgs.has( group.org_id ) ) {
                            orgs.set( group.org_id, { id: group.org_id, title: group.org_title, groups: [] } );
                        }
                        orgs.get( group.org_id ).groups.push( group );
                    } else {
                        noOrg.push( group );
                    }
                } );

                orgs.forEach( function ( org ) {
                    $list.append( buildOrgSection( org.title, org.groups ) );
                } );

                if ( noOrg.length ) {
                    $list.append( buildOrgSection( 'Other Groups', noOrg ) );
                }
            } )
            .catch( function () {
                $skeleton.hide();
                $list.append(
                    $( '<p>' )
                        .addClass( 'user-groups__empty' )
                        .text( 'Could not load your groups. Please refresh the page.' )
                );
            } );
    } );

    function buildOrgSection( orgTitle, groups ) {
        const countLabel = groups.length === 1 ? '1 group' : groups.length + ' groups';

        const $header = $( '<div>' ).addClass( 'user-groups__org-header' ).append(
            $( '<h3>' ).addClass( 'user-groups__org-name' ).text( orgTitle ),
            $( '<span>' ).addClass( 'user-groups__group-count' ).text( countLabel )
        );

        const $card = $( '<div>' ).addClass( 'user-groups__org-card' );
        groups.forEach( function ( group ) {
            $card.append( buildGroupRow( group ) );
        } );

        return $( '<div>' ).addClass( 'user-groups__org-section' ).append( $header, $card );
    }

    function buildGroupRow( group ) {
        const $name = $( '<span>' ).addClass( 'user-groups__group-name' ).text( group.title );

        // ── Leave button ──────────────────────────────────────────────────────
        const $leaveBtn = $( '<button>' )
            .attr( 'type', 'button' )
            .addClass( 'btn-unstyled user-groups__leave-btn' )
            .html( '<i class="fa-solid fa-right-from-bracket" aria-hidden="true"></i> Leave' );

        // ── Confirm prompt (hidden by default) ────────────────────────────────
        const $confirm = $( '<div>' ).addClass( 'user-groups__confirm is-hidden' ).append(
            $( '<span>' ).addClass( 'user-groups__confirm-text' ).text( 'Leave "' + group.title + '"?' ),
            $( '<button>' ).attr( 'type', 'button' ).addClass( 'btn-unstyled user-groups__confirm-yes' ).text( 'Leave group' ),
            $( '<button>' ).attr( 'type', 'button' ).addClass( 'btn-unstyled user-groups__confirm-cancel' ).text( 'Cancel' )
        );

        const $row = $( '<div>' ).addClass( 'user-groups__item' ).append( $name, $leaveBtn, $confirm );

        // Show confirm prompt
        $leaveBtn.on( 'click', function () {
            $leaveBtn.addClass( 'is-hidden' );
            $confirm.removeClass( 'is-hidden' );
        } );

        // Cancel — restore leave button
        $confirm.find( '.user-groups__confirm-cancel' ).on( 'click', function () {
            $confirm.addClass( 'is-hidden' );
            $leaveBtn.removeClass( 'is-hidden' );
        } );

        // Confirm — call API and remove row
        $confirm.find( '.user-groups__confirm-yes' ).on( 'click', function () {
            const $yes = $( this );
            $yes.prop( 'disabled', true ).text( 'Leaving…' );

            api.post( endpoints.leaveGroup( group.id ) )
                .then( function () {
                    const $section = $row.closest( '.user-groups__org-section' );
                    $row.fadeOut( 200, function () {
                        $row.remove();

                        // Update count label or remove whole section if empty
                        const remaining = $section.find( '.user-groups__item' ).length;
                        if ( remaining === 0 ) {
                            $section.fadeOut( 150, function () { $section.remove(); } );
                        } else {
                            const label = remaining === 1 ? '1 group' : remaining + ' groups';
                            $section.find( '.user-groups__group-count' ).text( label );
                        }
                    } );
                } )
                .catch( function () {
                    $yes.prop( 'disabled', false ).text( 'Leave group' );
                    $confirm.find( '.user-groups__confirm-text' ).text( 'Something went wrong. Try again.' );
                } );
        } );

        return $row;
    }
} );
