const path = require('path');

module.exports = {
    entry: {
        'user-tabs/view': path.resolve(__dirname, 'src/user-tabs/view.js'),
    },
    output: {
        path: path.resolve(__dirname, 'build'),
        filename: '[name].js',
        module: true,
        chunkFormat: 'module',
    },
    experiments: {
        outputModule: true,
    },
    externals: {
        '@wordpress/interactivity': 'wp.interactivity',
    },
    mode: 'production',
};