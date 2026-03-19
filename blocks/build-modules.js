const esbuild = require('esbuild');
const path = require('path');
const glob = require('glob');
const fs = require('fs');

const viewFiles = glob.sync('./src/*/view.js');
const version = require('./package.json').version;
const watch = process.argv.includes('--watch');

const entryPoints = viewFiles.map((file) => ({
    in: path.resolve(__dirname, file),
    out: path.join(file.split('/')[2], 'view.module'),
}));

function writeAssetFiles() {
    viewFiles.forEach((file) => {
        const blockName = file.split('/')[2];
        const assetPath = path.join('./build', blockName, 'view.module.asset.php');
        const content = `<?php return array( 'dependencies' => array( '@wordpress/interactivity' ), 'version' => '${version}' );\n`;
        fs.writeFileSync(assetPath, content);
    });
}

const buildOptions = {
    entryPoints,
    outdir: './build',
    bundle: true,
    format: 'esm',
    platform: 'browser',
    external: ['@wordpress/interactivity'],
    minify: !watch,
};

if (watch) {
    esbuild.context(buildOptions).then(async (ctx) => {
        writeAssetFiles();
        await ctx.watch();
        console.log('Watching view modules...');
    }).catch(() => process.exit(1));
} else {
    esbuild.build(buildOptions).then(() => {
        writeAssetFiles();
        console.log('View modules built');
    }).catch(() => process.exit(1));
}
