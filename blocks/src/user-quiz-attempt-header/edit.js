import { __ } from '@wordpress/i18n';
import { useEffect, useState } from 'react';
import {
	useBlockProps,
	InspectorControls,
	RichText,
	useInnerBlocksProps,
	MediaUpload,
	MediaUploadCheck,
	blockProps
} from '@wordpress/block-editor';
import {
	Button,
	PanelBody,
	PanelRow,
	SearchControl,
	SelectControl,
	__experimentalToggleGroupControl as ToggleGroupControl,
	__experimentalToggleGroupControlOption as ToggleGroupControlOption,
} from '@wordpress/components';
import { gallery } from '@wordpress/icons';

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