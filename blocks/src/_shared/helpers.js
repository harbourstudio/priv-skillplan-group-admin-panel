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

/**
 * Convert a UTC ISO 8601 string to a local datetime string in
 * `YYYY-MM-DDTHH:mm` format (the dateFormat used by Flatpickr).
 *
 * @param {string} utcDatetimeValue ISO 8601 UTC datetime
 * @returns {string} Local datetime in YYYY-MM-DDTHH:mm, or '' if invalid
 */
export function convertFromUTC(utcDatetimeValue) {
  if (!utcDatetimeValue) return '';
  const dt = new Date(utcDatetimeValue);
  if (isNaN(dt.getTime())) return '';
  const Y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const d = String(dt.getDate()).padStart(2, '0');
  const H = String(dt.getHours()).padStart(2, '0');
  const i = String(dt.getMinutes()).padStart(2, '0');
  return `${Y}-${m}-${d}T${H}:${i}`;
}

/**
 * Convert a Flatpickr-style local datetime string (`YYYY-MM-DDTHH:mm`)
 * into a UTC ISO 8601 string suitable for sending to a server.
 *
 * @param {string} localDatetimeValue Local datetime in YYYY-MM-DDTHH:mm
 * @returns {string} UTC ISO 8601 string, or '' if input is empty
 */
export function convertToUTC(localDatetimeValue) {
  if (!localDatetimeValue) return '';
  const [datePart, timePart] = localDatetimeValue.split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hours, minutes] = timePart.split(':').map(Number);
  return new Date(year, month - 1, day, hours, minutes).toISOString();
}
