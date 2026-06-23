import { useState, useEffect } from 'react';
import { __ } from '@wordpress/i18n';
import {
	useBlockProps,
	BlockControls,
	InspectorControls,
	RichText,
} from '@wordpress/block-editor';
import {
	ToolbarGroup,
	ToolbarButton,
	PanelBody,
	TextControl,
	ToggleControl,
} from '@wordpress/components';
import './editor.scss';

export default function Edit( { clientId, attributes, setAttributes } ) {
	const { blockId, lockedText, unlockedText, ctaLabel, ctaUrl, ctaOpenModal } = attributes;
	const [ showUnlocked, setShowUnlocked ] = useState( false );

	useEffect( () => {
		if ( blockId !== clientId ) setAttributes( { blockId: clientId } );
	}, [ clientId ] );

	const blockProps = useBlockProps( { className: 'bys-lander-courses' } );
	const alertMod   = showUnlocked ? 'bys-lander-completion-alert--unlocked' : 'bys-lander-completion-alert--locked';

	return (
		<>
			<BlockControls>
				<ToolbarGroup>
					<ToolbarButton
						icon={ showUnlocked ? 'unlock' : 'lock' }
						label={ showUnlocked
							? __( 'Preview: Unlocked — click to preview Locked', 'bys' )
							: __( 'Preview: Locked — click to preview Unlocked', 'bys' )
						}
						isPressed={ showUnlocked }
						onClick={ () => setShowUnlocked( v => ! v ) }
					>
						{ showUnlocked ? __( 'Unlocked', 'bys' ) : __( 'Locked', 'bys' ) }
					</ToolbarButton>
				</ToolbarGroup>
			</BlockControls>

			<InspectorControls>
				<PanelBody title={ __( 'Preview', 'bys' ) } initialOpen={ true }>
					<ToggleControl
						label={ __( 'Show unlocked state', 'bys' ) }
						checked={ showUnlocked }
						onChange={ setShowUnlocked }
						help={ showUnlocked
							? __( 'Editing the message shown when all courses are complete.', 'bys' )
							: __( 'Editing the message shown while courses are incomplete.', 'bys' )
						}
						__nextHasNoMarginBottom
					/>
				</PanelBody>
				<PanelBody title={ __( 'CTA Button', 'bys' ) } initialOpen={ true }>
					<TextControl
						label={ __( 'URL or Anchor', 'bys' ) }
						value={ ctaUrl }
						onChange={ val => setAttributes( { ctaUrl: val } ) }
						placeholder="#section-id or https://…"
						help={ __( 'Leave blank to hide the button.', 'bys' ) }
						__nextHasNoMarginBottom
					/>
					<ToggleControl
						label={ __( 'Open as modal', 'bys' ) }
						checked={ ctaOpenModal }
						onChange={ val => setAttributes( { ctaOpenModal: val } ) }
						help={ __( 'Triggers the URL as a modal overlay once all courses are complete.', 'bys' ) }
						__nextHasNoMarginBottom
					/>
				</PanelBody>
			</InspectorControls>

			<div { ...blockProps }>
				<div className={ `bys-lander-completion-alert ${ alertMod }` }>

					<div className="bys-ca__body">
						<span
							className={ `dashicons ${ showUnlocked ? 'dashicons-yes' : 'dashicons-lock' } bys-ca__icon` }
							aria-hidden="true"
						/>
						<RichText
							tagName="p"
							className="bys-ca__message"
							value={ showUnlocked ? unlockedText : lockedText }
							onChange={ val => setAttributes(
								showUnlocked ? { unlockedText: val } : { lockedText: val }
							) }
							placeholder={ showUnlocked
								? __( 'Message shown when all courses are complete…', 'bys' )
								: __( 'Message shown while courses are incomplete…', 'bys' )
							}
						/>
					</div>

					<div className="bys-ca__cta">
						<RichText
							tagName="span"
							className={ `btn ${ showUnlocked ? 'bys-ca__btn bys-ca__btn--active' : 'bys-ca__btn bys-ca__btn--disabled' }` }
							value={ ctaLabel }
							onChange={ val => setAttributes( { ctaLabel: val } ) }
							placeholder={ __( 'Button label…', 'bys' ) }
							allowedFormats={ [] }
						/>
						{ ctaOpenModal && showUnlocked && (
							<span className="bys-ca__modal-badge">
								{ __( 'Opens modal', 'bys' ) }
							</span>
						) }
					</div>

				</div>
			</div>
		</>
	);
}
