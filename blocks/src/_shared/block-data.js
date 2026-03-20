/**
 * Reads embedded JSON data from <script type="application/json" data-bys-block="...">
 * This pattern allows render.php to embed data in the initial HTML without network requests.
 */

export function readBlockData(blockName, fallback = {}) {
  const selector = `script[data-bys-block="${blockName}"]`;
  const el = document.querySelector(selector);

  if (!el) {
    return fallback;
  }

  try {
    return JSON.parse(el.textContent);
  } catch (err) {
    console.error(`Failed to parse block data for "${blockName}":`, err);
    return fallback;
  }
}