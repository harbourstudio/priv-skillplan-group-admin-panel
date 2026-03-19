const defaultConfig = require('@wordpress/scripts/config/webpack.config');
const path = require('path');
const glob = require('glob');

const entry = {};

glob.sync('./src/*/index.js').forEach((file) => {
    const blockName = file.split('/')[2];
    entry[`${blockName}/index`] = path.resolve(__dirname, file);
});

glob.sync('./src/*/view.js').forEach((file) => {
    const blockName = file.split('/')[2];
    entry[`${blockName}/view`] = path.resolve(__dirname, file);
});

module.exports = {
    ...defaultConfig,
    entry,
};
