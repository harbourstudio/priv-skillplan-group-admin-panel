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
            <h5 className="gpe____title">{__('Pending enrolments', 'bys')}</h5>
            <div className="gpe____card">
                <div className="gpe____list">
                    {MOCK_ROWS.map((email, i) => (
                        <div key={i} className="gpe____item">
                            <span className="gpe____email">{email}</span>
                            <span className="gpe____badge">{__('Pending', 'bys')}</span>
                            <button className="gpe____cancel btn-unstyled" type="button" disabled>&#x2715;</button>
                        </div>
                    ))}
                </div>
                <button className="gpe____show-more btn-unstyled" type="button">
                    {__('Show More Results', 'bys')}
                </button>
            </div>
        </div>
    );
}
