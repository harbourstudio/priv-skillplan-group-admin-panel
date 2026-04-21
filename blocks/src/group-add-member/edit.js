import { __ } from '@wordpress/i18n';
import { useEffect } from 'react';
import { useBlockProps } from '@wordpress/block-editor';
import './editor.scss';

export default function Edit({ clientId, attributes, setAttributes }) {
    const { blockId } = attributes;

    useEffect(() => {
        if (blockId !== clientId) setAttributes({ blockId: clientId });
    }, [clientId]);

    return (
        <div {...useBlockProps()}>
            <div className="add-member__header">
                <h5 className="add-member__title">{__('Add Member', 'bys')}</h5>
                <p className="add-member__subtitle">{__('Enroll by email. New accounts are created automatically.', 'bys')}</p>
            </div>
            <div className="add-member__card">
                <div className="add-member__field">
                    <label className="add-member__label">{__('Email address', 'bys')}</label>
                    <input className="add-member__input" type="email" placeholder="learner@company.com" disabled />
                </div>
                <div className="add-member__roles">
                    <label className="add-member__radio">
                        <input type="radio" defaultChecked disabled />
                        <span>{__('Learner', 'bys')}</span>
                    </label>
                    <label className="add-member__radio">
                        <input type="radio" disabled />
                        <span>{__('Group leader', 'bys')}</span>
                    </label>
                </div>
                <div className="add-member__actions">
                    <button className="add-member__enrol btn-unstyled" type="button" disabled>
                        {__('Enrol', 'bys')}
                    </button>
                    <button className="add-member__bulk btn-unstyled" type="button">
                        {__('Bulk Upload', 'bys')}
                    </button>
                </div>
                <div className="add-member__footer">
                    <p className="add-member__note">
                        <strong>{__('Duplicate handling:', 'bys')}</strong>
                        {__(' If this email already exists, the account will be added to this group and a notification sent. No new account is created.', 'bys')}
                    </p>
                </div>
            </div>
        </div>
    );
}
