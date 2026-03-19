<?php
$attrs = ['blockId'];
foreach ($attrs as $a) {
    if (isset($attributes[$a])) {
        if (is_bool($attributes[$a])) {
            ${$a} = $attributes[$a];
        } elseif (is_string($attributes[$a])) {
            ${$a} = $attributes[$a] !== '' ? $attributes[$a] : '';
        } else {
            ${$a} = $attributes[$a] !== null ? $attributes[$a] : '';
        }
    } else {
        ${$a} = '';
    }
}

$wrapper_attributes = get_block_wrapper_attributes();

// ─── Quiz Attempts Modal Data ───
// TODO: Replace with REST API call to get quiz attempts for a specific quiz
$quiz = [
    'name'       => 'Recognizing Fractions',
    'short_name' => 'MF EL',
];

$attempts = [
    ['number' => 1, 'date' => 'Jan 12, 2025', 'score' => '9/10 (90%)', 'result' => 'fail'],
    ['number' => 2, 'date' => 'Jan 19, 2025', 'score' => '9/10 (90%)', 'result' => 'fail'],
    ['number' => 3, 'date' => 'Feb 3, 2025',  'score' => '9/10 (90%)', 'result' => 'pass'],
];

$result_labels = [
    'pass' => 'Passed',
    'fail' => 'Failed',
];
?>

<div <?= $wrapper_attributes; ?>>

    <!-- Modal -->
    <div
        id="quiz-attempts-modal"
        class="hs-overlay hidden w-full h-full fixed top-0 left-0 z-[9998] overflow-x-hidden overflow-y-auto bg-[rgba(0,0,0,0.65)]"
        role="dialog"
        tabindex="-1"
        aria-labelledby="quiz-attempts-modal-label"
    >
        <div class="hs-overlay-open:opacity-100 hs-overlay-open:duration-500 my-0 mx-auto h-screen flex flex-col justify-center opacity-0 ease-out transition-all">
            <div class="modal__container">

                <div class="modal__header">
                    <h3 id="quiz-attempts-modal-label" class="modal__title course__long-name">
                        <?= esc_html($quiz['name']); ?>
                    </h3>
                    <span class="course__short-name">
                        <?= esc_html($quiz['short_name']); ?>
                    </span>
                </div>

                <div class="modal__body">
                    <table class="attempts-table">
                        <thead>
                            <tr>
                                <th>Attempt</th>
                                <th>Date</th>
                                <th>Score</th>
                                <th>Result</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php foreach ($attempts as $attempt) : ?>
                            <tr>
                                <td><?= (int) $attempt['number']; ?></td>
                                <td><?= esc_html($attempt['date']); ?></td>
                                <td><?= esc_html($attempt['score']); ?></td>
                                <td><span class="result-badge result-badge--<?= esc_attr($attempt['result']); ?>"><?= esc_html($result_labels[$attempt['result']]); ?></span></td>
                            </tr>
                            <?php endforeach; ?>
                        </tbody>
                    </table>
                </div>

                <div class="modal__footer">
                    <button
                        type="button"
                        class="modal__close-btn btn-unstyled"
                        data-hs-overlay="#quiz-attempts-modal"
                    >
                        Close
                    </button>
                </div>

            </div>
        </div>
    </div>

</div>