import { __ } from '@wordpress/i18n';
import { useEffect } from 'react';
import { useBlockProps } from '@wordpress/block-editor';
import './editor.scss';

const ARCHIVE_ICON = (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polyline points="21 8 21 21 3 21 3 8" />
        <rect x="1" y="3" width="22" height="5" />
        <line x1="10" y1="12" x2="14" y2="12" />
    </svg>
);

const MOCK_GROUPS = [
    { id: 1, title: 'Test Group', date: 'Archived Jan 1, 2025' },
    { id: 2, title: 'Test Group', date: 'Archived Jan 1, 2025' },
];

export default function Edit({ clientId, attributes, setAttributes }) {
    const { blockId } = attributes;

    useEffect(() => {
        if (blockId !== clientId) setAttributes({ blockId: clientId });
    }, [clientId]);

    return (
        <div {...useBlockProps()}>
            <div className="archived-groups__header">
                <h2 className="archived-groups__title">{__('Archived Groups', 'bys')}</h2>
                <p className="archived-groups__description">
                    {__('These groups are locked in their archived state. Unarchive to restore full access and activity tracking.', 'bys')}
                </p>
            </div>
            <div className="archived-groups__card">
                {MOCK_GROUPS.map((group) => (
                    <div key={group.id} className="archived-groups__item">
                        <div className="archived-groups__icon">{ARCHIVE_ICON}</div>
                        <div className="archived-groups__info">
                            <span className="archived-groups__name">{group.title}</span>
                            <span className="archived-groups__date">{group.date}</span>
                        </div>
                        <button className="archived-groups__button" type="button" disabled>
                            {__('Unarchive', 'bys')}
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}
