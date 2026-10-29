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

$gradient = 'linear-gradient(135deg, ' . esc_attr( $hero_start ) . ', ' . esc_attr( $hero_end ) . ')';
$bg_style = $bg_image_url
    ? 'background: ' . $gradient . ', url(' . esc_url( $bg_image_url ) . ') center / cover no-repeat;'
    : 'background: ' . $gradient . ';';

$wrapper_attributes = get_block_wrapper_attributes( [
    'class' => 'bys-lander-hero pt-hh',
    'style' => $bg_style,
] );
?>


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
