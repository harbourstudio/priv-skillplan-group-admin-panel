<?php
/**
 * Quiz Unavailable Template
 *
 * Displays when a quiz is outside its date access window.
 *
 * @since 1.0.0
 * @package BYS_Groups
 */

if (!defined('ABSPATH')) {
	exit;
}

// Define status styling
$status_classes = [
	'passed'    => 'bg-gradient-green',
	'failed'    => 'bg-gradient-orange-yellow',
	'not_taken' => 'bg-gradient-cyan',
];

$status_badges = [
	'passed'    => '<span class="badge green"><strong>Status:</strong> Passed</span>',
	'failed'    => '<span class="badge orange"><strong>Status:</strong> Not Passed Yet</span>',
	'not_taken' => '<span class="badge cyan"><strong>Status:</strong> Not Taken</span>',
];
?>

<style>
/* Temp style rules to override Uncanny Owl styles */
.course-sidebar .ultp-lazy-course-navigation {
	.ld-status-icon.ld-status-waiting {
		display: none;
	}
}
</style>

<div class="row !w-full !ml-0">
	<?php get_template_part('template-parts/content/course-sidebar'); ?>

	<div class="lg:w-[calc(100vw-18.75rem)] lg:ml-[18.75rem] container !max-w-none lg:!px-8 pt-9 course-content transition">
		<main id="main" class="site-main learndash-main max-w-3xl mx-auto pt-7">
			<header class="course-overview rounded-md quiz-overview mb-7 !bg-gradient-to-br p-5 lg:p-6 <?php echo esc_attr( $status_classes[ $status ] ?? $status_classes['not_taken'] ); ?>">
				<div class="row items-center min-h-[16rem]">
					<div class="col lg:w-7/12">
						<div class="lg:pr-7 flex flex-col gap-6">
							<ul class="badge-list !mt-0 lg:!mt-4">
								<li><?php echo wp_kses_post( $status_badges[ $status ] ?? $status_badges['not_taken'] ); ?></li>
							</ul>
							<div class="flush-bottom">
								<h1 class="!mb-4"><?php echo wp_kses_post( $post->post_title ); ?></h1>
								<p>
								<?php esc_html_e('Demonstrate your understanding before moving on.', 'bys'); ?>
								</p>
							</div>
						</div>
					</div>
					<div class="col lg:w-5/12 text-center">
						<lottie-player
							src="<?php echo esc_url( get_stylesheet_directory_uri() . '/assets/lotties/skillplan-ld-quizzes.json' ); ?>"
							speed="1"
							loop
							autoplay>
						</lottie-player>
					</div>
				</div>
			</header>

			<div class="mt-7 mb-7">
				<div id="bys-quiz-unavailable-notice" class="ld-alert ld-alert-warning" role="status">
					<div class="ld-alert-content">
						<div aria-hidden="true" class="ld-alert-icon ld-icon ld-icon-alert"></div>
						<div class="ld-alert-messages">
							<?php echo wp_kses_post( $message ); ?>
						</div>
					</div>
				</div>
			</div>
		</main>
	</div>
</div>
