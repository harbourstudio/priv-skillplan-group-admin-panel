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

  return `${pointsScored}/${pointsTotal} (${percent}%)`;
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
