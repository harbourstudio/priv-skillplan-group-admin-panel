/**
 * User Activity Block - Frontend View
 * Reads embedded JSON data from render.php and handles interactions
 */

import { readBlockData } from '../_shared/block-data.js';

jQuery(document).ready(($) => {
  // Read data embedded by render.php
  const data = readBlockData('user-activity', {});

  // TODO: Render the data and set up event handlers
  // Data is available in the 'data' variable
});
