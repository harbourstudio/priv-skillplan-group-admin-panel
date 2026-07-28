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
	BaseControl,
	ColorPicker,
	Dropdown,
	Button,
	Flex,
	FlexItem,
} from '@wordpress/components';
import './editor.scss';

// Compact colour control: swatch that opens a full ColorPicker popover.
function ColorControl( { label, value, onChange } ) {
	const checkerboard = 'linear-gradient(45deg,#ccc 25%,transparent 25%,transparent 75%,#ccc 75%),' +
		'linear-gradient(45deg,#ccc 25%,transparent 25%,transparent 75%,#ccc 75%)';

	return (
		<BaseControl label={ label } __nextHasNoMarginBottom>
			<Dropdown
				popoverProps={ { placement: 'bottom-start', offset: 4 } }
				renderToggle={ ( { isOpen, onToggle } ) => (
					<Flex align="center" gap={ 2 } style={ { marginTop: 4 } }>
						<FlexItem>
							<button
								type="button"
								onClick={ onToggle }
								aria-expanded={ isOpen }
								style={ {
									width: 22,
									height: 22,
									borderRadius: 3,
									border: '1px solid rgba(0,0,0,.25)',
									background: value || 'transparent',
									...( ! value && {
										backgroundImage: checkerboard,
										backgroundSize: '8px 8px',
										backgroundPosition: '0 0, 4px 4px',
									} ),
									cursor: 'pointer',
									padding: 0,
									flexShrink: 0,
								} }
							/>
						</FlexItem>
						<FlexItem isBlock>
							<code style={ { fontSize: 11, color: '#666' } }>
								{ value || __( 'Default', 'bys' ) }
							</code>
						</FlexItem>
						{ value && (
							<FlexItem>
								<Button
									size="small"
									variant="tertiary"
									style={ { minWidth: 0, padding: '0 4px' } }
									onClick={ e => { e.stopPropagation(); onChange( '' ); } }
									label={ __( 'Reset to default', 'bys' ) }
								>
									{ '×' }
								</Button>
							</FlexItem>
						) }
					</Flex>
				) }
				renderContent={ () => (
					<div style={ { padding: 8 } }>
						<ColorPicker
							color={ value || '' }
							onChange={ val => onChange( typeof val === 'string' ? val : ( val?.hex ?? '' ) ) }
							enableAlpha={ false }
						/>
					</div>
				) }
			/>
		</BaseControl>
	);
}

export default function Edit( { clientId, attributes, setAttributes } ) {
	const {
		blockId,
		lockedText, unlockedText,
		ctaLabel, ctaUrl, ctaOpenModal,
		lockedBgColor, lockedBorderColor, lockedTextColor, lockedIconColor, lockedBtnColor, lockedHideIcon,
		unlockedBgColor, unlockedBorderColor, unlockedTextColor, unlockedIconColor, unlockedBtnColor, unlockedHideIcon,
	} = attributes;

	const [ showUnlocked, setShowUnlocked ] = useState( false );

	useEffect( () => {
		if ( blockId !== clientId ) setAttributes( { blockId: clientId } );
	}, [ clientId ] );

	const blockProps = useBlockProps( { className: 'bys-lander-courses' } );
	const alertMod   = showUnlocked ? 'bys-lander-completion-alert--unlocked' : 'bys-lander-completion-alert--locked';
	const hideIcon   = showUnlocked ? unlockedHideIcon : lockedHideIcon;

	// Inline styles for the editor preview, reflecting the active state's custom colours.
	const bgColor     = showUnlocked ? unlockedBgColor     : lockedBgColor;
	const borderColor = showUnlocked ? unlockedBorderColor : lockedBorderColor;
	const textColor   = showUnlocked ? unlockedTextColor   : lockedTextColor;
	const iconColor   = showUnlocked ? unlockedIconColor   : lockedIconColor;
	const btnColor    = showUnlocked ? unlockedBtnColor    : lockedBtnColor;

	const alertStyle = {
		...( bgColor     && { backgroundColor: bgColor } ),
		...( borderColor && { borderColor } ),
		...( textColor   && { color: textColor } ),
	};
	const iconStyle = iconColor ? { color: iconColor } : {};
	const btnStyle  = btnColor  ? { backgroundColor: btnColor, borderColor: btnColor } : {};

	const set = key => val => setAttributes( { [ key ]: val ?? '' } );

	const colorPanel = ( title, hideIconKey, keys ) => {
		const iconHidden = attributes[ hideIconKey ];
		return (
			<PanelBody title={ title } initialOpen={ false }>
				<ToggleControl
					label={ __( 'Hide icon', 'bys' ) }
					checked={ iconHidden }
					onChange={ val => setAttributes( { [ hideIconKey ]: val } ) }
					__nextHasNoMarginBottom
				/>
				<ColorControl label={ __( 'Background', 'bys' ) } value={ attributes[ keys.bg ]     } onChange={ set( keys.bg )     } />
				<ColorControl label={ __( 'Border',     'bys' ) } value={ attributes[ keys.border ] } onChange={ set( keys.border ) } />
				<ColorControl label={ __( 'Text',       'bys' ) } value={ attributes[ keys.text ]   } onChange={ set( keys.text )   } />
				{ ! iconHidden && (
					<ColorControl label={ __( 'Icon', 'bys' ) } value={ attributes[ keys.icon ] } onChange={ set( keys.icon ) } />
				) }
				<ColorControl label={ __( 'Button', 'bys' ) } value={ attributes[ keys.btn ] } onChange={ set( keys.btn ) } />
			</PanelBody>
		);
	};

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

				{ colorPanel( __( 'Locked State Colors', 'bys' ), 'lockedHideIcon', {
					bg:     'lockedBgColor',
					border: 'lockedBorderColor',
					text:   'lockedTextColor',
					icon:   'lockedIconColor',
					btn:    'lockedBtnColor',
				} ) }

				{ colorPanel( __( 'Unlocked State Colors', 'bys' ), 'unlockedHideIcon', {
					bg:     'unlockedBgColor',
					border: 'unlockedBorderColor',
					text:   'unlockedTextColor',
					icon:   'unlockedIconColor',
					btn:    'unlockedBtnColor',
				} ) }
			</InspectorControls>

			<div { ...blockProps }>
				<div className={ `bys-lander-completion-alert ${ alertMod }` } style={ alertStyle }>

					<div className="bys-ca__body">
						{ ! hideIcon && (
							<span
								className={ `dashicons ${ showUnlocked ? 'dashicons-yes' : 'dashicons-lock' } bys-ca__icon` }
								aria-hidden="true"
								style={ iconStyle }
							/>
						) }
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
							style={ btnStyle }
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
