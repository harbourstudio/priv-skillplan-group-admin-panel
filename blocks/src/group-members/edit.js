import { __ } from '@wordpress/i18n';
import { useEffect } from 'react';
import { useBlockProps } from '@wordpress/block-editor';
import './editor.scss';

const MOCK_MEMBERS = [
    { id: 1, name: 'Wade Ouellet', email: 'wade@thewestharbour.com' },
    { id: 2, name: 'Wade Ouellet', email: 'wade@thewestharbour.com' },
    { id: 3, name: 'Wade Ouellet', email: 'wade@thewestharbour.com' },
    { id: 4, name: 'Wade Ouellet', email: 'wade@thewestharbour.com' },
    { id: 5, name: 'Wade Ouellet', email: 'wade@thewestharbour.com' },
];

export default function Edit({ clientId, attributes, setAttributes }) {
    const { blockId } = attributes;

    useEffect(() => {
        if (blockId !== clientId) setAttributes({ blockId: clientId });
    }, [clientId]);

    return (
        <div {...useBlockProps()}>
            <div className="group-members__header">
                <h5 className="group-members__title">{__('Group Members', 'bys')}</h5>
                <p className="group-members__count">18 members</p>
            </div>
            <div className="group-members__card">
                <div className="group-members__list">
                    {MOCK_MEMBERS.map((m) => (
                        <div key={m.id} className="group-members__item">
                            <div className="group-members__avatar">
                                <span className="group-members__avatar-initial">{m.name.charAt(0)}</span>
                            </div>
                            <div className="group-members__info">
                                <span className="group-members__name">{m.name}</span>
                                <span className="group-members__email">{m.email}</span>
                            </div>
                            <button className="group-members__remove" type="button" disabled>&#x2715;</button>
                        </div>
                    ))}
                </div>
                <div className="group-members__show-more">{__('Show 13 more', 'bys')}</div>
            </div>
        </div>
    );
}
