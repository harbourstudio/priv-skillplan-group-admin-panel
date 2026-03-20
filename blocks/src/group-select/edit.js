import { __ } from '@wordpress/i18n';
import { useEffect, useState } from 'react';
import {
	InspectorControls,
	blockProps
} from '@wordpress/block-editor';
import {
	PanelBody,
	PanelRow,
} from '@wordpress/components';

export default function Edit({ clientId, attributes, setAttributes }) {
	const { blockId } = attributes;

	useEffect(() => {
		if (blockId !== clientId) setAttributes({ blockId: clientId });
	}, [clientId]);

	return (
	<>
		<InspectorControls>
			<PanelBody title={__('Block-specific Settings', 'bys')} initialOpen={true}>
				<PanelRow>
				</PanelRow>
			</PanelBody>
		</InspectorControls>

		<div {...blockProps}>
			Block will show on frontend
		</div>
	</>
	);
}