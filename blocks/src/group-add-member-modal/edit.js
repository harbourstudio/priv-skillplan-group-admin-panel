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
            <div className="add-member-modal-editor-preview">
                <i className="fa-light fa-users" />
                {__('Add Member Modal', 'bys')}
                <span>{__('(opens on Bulk Upload click)', 'bys')}</span>
            </div>
        </div>
    );
}
