import { cp, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { build } from 'esbuild';

const production = process.argv.includes('--production');

// The WebAssembly codecs are loaded from disk at runtime, so only the needed files are shipped.
const wasmFiles = [
	['node_modules/@jsquash/jpeg/codec/dec/mozjpeg_dec.wasm', 'mozjpeg_dec.wasm'],
	['node_modules/@jsquash/jpeg/codec/enc/mozjpeg_enc.wasm', 'mozjpeg_enc.wasm'],
	['node_modules/@jsquash/png/codec/pkg/squoosh_png_bg.wasm', 'squoosh_png_bg.wasm'],
	['node_modules/@jsquash/webp/codec/dec/webp_dec.wasm', 'webp_dec.wasm'],
	['node_modules/@jsquash/webp/codec/enc/webp_enc.wasm', 'webp_enc.wasm'],
	['node_modules/@jsquash/resize/lib/resize/pkg/squoosh_resize_bg.wasm', 'squoosh_resize_bg.wasm'],
];

await rm('wasm', { recursive: true, force: true });
await mkdir('wasm', { recursive: true });
await Promise.all(wasmFiles.map(([from, to]) => cp(from, `wasm/${to}`)));

// Licenses of every package shipped in the VSIX, gathered in one notices file.
const shipped = ['@jsquash/jpeg', '@jsquash/png', '@jsquash/resize', '@jsquash/webp'];
const notices = [];
for (const name of shipped) {
	const dir = `node_modules/${name}`;
	const { version, license, repository } = JSON.parse(await readFile(`${dir}/package.json`, 'utf8'));
	const url = typeof repository === 'string' ? repository : repository?.url ?? '';
	const file = (await readdir(dir)).find((entry) => /^licen[cs]e/i.test(entry));
	const text = file ? await readFile(`${dir}/${file}`, 'utf8') : '';
	notices.push(`${name} ${version} (${license})\n${url}\n\n${text.trim() || `Licensed under ${license}.`}\n`);
}
await writeFile('THIRD-PARTY-NOTICES.txt', notices.join(`\n${'-'.repeat(72)}\n\n`));

await build({
	entryPoints: { extension: 'src/extension.ts', worker: 'src/worker.ts' },
	outdir: 'dist',
	bundle: true,
	platform: 'node',
	format: 'cjs',
	target: 'node24',
	external: ['vscode'],
	minify: production,
	sourcemap: !production,
	logLevel: 'warning',
	// Some codecs build their own file URLs from import.meta.url, which does not exist in a CommonJS bundle.
	banner: { js: "const import_meta_url = require('node:url').pathToFileURL(__filename).href;" },
	define: { 'import.meta.url': 'import_meta_url' },
});
