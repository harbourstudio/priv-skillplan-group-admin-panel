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
			<div className="group-settings__card">
				<h5 className="group-settings__title">{__('Rename Group', 'bys')}</h5>
				<p className="group-settings__description">
					{__('Change the display name of the currently selected group.', 'bys')}
				</p>
				<div className="group-settings__field">
					<input
						className="group-settings__input"
						type="text"
						placeholder={__('Group name…', 'bys')}
						disabled
					/>
					<button className="group-settings__submit" type="button" disabled>
						{__('Save', 'bys')}
					</button>
				</div>
			</div>
		</div>
	);
}
