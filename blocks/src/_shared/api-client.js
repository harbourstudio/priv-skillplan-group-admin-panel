/**
 * Shared API client with in-memory caching and request deduplication.
 * Prevents duplicate requests when multiple blocks fetch the same data.
 */

function getNonce() {
  // Read nonce from embedded script tag
  const el = document.querySelector('script[data-bys-nonce="wp_rest"]');
  if (!el) {
    return null;
  }
  try {
    return JSON.parse(el.textContent);
  } catch (err) {
    return null;
  }
}

export const api = {
  _cache: new Map(),
  _pending: new Map(),

  /**
   * Fetch data with automatic caching and deduplication.
   */
  async get(url, forceRefresh = false) {
    // Return cached response if available and not force-refreshing
    if (!forceRefresh && this._cache.has(url)) {
      return this._cache.get(url);
    }

    // Return existing pending request if one is already in flight
    if (this._pending.has(url)) {
      return this._pending.get(url);
    }

    // Make the request and cache the result
    const nonce = getNonce();
    const headers = {};
    if (nonce) {
      headers['X-WP-Nonce'] = nonce;
    }

    const promise = jQuery
      .ajax({
        url: url,
        type: 'GET',
        headers: headers,
        dataType: 'json',
      })
      .done((data, textStatus, jqXHR) => {
        console.log(`Success for ${url}:`, { status: jqXHR.status, data });
      })
      .then((data) => {
        this._cache.set(url, data);
        return data;
      })
      .catch((jqXHR, textStatus, errorThrown) => {
        console.error(`API request failed for ${url}:`, {
          status: jqXHR.status,
          statusText: jqXHR.statusText,
          responseText: jqXHR.responseText?.substring(0, 500), // Log first 500 chars
          textStatus: textStatus,
          errorThrown: errorThrown?.message,
        });
        throw new Error(`API request failed: ${jqXHR.status} ${jqXHR.statusText} - ${jqXHR.responseText?.substring(0, 100)}`);
      })
      .always(() => {
        this._pending.delete(url);
      });

    this._pending.set(url, promise);
    return promise;
  },

  /**
   * Invalidate cached responses matching a key fragment.
   */
  invalidate(keyFragment) {
    for (const key of this._cache.keys()) {
      if (key.includes(keyFragment)) {
        this._cache.delete(key);
      }
    }
  },

  /**
   * Clear all cached data.
   */
  clear() {
    this._cache.clear();
  }
};