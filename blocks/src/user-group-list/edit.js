import { useEffect } from 'react';
import { __ } from '@wordpress/i18n';
import { useBlockProps } from '@wordpress/block-editor';

const MOCK_ORGS = [
    {
        id: 10,
        title: 'National Energy Assessors (NEAT)',
        groups: [
            { id: 1, title: 'Energy Assessment Team', permalink: '#' },
            { id: 2, title: 'Advanced Practitioners', permalink: '#' },
        ],
    },
    {
        id: 11,
        title: 'Skills Development Network',
        groups: [
            { id: 3, title: 'New Member Cohort', permalink: '#' },
        ],
    },
];

const MOCK_UNGROUPED = [
    { id: 4, title: 'Independent Learners', permalink: '#' },
];

function GroupRow( { group } ) {
    return (
        <div className="user-groups__item">
            <span className="user-groups__group-name">{ group.title }</span>
            <button type="button" className="user-groups__leave-btn" disabled>
                <i className="fa-solid fa-right-from-bracket" aria-hidden="true" /> { __( 'Leave', 'bys' ) }
            </button>
        </div>
    );
}

function OrgSection( { org } ) {
    return (
        <div className="user-groups__org-section">
            <div className="user-groups__org-header">
                <h3 className="user-groups__org-name">{ org.title }</h3>
                <span className="user-groups__group-count">
                    { org.groups.length } { org.groups.length === 1 ? __( 'group', 'bys' ) : __( 'groups', 'bys' ) }
                </span>
            </div>
            <div className="user-groups__org-card">
                { org.groups.map( group => <GroupRow key={ group.id } group={ group } /> ) }
            </div>
        </div>
    );
}

export default function Edit( { clientId, attributes, setAttributes } ) {
    const { blockId } = attributes;

    useEffect( () => {
        if ( blockId !== clientId ) setAttributes( { blockId: clientId } );
    }, [ clientId ] );

    const blockProps = useBlockProps();

    return (
        <div { ...blockProps }>
            <div className="user-groups__list">
                { MOCK_ORGS.map( org => <OrgSection key={ org.id } org={ org } /> ) }

                { MOCK_UNGROUPED.length > 0 && (
                    <div className="user-groups__org-section">
                        <div className="user-groups__org-header">
                            <h3 className="user-groups__org-name">{ __( 'Other Groups', 'bys' ) }</h3>
                            <span className="user-groups__group-count">
                                { MOCK_UNGROUPED.length } { MOCK_UNGROUPED.length === 1 ? __( 'group', 'bys' ) : __( 'groups', 'bys' ) }
                            </span>
                        </div>
                        <div className="user-groups__org-card">
                            { MOCK_UNGROUPED.map( group => <GroupRow key={ group.id } group={ group } /> ) }
                        </div>
                    </div>
                ) }
            </div>
        </div>
    );
}
