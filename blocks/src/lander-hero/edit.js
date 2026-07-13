import { useEffect } from 'react';
import { __ } from '@wordpress/i18n';
import {
	useBlockProps, InspectorControls, RichText, BlockControls,
	MediaUpload, MediaUploadCheck,
} from '@wordpress/block-editor';
import {
	PanelBody, PanelRow, TextControl, Button, ColorPicker,
	__experimentalToggleGroupControl as ToggleGroupControl,
	__experimentalToggleGroupControlOption as ToggleGroupControlOption,
} from '@wordpress/components';
import { MediaToolbar, Image } from '@10up/block-components';
import './style.scss';
import './editor.scss';

const FALLBACK_START = '#1a1a2e';
const FALLBACK_END   = '#16213e';

export default function Edit( { clientId, attributes, setAttributes } ) {
	const {
		blockId, heading, subtext,
		videoUrl, imageId, imageUrl, imageAlt, focalPoint,
		heroStartColour, heroEndColour,
		logoId, logoUrl, logoAlt,
		mediaType, mediaPosition, imageFit,
		headingColour, textColour,
		bgImageId, bgImageUrl,
	} = attributes;

	useEffect( () => {
		if ( blockId !== clientId ) setAttributes( { blockId: clientId } );
		// Migrate blocks saved before mediaType existed: if videoUrl is set, switch to video
		if ( mediaType === 'image' && videoUrl ) setAttributes( { mediaType: 'video' } );
	}, [ clientId ] ); // eslint-disable-line react-hooks/exhaustive-deps

	const gradientStart = heroStartColour || FALLBACK_START;
	const gradientEnd   = heroEndColour   || FALLBACK_END;

	const bgStyle = bgImageUrl
		? {
			backgroundImage: `linear-gradient(135deg, ${ gradientStart }, ${ gradientEnd }), url(${ bgImageUrl })`,
			backgroundSize: 'auto, cover',
			backgroundPosition: 'center',
		}
		: { background: `linear-gradient(135deg, ${ gradientStart }, ${ gradientEnd })` };

	const blockProps = useBlockProps( {
		className: 'bys-lander-hero pt-hh alignfull',
		style: bgStyle,
	} );

	return (
		<>
			{ mediaType === 'image' && (
				<BlockControls>
					<MediaToolbar
						isOptional
						id={ imageId || undefined }
						onSelect={ ( img ) => setAttributes( { imageId: img.id, imageUrl: img.url, imageAlt: img.alt || '' } ) }
						onRemove={ () => setAttributes( { imageId: 0, imageUrl: '', imageAlt: '' } ) }
					/>
				</BlockControls>
			) }

			<InspectorControls>
				<PanelBody title={ __( 'Hero Settings', 'bys' ) } initialOpen={ true }>
					<ToggleGroupControl
						label={ __( 'Media', 'bys' ) }
						value={ mediaType }
						onChange={ ( val ) => setAttributes( { mediaType: val } ) }
						isBlock
					>
						<ToggleGroupControlOption value="image" label={ __( 'Image', 'bys' ) } />
						<ToggleGroupControlOption value="video" label={ __( 'Video', 'bys' ) } />
						<ToggleGroupControlOption value="none"  label={ __( 'None', 'bys' ) }  />
					</ToggleGroupControl>
					{ mediaType !== 'none' && (
						<PanelRow>
							<ToggleGroupControl
								label={ __( 'Media position', 'bys' ) }
								value={ mediaPosition }
								onChange={ ( val ) => setAttributes( { mediaPosition: val } ) }
								isBlock
								__nextHasNoMarginBottom
							>
								<ToggleGroupControlOption value="right" label={ __( 'Right', 'bys' ) } />
								<ToggleGroupControlOption value="left"  label={ __( 'Left', 'bys' ) }  />
							</ToggleGroupControl>
						</PanelRow>
					) }
					{ mediaType === 'image' && (
						<PanelRow>
							<ToggleGroupControl
								label={ __( 'Image fit', 'bys' ) }
								value={ imageFit }
								onChange={ ( val ) => setAttributes( { imageFit: val } ) }
								isBlock
								__nextHasNoMarginBottom
							>
								<ToggleGroupControlOption value="cover"   label={ __( 'Cover', 'bys' ) } />
								<ToggleGroupControlOption value="contain" label={ __( 'Contain', 'bys' ) } />
							</ToggleGroupControl>
						</PanelRow>
					) }
					{ mediaType === 'video' && (
						<PanelRow>
							<TextControl
								label={ __( 'Video URL', 'bys' ) }
								value={ videoUrl }
								onChange={ ( val ) => setAttributes( { videoUrl: val } ) }
								placeholder="https://…"
								help={ __( 'Paste an embed URL or a direct video file URL.', 'bys' ) }
								__nextHasNoMarginBottom
							/>
						</PanelRow>
					) }
				</PanelBody>

				<PanelBody title={ __( 'Logo Override', 'bys' ) } initialOpen={ false }>
					<MediaUploadCheck>
						<MediaUpload
							onSelect={ ( img ) => setAttributes( { logoId: img.id, logoUrl: img.url, logoAlt: img.alt || '' } ) }
							allowedTypes={ [ 'image' ] }
							value={ logoId || undefined }
							render={ ( { open } ) => (
								<div className="bys-lander-hero__logo-inspector">
									{ logoUrl && (
										<div className="bys-lander-hero__logo-inspector-preview">
											<img src={ logoUrl } alt={ logoAlt } />
										</div>
									) }
									<Button variant={ logoId ? 'secondary' : 'primary' } onClick={ open }>
										{ logoId ? __( 'Replace logo', 'bys' ) : __( 'Set logo override', 'bys' ) }
									</Button>
									{ logoId && (
										<Button
											variant="link"
											isDestructive
											onClick={ () => setAttributes( { logoId: 0, logoUrl: '', logoAlt: '' } ) }
										>
											{ __( 'Remove override', 'bys' ) }
										</Button>
									) }
								</div>
							) }
						/>
					</MediaUploadCheck>
					<p className="bys-lander-hero__logo-inspector-note">
						{ __( 'Leave blank to use the organization logo.', 'bys' ) }
					</p>
				</PanelBody>

				<PanelBody title={ __( 'Gradient Colours', 'bys' ) } initialOpen={ false }>
					<p style={ { marginBottom: '8px', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase' } }>
						{ __( 'Gradient Start', 'bys' ) }
					</p>
					<ColorPicker
						color={ heroStartColour || FALLBACK_START }
						onChange={ ( val ) => setAttributes( { heroStartColour: val } ) }
						enableAlpha
						copyFormat="hex"
					/>
					<p style={ { margin: '12px 0 8px', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase' } }>
						{ __( 'Gradient End', 'bys' ) }
					</p>
					<ColorPicker
						color={ heroEndColour || FALLBACK_END }
						onChange={ ( val ) => setAttributes( { heroEndColour: val } ) }
						enableAlpha
						copyFormat="hex"
					/>
				</PanelBody>

				<PanelBody title={ __( 'Background Image', 'bys' ) } initialOpen={ false }>
					<MediaUploadCheck>
						<MediaUpload
							onSelect={ ( img ) => setAttributes( { bgImageId: img.id, bgImageUrl: img.url } ) }
							allowedTypes={ [ 'image' ] }
							value={ bgImageId || undefined }
							render={ ( { open } ) => (
								<div className="bys-lander-hero__logo-inspector">
									{ bgImageUrl && (
										<div className="bys-lander-hero__logo-inspector-preview">
											<img src={ bgImageUrl } alt="" />
										</div>
									) }
									<Button variant={ bgImageId ? 'secondary' : 'primary' } onClick={ open }>
										{ bgImageId ? __( 'Replace background image', 'bys' ) : __( 'Set background image', 'bys' ) }
									</Button>
									{ bgImageId && (
										<Button
											variant="link"
											isDestructive
											onClick={ () => setAttributes( { bgImageId: 0, bgImageUrl: '' } ) }
										>
											{ __( 'Remove background image', 'bys' ) }
										</Button>
									) }
								</div>
							) }
						/>
					</MediaUploadCheck>
					<p className="bys-lander-hero__logo-inspector-note">
						{ __( 'The gradient renders over the background image. Lower the opacity of your gradient colours to let the image show through.', 'bys' ) }
					</p>
				</PanelBody>

				<PanelBody title={ __( 'Text Colours', 'bys' ) } initialOpen={ false }>
					<p style={ { marginBottom: '8px', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase' } }>
						{ __( 'Heading', 'bys' ) }
					</p>
					<ColorPicker
						color={ headingColour || '#ffffff' }
						onChange={ ( val ) => setAttributes( { headingColour: val } ) }
						enableAlpha
						copyFormat="hex"
					/>
					<p style={ { margin: '12px 0 8px', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase' } }>
						{ __( 'Body text', 'bys' ) }
					</p>
					<ColorPicker
						color={ textColour || 'rgba(255,255,255,0.88)' }
						onChange={ ( val ) => setAttributes( { textColour: val } ) }
						enableAlpha
						copyFormat="hex"
					/>
				</PanelBody>
			</InspectorControls>

			<section { ...blockProps }>
				<div className="container">
					<div className="bys-lander-hero__inner" style={ mediaPosition === 'left' ? { flexDirection: 'row-reverse' } : undefined }>

						{ /* ── Left: logo + heading + subtext ── */ }
						<div className="bys-lander-hero__left">
							<div className={ `bys-lander-hero__left-inner${ mediaType === 'none' ? ' bys-lander-hero__left-inner--wide' : '' }` } style={ mediaPosition === 'left' ? { marginInline: 'auto' } : undefined }>

								{ logoUrl ? (
									<div className="bys-lander-hero__logo">
										<img src={ logoUrl } alt={ logoAlt } />
									</div>
								) : (
									<p className="bys-lander-hero__logo-label">
										{ __( 'Org logo — set on organization', 'bys' ) }
									</p>
								) }

								<RichText
									tagName="h1"
									className="bys-lander-hero__heading"
									style={ headingColour ? { color: headingColour } : undefined }
									value={ heading }
									onChange={ ( val ) => setAttributes( { heading: val } ) }
									placeholder={ __( 'Heading…', 'bys' ) }
									allowedFormats={ [] }
								/>

								<RichText
									tagName="div"
									className="bys-lander-hero__subtext"
									style={ textColour ? { color: textColour } : undefined }
									value={ subtext }
									onChange={ ( val ) => setAttributes( { subtext: val } ) }
									placeholder={ __( 'Subtext…', 'bys' ) }
								/>

							</div>
						</div>

						{ /* ── Right: media or nothing ── */ }
						{ mediaType !== 'none' && (
							<div className="bys-lander-hero__right">
								{ mediaType === 'video' ? (
									<div className="bys-lander-hero__video">
										<span className={ `bys-lander-hero__video-label${ ! videoUrl ? ' bys-lander-hero__video-label--hint' : '' }` }>
											{ videoUrl
												? <>▶&nbsp;{ __( 'Video preview renders on the frontend', 'bys' ) }</>
												: __( 'Add a Video URL in the inspector.', 'bys' )
											}
										</span>
									</div>
								) : (
									<div className={ `bys-lander-hero__image bys-lander-hero__image--${ imageFit }` }>
										<Image
											id={ imageId || undefined }
											size="large"
											onSelect={ ( img ) => setAttributes( { imageId: img.id, imageUrl: img.url, imageAlt: img.alt || '' } ) }
											focalPoint={ focalPoint }
											onChangeFocalPoint={ ( val ) => setAttributes( { focalPoint: val } ) }
											labels={ {
												title:        __( 'Select Hero Image', 'bys' ),
												instructions: __( 'Upload an image or pick one from your media library.', 'bys' ),
											} }
										/>
									</div>
								) }
							</div>
						) }

					</div>
				</div>
			</section>
		</>
	);
}
