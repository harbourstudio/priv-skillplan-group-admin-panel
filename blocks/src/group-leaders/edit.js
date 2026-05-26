import { __ } from '@wordpress/i18n';
import { useEffect } from 'react';
import { useBlockProps } from '@wordpress/block-editor';
import './editor.scss';

const MOCK_LEADERS = [
    { id: 1, name: 'Wade Ouellet' },
    { id: 2, name: 'Wade Ouellet' },
    { id: 3, name: 'Wade Ouellet' },
];

export default function Edit({ clientId, attributes, setAttributes }) {
    const { blockId } = attributes;

    useEffect(() => {
        if (blockId !== clientId) setAttributes({ blockId: clientId });
    }, [clientId]);

    return (
        <div {...useBlockProps()}>
            <div className="gl__header">
                <h5>{__('Group leaders', 'bys')}</h5>
                <p className="gl__description">{__('Group leaders can view reports and progress for all members in this cohort. Members only see their own learning.', 'bys')}</p>
            </div>
            <div className="gl__card">
                <div className="gl__list">
                    {MOCK_LEADERS.map((l) => (
                        <div key={l.id} className="gl__item">
                            <div className="gl__avatar">
                                <span className="gl__avatar-initial">{l.name.charAt(0)}</span>
                            </div>
                            <span className="gl__name">{l.name}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
