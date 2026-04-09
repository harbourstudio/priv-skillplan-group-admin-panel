/**
 * Shared block functions
 *
 * Usage:
 *   import { formatScore, formatDate } from '../_shared/helpers.js';
 *
 */

export function formatScore(percent, pointsScored, pointsTotal) {
  if (percent === null || percent === undefined) return '—';

  if (pointsScored === null || pointsTotal === null) return `${percent}%`;

  const pct = parseFloat(Number(percent).toFixed(2));
  return `${pointsScored}/${pointsTotal} (${pct}%)`;
}

export function formatDate(timestamp) {
  if (!timestamp) return '—';

  try {
    return new Date(timestamp).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
  } catch {
    return '—';
  }
}

export function formatTime(timestamp) {
  if (!timestamp) return '—';

  try {
    return new Date(timestamp).toLocaleString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
    });
  } catch {
    return '—';
  }
}

export function formatDuration(seconds) {
  if ( ! seconds || seconds <= 0 ) return '—';
  const h = Math.floor( seconds / 3600 );
  const m = Math.floor( ( seconds % 3600 ) / 60 );
  const s = Math.floor( seconds % 60 );
  if ( h > 0 ) return `${h}h ${m}m`;
  if ( m > 0 ) return `${m}m ${s}s`;
  return `${s}s`;
}

export function formatDateTime(timestamp) {
  if (!timestamp) return '—';

  try {
    return new Date(timestamp).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
    });
  } catch {
    return '—';
  }
}
