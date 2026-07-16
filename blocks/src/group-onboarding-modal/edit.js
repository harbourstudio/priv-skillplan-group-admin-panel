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
            <div className="onboarding-modal-editor-preview">
                <i className="fa-light fa-hand-wave" />
                {__('Group Onboarding Modal', 'bys')}
                <span>{__('(auto-opens on first visit)', 'bys')}</span>
            </div>
        </div>
    );
}
