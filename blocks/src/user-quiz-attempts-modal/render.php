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
?>

<div <?= $wrapper_attributes; ?>>

    <!-- Trigger Button -->
    <button
        type="button"
        class="quiz-attempts__trigger"
        data-hs-overlay="#quiz-attempts-modal"
    >
        <i class="fa-solid fa-clock-rotate-left"></i>
        View Quiz Attempts
    </button>

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
                        Recognizing Fractions
                    </h3>
                    <span class="course__short-name">
                        MF EL
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
                            <tr>
                                <td>1</td>
                                <td>Jan 12, 2025</td>
                                <td>9/10 (90%)</td>
                                <td><span class="result-badge result-badge--fail">Failed</span></td>
                            </tr>
                            <tr>
                                <td>2</td>
                                <td>Jan 19, 2025</td>
                                <td>9/10 (90%)</td>
                                <td><span class="result-badge result-badge--fail">Failed</span></td>
                            </tr>
                            <tr>
                                <td>3</td>
                                <td>Feb 3, 2025</td>
                                <td>9/10 (90%)</td>
                                <td><span class="result-badge result-badge--pass">Passed</span></td>
                            </tr>
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