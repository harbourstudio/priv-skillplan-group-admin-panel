import { __ } from '@wordpress/i18n';
import { useEffect } from 'react';
import { useBlockProps } from '@wordpress/block-editor';
import './editor.scss';

export default function Edit({ clientId, attributes, setAttributes }) {
	const { blockId } = attributes;

	useEffect(() => {
		if (blockId !== clientId) setAttributes({ blockId: clientId });
	}, [clientId]);

	const blockProps = useBlockProps();

	return (
		<div {...blockProps}>
			<div className="group-select">
				<select className="group-select__select" disabled>
					<option>{__('Select a group…', 'bys')}</option>
				</select>
			</div>
			<button class="group-select__button" type="button">{__('Show Group', 'bys')}</button>
		</div>
	);
}
