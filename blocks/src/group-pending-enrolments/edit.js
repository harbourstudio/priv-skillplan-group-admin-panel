import { __ } from '@wordpress/i18n';
import { useEffect } from 'react';
import { useBlockProps } from '@wordpress/block-editor';
import './editor.scss';

const MOCK_ROWS = [
    'wade@thewestharbour.com',
    'wade@thewestharbour.com',
    'wade@thewestharbour.com',
    'wade@thewestharbour.com',
    'wade@thewestharbour.com',
];

export default function Edit({ clientId, attributes, setAttributes }) {
    const { blockId } = attributes;

    useEffect(() => {
        if (blockId !== clientId) setAttributes({ blockId: clientId });
    }, [clientId]);

    return (
        <div {...useBlockProps()}>
            <h5 className="pending-enrolments__title">{__('Pending enrolments', 'bys')}</h5>
            <div className="pending-enrolments__card">
                <div className="pending-enrolments__list">
                    {MOCK_ROWS.map((email, i) => (
                        <div key={i} className="pending-enrolments__item">
                            <span className="pending-enrolments__email">{email}</span>
                            <span className="pending-enrolments__badge">{__('Pending', 'bys')}</span>
                            <button className="pending-enrolments__cancel btn-unstyled" type="button" disabled>&#x2715;</button>
                        </div>
                    ))}
                </div>
                <button className="pending-enrolments__show-more btn-unstyled" type="button">
                    {__('Show More Results', 'bys')}
                </button>
            </div>
        </div>
    );
}
