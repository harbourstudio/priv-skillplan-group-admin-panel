import { useEffect } from 'react';
import { __ } from '@wordpress/i18n';
import {
	useBlockProps, InspectorControls, PanelColorSettings, RichText, BlockControls,
	MediaUpload, MediaUploadCheck,
} from '@wordpress/block-editor';
import { PanelBody, PanelRow, TextControl, Button } from '@wordpress/components';
import { MediaToolbar, Image } from '@10up/block-components';
import './style.scss';
import './editor.scss';

const FALLBACK_START = '#1a1a2e';
const FALLBACK_END   = '#16213e';

export default function Edit( { clientId, attributes, setAttributes } ) {
	const { blockId, heading, subtext, videoUrl, imageId, imageAlt, focalPoint, heroStartColour, heroEndColour, logoId, logoUrl, logoAlt } = attributes;

	useEffect( () => {
		if ( blockId !== clientId ) setAttributes( { blockId: clientId } );
	}, [ clientId ] );

	const gradientStart = heroStartColour || FALLBACK_START;
	const gradientEnd   = heroEndColour   || FALLBACK_END;

	const blockProps = useBlockProps( {
		className: 'bys-lander-hero pt-hh alignfull',
		style: { background: `linear-gradient(135deg, ${ gradientStart }, ${ gradientEnd })` },
	} );

	return (
		<>
			<BlockControls>
				<MediaToolbar
					isOptional
					id={ imageId || undefined }
					onSelect={ ( img ) => setAttributes( { imageId: img.id, imageUrl: img.url, imageAlt: img.alt || '' } ) }
					onRemove={ () => setAttributes( { imageId: 0, imageUrl: '', imageAlt: '' } ) }
				/>
			</BlockControls>

			<InspectorControls>
				<PanelBody title={ __( 'Hero Settings', 'bys' ) } initialOpen={ true }>
					<PanelRow>
						<TextControl
							label={ __( 'Video URL', 'bys' ) }
							value={ videoUrl }
							onChange={ ( val ) => setAttributes( { videoUrl: val } ) }
							placeholder="https://…"
							help={ __( 'Replaces the image when set.', 'bys' ) }
							__nextHasNoMarginBottom
						/>
					</PanelRow>
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
				<PanelColorSettings
					title={ __( 'Gradient Colours', 'bys' ) }
					initialOpen={ false }
					colorSettings={ [
						{
							label:    __( 'Gradient Start', 'bys' ),
							value:    heroStartColour || undefined,
							onChange: ( val ) => setAttributes( { heroStartColour: val || '' } ),
						},
						{
							label:    __( 'Gradient End', 'bys' ),
							value:    heroEndColour || undefined,
							onChange: ( val ) => setAttributes( { heroEndColour: val || '' } ),
						},
					] }
				/>
			</InspectorControls>

			<section { ...blockProps }>
				<div className="container">
					<div className="bys-lander-hero__inner">

						{ /* ── Left: heading + subtext ── */ }
						<div className="bys-lander-hero__left">
							<div className="bys-lander-hero__left-inner">

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
									value={ heading }
									onChange={ ( val ) => setAttributes( { heading: val } ) }
									placeholder={ __( 'Heading…', 'bys' ) }
									allowedFormats={ [] }
								/>

								<RichText
									tagName="div"
									className="bys-lander-hero__subtext"
									value={ subtext }
									onChange={ ( val ) => setAttributes( { subtext: val } ) }
									placeholder={ __( 'Subtext…', 'bys' ) }
								/>

							</div>
						</div>

						{ /* ── Right: video placeholder or image ── */ }
						<div className="bys-lander-hero__right">
							{ videoUrl ? (
								<div className="bys-lander-hero__video">
									<span className="bys-lander-hero__video-label">
										▶&nbsp;{ __( 'Video preview renders on the frontend', 'bys' ) }
									</span>
								</div>
							) : (
								<div className="bys-lander-hero__image">
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

					</div>
				</div>
			</section>
		</>
	);
}
