import { __ } from '@wordpress/i18n';
import { useBlockProps } from '@wordpress/block-editor';

export default function Edit() {
    return (
        <div {...useBlockProps()}>
            <div className="onboarding-trigger-editor-preview">
                <i className="fa-solid fa-circle-info" />
                {' '}{__('Tutorial (trigger button)', 'bys')}
            </div>
        </div>
    );
}
