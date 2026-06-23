<?php
$lander_id = get_the_ID();
if ( ! $lander_id ) return;

$d = bys_lander_resolve( $lander_id );
if ( empty( $d ) ) return;

$heading   = ( $attributes['heading']  ?? '' ) ?: get_the_title( $lander_id );
$subtext   = $attributes['subtext']  ?? '';
$video_url = $attributes['videoUrl'] ?? '';
$image     = ! empty( $attributes['imageId'] )
    ? [ 'url' => $attributes['imageUrl'] ?? '', 'alt' => $attributes['imageAlt'] ?? '', 'width' => '', 'height' => '' ]
    : null;
$logo = ! empty( $attributes['logoId'] )
    ? [ 'url' => $attributes['logoUrl'] ?? '', 'alt' => $attributes['logoAlt'] ?? '', 'width' => '', 'height' => '' ]
    : $d['logo'];
$hero_start    = ( $attributes['heroStartColour'] ?? '' ) ?: $d['hero_start_colour'];
$hero_end      = ( $attributes['heroEndColour']   ?? '' ) ?: $d['hero_end_colour'];
$footer_colour = $d['footer_colour'];
$button_colour = $d['button_colour'];

$wrapper_attributes = get_block_wrapper_attributes( [
    'class' => 'bys-lander-hero pt-hh',
    'style' => 'background: linear-gradient(135deg, ' . esc_attr( $hero_start ) . ', ' . esc_attr( $hero_end ) . ');',
] );
?>

<?php if ( $footer_colour || $button_colour ) : ?>
<style>
<?php if ( $footer_colour ) : ?>
#colophon { background-color: <?php echo esc_attr( $footer_colour ); ?> !important; }
.footer-brand svg, .footer-brand svg * { fill: #fff !important; }
<?php endif; ?>
<?php if ( $button_colour ) : ?>
.wp-block-bys-groups-lander-course-list .btn.btn-primary,
.wp-block-bys-groups-lander-completion-alert .btn.btn-primary {
    background-color: <?php echo esc_attr( $button_colour ); ?> !important;
    border-color: <?php echo esc_attr( $button_colour ); ?> !important;
}
<?php endif; ?>
</style>
<?php endif; ?>

<section <?php echo $wrapper_attributes; ?>>
    <div class="container">
        <div class="bys-lander-hero__inner">

            <div class="bys-lander-hero__left">
                <div class="bys-lander-hero__left-inner">

                    <?php if ( $logo ) : ?>
                        <div class="bys-lander-hero__logo">
                            <img src="<?php echo esc_url( $logo['url'] ); ?>"
                                 alt="<?php echo esc_attr( $logo['alt'] ?: get_the_title( $d['org_id'] ) ); ?>"
                                 width="<?php echo esc_attr( $logo['width'] ); ?>"
                                 height="<?php echo esc_attr( $logo['height'] ); ?>">
                        </div>
                    <?php endif; ?>

                    <h1 class="bys-lander-hero__heading">
                        <?php echo esc_html( $heading ); ?>
                    </h1>

                    <?php if ( $subtext ) : ?>
                        <div class="bys-lander-hero__subtext">
                            <?php echo wp_kses_post( $subtext ); ?>
                        </div>
                    <?php endif; ?>

                </div>
            </div>

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
                    <div class="bys-lander-hero__image">
                        <img src="<?php echo esc_url( $image['url'] ); ?>"
                             alt="<?php echo esc_attr( $image['alt'] ); ?>"
                             width="<?php echo esc_attr( $image['width'] ); ?>"
                             height="<?php echo esc_attr( $image['height'] ); ?>">
                    </div>
                <?php endif; ?>

            </div>

        </div>
    </div>
</section>
