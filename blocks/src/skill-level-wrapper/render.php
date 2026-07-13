<?php
$skill_level = $attributes['skillLevel'] ?? '';

if ( ! empty( $skill_level ) ) {
    $user_trade_raw = get_user_meta( get_current_user_id(), 'trade_experience', true );
    // meta may be stored as an array (e.g. ['Apprentice']); extract the string
    $user_trade = strtolower( trim(
        is_array( $user_trade_raw ) ? (string) ( $user_trade_raw[0] ?? '' ) : (string) $user_trade_raw
    ) );

    if ( strtolower( $skill_level ) !== $user_trade ) {
        return;
    }
}

echo $content;
