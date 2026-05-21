import { __ } from '@wordpress/i18n';
import { useEffect } from 'react';
import { useBlockProps } from '@wordpress/block-editor';
// import './editor.scss';

const MOCK_MEMBERS = [
    {name: 'Wade Ouellet', email: 'wade@thewestharbour.com' },
    {name: 'Wade Ouellet', email: 'wade@thewestharbour.com' },
    {name: 'Wade Ouellet', email: 'wade@thewestharbour.com' },
];

export default function Edit({ clientId, attributes, setAttributes }) {
    const { blockId } = attributes;

    useEffect(() => {
        if (blockId !== clientId) setAttributes({ blockId: clientId });
    }, [clientId]);

    return (
        <div {...useBlockProps()}>
            <div className="gm__header">
                <h5 className="gm__title">{__('Group Members', 'bys')}</h5>
                <p className="gm__count"># members</p>
            </div>
            <div className="gm__card">
                <div className="gm__list">
                    {MOCK_MEMBERS.map((idx) => (
                        <div key={idx} className="gm__item">
                            <div className="gm__avatar">
                                <span className="gm__avatar-initial">{idx.name.charAt(0)}</span>
                            </div>
                            <div className="gm__info">
                                <span className="gm__name">{idx.name}</span>
                                <span className="gm__email">{idx.email}</span>
                            </div>
                            <button className="gm__remove" type="button" disabled>&#x2715;</button>
                        </div>
                    ))}
                </div>
                <div className="gm__show-more">{__('Show # more', 'bys')}</div>
            </div>
        </div>
    );
}
