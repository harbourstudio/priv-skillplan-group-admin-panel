const esbuild = require('esbuild');
const path = require('path');
const glob = require('glob');
const fs = require('fs');

const viewFiles = glob.sync('./src/*/view.js');
const version = require('./package.json').version;

esbuild.build({
    entryPoints: viewFiles.map((file) => ({
        in: path.resolve(__dirname, file),
        out: path.join(file.split('/')[2], 'view.module'),
    })),
    outdir: './build',
    bundle: true,
    format: 'esm',
    platform: 'browser',
    external: ['@wordpress/interactivity'],
    minify: true,
}).then(() => {
    viewFiles.forEach((file) => {
        const blockName = file.split('/')[2];
        const assetPath = path.join('./build', blockName, 'view.module.asset.php');
        const content = `<?php return array( 'dependencies' => array( '@wordpress/interactivity' ), 'version' => '${version}' );\n`;
        fs.writeFileSync(assetPath, content);
    });
    console.log('View modules built');
}).catch(() => process.exit(1));
