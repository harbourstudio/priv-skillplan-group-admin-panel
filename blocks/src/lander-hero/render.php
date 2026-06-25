<?php
$lander_id = get_the_ID();
if ( ! $lander_id ) return;

$d = bys_lander_resolve( $lander_id );
if ( empty( $d ) ) return;

$heading    = ( $attributes['heading']  ?? '' ) ?: get_the_title( $lander_id );
$subtext    = $attributes['subtext']  ?? '';
$media_type = $attributes['mediaType'] ?? 'image';
// Backward compat: blocks saved before mediaType existed may have videoUrl set
if ( $media_type === 'image' && ! empty( $attributes['videoUrl'] ) ) {
    $media_type = 'video';
}
$video_url = $media_type === 'video' ? ( $attributes['videoUrl'] ?? '' ) : '';
$image_fit      = $attributes['imageFit']      ?? 'cover';
$media_position = $attributes['mediaPosition'] ?? 'right';
$heading_colour = $attributes['headingColour'] ?? '';
$text_colour    = $attributes['textColour']    ?? '';
$image     = ( $media_type === 'image' && ! empty( $attributes['imageId'] ) )
    ? [ 'url' => $attributes['imageUrl'] ?? '', 'alt' => $attributes['imageAlt'] ?? '', 'width' => '', 'height' => '' ]
    : null;
$logo = ! empty( $attributes['logoId'] )
    ? [ 'url' => $attributes['logoUrl'] ?? '', 'alt' => $attributes['logoAlt'] ?? '', 'width' => '', 'height' => '' ]
    : $d['logo'];
$hero_start    = ( $attributes['heroStartColour'] ?? '' ) ?: $d['hero_start_colour'];
$hero_end      = ( $attributes['heroEndColour']   ?? '' ) ?: $d['hero_end_colour'];
$bg_image_url  = ( ! empty( $attributes['bgImageId'] ) && ! empty( $attributes['bgImageUrl'] ) )
    ? $attributes['bgImageUrl']
    : '';
$footer_colour      = $d['footer_colour'];
$footer_text_colour = $d['footer_text_colour'] ?? '';
$button_colour      = $d['button_colour'];
$page_colour        = $d['page_colour'];

$gradient = 'linear-gradient(135deg, ' . esc_attr( $hero_start ) . ', ' . esc_attr( $hero_end ) . ')';
$bg_style = $bg_image_url
    ? 'background: ' . $gradient . ', url(' . esc_url( $bg_image_url ) . ') center / cover no-repeat;'
    : 'background: ' . $gradient . ';';

$wrapper_attributes = get_block_wrapper_attributes( [
    'class' => 'bys-lander-hero pt-hh',
    'style' => $bg_style,
] );
?>

<?php if ( $footer_colour || $footer_text_colour || $button_colour || $page_colour ) : ?>
    <style>
        <?php if ( $page_colour ) : ?>
            #content{
                background-color: <?php echo esc_attr( $page_colour ); ?> !important; 
            }
        <?php endif; ?>
        <?php if ( $footer_colour ) : ?>
            #colophon { 
                background-color: <?php echo esc_attr( $footer_colour ); ?> !important; 
            }
        <?php endif; ?>
        <?php if ( $footer_text_colour ) : ?>
            #colophon,
            #colophon h1, #colophon h2, #colophon h3, #colophon h4, #colophon h5, #colophon h6,
            #colophon i, #colophon span, #colophon p, #colophon li,
            #colophon a, #colophon a:hover, #colophon a:focus { 
                color: <?php echo esc_attr( $footer_text_colour ); ?> !important; 
            }
            .footer-brand svg, .footer-brand svg * { 
                fill: <?php echo esc_attr( $footer_text_colour ); ?> !important; 
            }
        <?php elseif ( $footer_colour ) : ?>
            .footer-brand svg, .footer-brand svg * { 
                fill: #fff !important; 
            }
        <?php endif; ?>
        <?php if ( $button_colour ) : ?>
            .wp-block-bys-groups-lander-course-list .btn.btn-primary:not([disabled]),
            .wp-block-bys-groups-lander-completion-alert .btn.btn-primary:not([disabled]),
            #content :is(.wp-block-button__link.wp-element-button, .btn.btn-primary):not([disabled]),
            #colophon .btn.btn-primary:not([disabled]) {
                background-color: <?php echo esc_attr( $button_colour ); ?> !important;
                border-color: <?php echo esc_attr( $button_colour ); ?> !important;
            }

            main.bys-lander .wp-block-bys-groups-lander-course-list .hs-dropdown-toggle i{
                color: <?php echo esc_attr( $button_colour ); ?> !important;
            }
        <?php endif; ?>
    </style>
<?php endif; ?>

<section <?php echo $wrapper_attributes; ?>>
    <div class="container">
        <div class="bys-lander-hero__inner"<?php echo $media_position === 'left' ? ' style="flex-direction:row-reverse;"' : ''; ?>>

            <div class="bys-lander-hero__left">
                <div class="bys-lander-hero__left-inner<?php echo $media_type === 'none' ? ' bys-lander-hero__left-inner--wide' : ''; ?>"<?php echo $media_position === 'left' ? ' style="margin-inline:auto;"' : ''; ?>>

                    <?php if ( $logo ) : ?>
                        <div class="bys-lander-hero__logo">
                            <img src="<?php echo esc_url( $logo['url'] ); ?>"
                                 alt="<?php echo esc_attr( $logo['alt'] ?: get_the_title( $d['org_id'] ) ); ?>"
                                 width="<?php echo esc_attr( $logo['width'] ); ?>"
                                 height="<?php echo esc_attr( $logo['height'] ); ?>">
                        </div>
                    <?php endif; ?>

                    <h1 class="bys-lander-hero__heading"<?php echo $heading_colour ? ' style="color:' . esc_attr( $heading_colour ) . ';"' : ''; ?>>
                        <?php echo esc_html( $heading ); ?>
                    </h1>

                    <?php if ( $subtext ) : ?>
                        <div class="bys-lander-hero__subtext"<?php echo $text_colour ? ' style="color:' . esc_attr( $text_colour ) . ';"' : ''; ?>>
                            <?php echo wp_kses_post( $subtext ); ?>
                        </div>
                    <?php endif; ?>

                </div>
            </div>

            <?php if ( $media_type !== 'none' ) : ?>
            <div class="bys-lander-hero__right">

                <?php if ( $video_url ) : ?>
                    <div class="bys-lander-hero__video">
                        <?php
                        $embed = wp_oembed_get( $video_url, [ 'width' => 640 ] );
                        if ( $embed ) {
                            echo $embed;
                        } else {
                            printf( '<video src="%s" controls playsinline></video>', esc_url( $video_url ) );
                        }
                        ?>
                    </div>
                <?php elseif ( $image ) : ?>
                    <div class="bys-lander-hero__image bys-lander-hero__image--<?php echo esc_attr( $image_fit ); ?>">
                        <img src="<?php echo esc_url( $image['url'] ); ?>"
                             alt="<?php echo esc_attr( $image['alt'] ); ?>"
                             width="<?php echo esc_attr( $image['width'] ); ?>"
                             height="<?php echo esc_attr( $image['height'] ); ?>">
                    </div>
                <?php endif; ?>

            </div>
            <?php endif; ?>

        </div>
    </div>
</section>
