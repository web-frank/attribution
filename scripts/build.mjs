import { build } from 'esbuild';
import { execFileSync } from 'node:child_process';
import { readFileSync, mkdirSync, copyFileSync, writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
mkdirSync('dist', { recursive: true });
for (const [format, outfile] of [['esm', 'dist/index.js'], ['cjs', 'dist/index.cjs']]) {
  await build({ entryPoints: ['src/index.ts'], bundle: true, minify: true, format, outfile, target: 'es2020' });
}
execFileSync(process.execPath, ['node_modules/typescript/bin/tsc'], { stdio: 'inherit' });
copyFileSync('dist/index.d.ts', 'dist/index.d.cts');
const source = readFileSync('dist/index.js');
console.log(`ESM: ${source.length} bytes minified; ${gzipSync(source, { level: 9 }).length} bytes min+gzip`);

const demoPath = 'demo/index.html';
const demoBundle = await build({ entryPoints: ['src/index.ts'], bundle: true, minify: true, format: 'iife', globalName: 'Library', target: 'es2020', write: false });
const demo = readFileSync(demoPath, 'utf8');
const marker = /\/\* BEGIN EMBEDDED LIBRARY \*\/[\s\S]*?\/\* END EMBEDDED LIBRARY \*\//;
if (!marker.test(demo)) throw new Error('Missing embedded demo library markers');
writeFileSync(demoPath, demo.replace(marker, () => '/* BEGIN EMBEDDED LIBRARY */\n' + demoBundle.outputFiles[0].text + '/* END EMBEDDED LIBRARY */'));
