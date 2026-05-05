import { __ } from '@wordpress/i18n';
import { useEffect } from 'react';
import { useBlockProps } from '@wordpress/block-editor';
import './editor.scss';

const ARCHIVE_ICON = (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polyline points="21 8 21 21 3 21 3 8" />
        <rect x="1" y="3" width="22" height="5" />
        <line x1="10" y1="12" x2="14" y2="12" />
    </svg>
);

const MOCK_ORGS = [
    {
        id: 1,
        name: 'Acme Corporation',
        groups: [
            { id: 1, name: 'Q1 Cohort 2025' },
            { id: 2, name: 'Leadership Programme' },
            { id: 3, name: 'Onboarding — March' },
        ],
        archivedCount: 0,
    },
    {
        id: 2,
        name: 'Harbour Studio',
        groups: [
            { id: 4, name: 'Design Team' },
            { id: 5, name: 'Developer Track' },
        ],
        archivedCount: 1,
    },
];

const MOCK_UNGROUPED = [
    { id: 6, name: 'Standalone Group' },
];

function OrgSection({ org }) {
    const countLabel = `${org.groups.length} group${org.groups.length !== 1 ? 's' : ''}`;
    return (
        <div className="org-groups__section">
            <div className="org-groups__org-header">
                <h3 className="org-groups__org-name">{org.name}</h3>
                <span className="org-groups__org-meta">{countLabel}</span>
            </div>
            <div className="org-groups__card">
                <div className="org-groups__items">
                    {org.groups.map((group) => (
                        <div key={group.id} className="org-groups__item">
                            <span className="org-groups__group-name">{group.name}</span>
                            <button className="org-groups__manage-btn btn-unstyled" type="button" disabled>
                                {__('Manage', 'bys')} →
                            </button>
                        </div>
                    ))}
                </div>
                <div className="org-groups__new-group">
                    <button className="org-groups__new-group-btn btn-unstyled" type="button" disabled>
                        + {__('New group', 'bys')}
                    </button>
                </div>
            </div>
            {org.archivedCount > 0 && (
                <div className="org-groups__archived-section">
                    <button className="org-groups__archived-toggle btn-unstyled" type="button" disabled>
                        <i className="fa-solid fa-chevron-right org-groups__archived-chevron" aria-hidden="true" />
                        {__('Archived groups', 'bys')}
                        <span className="org-groups__archived-badge">{org.archivedCount}</span>
                    </button>
                </div>
            )}
        </div>
    );
}

export default function Edit({ clientId, attributes, setAttributes }) {
    const { blockId } = attributes;

    useEffect(() => {
        if (blockId !== clientId) setAttributes({ blockId: clientId });
    }, [clientId]);

    return (
        <div {...useBlockProps()}>

            <div className="org-groups__new-org">
                <button className="org-groups__new-org-btn btn-unstyled" type="button" disabled>
                    + {__('New organization', 'bys')}
                </button>
            </div>

            <div className="org-groups__search-wrap">
                <span className="org-groups__search-icon" aria-hidden="true">⌕</span>
                <input
                    className="org-groups__search"
                    type="search"
                    placeholder={__('Search organizations and groups…', 'bys')}
                    disabled
                    readOnly
                />
            </div>

            <div className="org-groups__list">
                {MOCK_ORGS.map((org) => (
                    <OrgSection key={org.id} org={org} />
                ))}

                <div className="org-groups__section org-groups__section--ungrouped">
                    <div className="org-groups__org-header">
                        <h3 className="org-groups__org-name">{__('Other Groups', 'bys')}</h3>
                        <span className="org-groups__org-meta">
                            {MOCK_UNGROUPED.length} {__('group', 'bys')}
                        </span>
                    </div>
                    <div className="org-groups__card">
                        <div className="org-groups__items">
                            {MOCK_UNGROUPED.map((group) => (
                                <div key={group.id} className="org-groups__item">
                                    <span className="org-groups__group-name">{group.name}</span>
                                    <button className="org-groups__manage-btn btn-unstyled" type="button" disabled>
                                        {__('Manage', 'bys')} →
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

        </div>
    );
}
