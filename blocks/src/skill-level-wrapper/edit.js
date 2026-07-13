import { __ } from '@wordpress/i18n';
import { useBlockProps, useInnerBlocksProps, InspectorControls } from '@wordpress/block-editor';
import { PanelBody, SelectControl } from '@wordpress/components';
import './editor.scss';

const SKILL_LEVELS = [
	{ value: '',              label: __( 'All users (no filter)', 'bys' ) },
	{ value: 'explorer',      label: __( 'Explorer', 'bys' ) },
	{ value: 'preapprentice', label: __( 'Pre-apprentice', 'bys' ) },
	{ value: 'apprentice',    label: __( 'Apprentice', 'bys' ) },
	{ value: 'journeyperson', label: __( 'Journeyperson', 'bys' ) },
	{ value: 'support',       label: __( 'Non-Field Support Staff', 'bys' ) },
	{ value: 'provider',      label: __( 'Training Provider', 'bys' ) },
];

export default function Edit( { attributes, setAttributes } ) {
	const { skillLevel } = attributes;

	const selectedLabel = SKILL_LEVELS.find( ( o ) => o.value === skillLevel )?.label
		|| __( 'All users', 'bys' );

	const blockProps = useBlockProps( { className: 'bys-slw' } );
	const innerBlocksProps = useInnerBlocksProps( { className: 'bys-slw__inner' } );

	return (
		<>
			<InspectorControls>
				<PanelBody title={ __( 'Visibility', 'bys' ) } initialOpen={ true }>
					<SelectControl
						label={ __( 'Show to', 'bys' ) }
						value={ skillLevel }
						options={ SKILL_LEVELS }
						onChange={ ( val ) => setAttributes( { skillLevel: val } ) }
						__nextHasNoMarginBottom
					/>
				</PanelBody>
			</InspectorControls>

			<div { ...blockProps }>
				<div className="bys-slw__badge">
					{ skillLevel
						? <>{ __( 'Visible to:', 'bys' ) } <strong>{ selectedLabel }</strong></>
						: __( 'Visible to all users', 'bys' )
					}
				</div>
				<div { ...innerBlocksProps } />
			</div>
		</>
	);
}
