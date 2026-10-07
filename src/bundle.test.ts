import * as assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import { test } from 'node:test';
import { Worker } from 'node:worker_threads';
import { decode } from './codecs';
import { detectFormat, type ImageFormat } from './formats';
import { makeImage } from './testing';
import type { Job, Result } from './worker';

// Runs the real bundled worker, the way VS Code does, to catch bundling problems.
function runJob(worker: Worker, job: Job): Promise<Result> {
	return new Promise((resolve, reject) => {
		worker.once('message', resolve);
		worker.once('error', reject);
		worker.postMessage(job);
	});
}

test('the bundled worker resizes every format, skips small images and refuses to overwrite', async () => {
	const dir = await mkdtemp(path.join(tmpdir(), 'image-resizer-bundle-'));
	const worker = new Worker(path.join(__dirname, '..', 'dist', 'worker.js'));
	try {
		let id = 0;
		for (const [format, ext] of [['jpeg', 'jpg'], ['png', 'png'], ['webp', 'webp']] as [ImageFormat, string][]) {
			const source = path.join(dir, `a.${ext}`);
			await writeFile(source, await makeImage(format, 128, 64));
			const output = path.join(dir, 'out', `a.${ext}`);
			const result = await runJob(worker, { id: id++, source, output, spec: { mode: 'pixels', value: 32 }, quality: 80 });
			assert.deepEqual(result, { id: id - 1 }, format);
			const written = await readFile(output);
			assert.equal(detectFormat(written), format);
			assert.deepEqual([(await decode(format, written)).width, (await decode(format, written)).height], [32, 16]);
		}
		const source = path.join(dir, 'a.png');
		const small = await runJob(worker, { id: id++, source, output: path.join(dir, 'out', 'small.png'), spec: { mode: 'pixels', value: 5000 }, quality: 80 });
		assert.match(small.skipped ?? '', /not larger/);
		const again = await runJob(worker, { id: id++, source, output: path.join(dir, 'out', 'a.png'), spec: { mode: 'pixels', value: 32 }, quality: 80 });
		assert.match(again.error ?? '', /EEXIST/);
		const missing = await runJob(worker, { id: id++, source: path.join(dir, 'nope.png'), output: path.join(dir, 'out', 'nope.png'), spec: { mode: 'pixels', value: 32 }, quality: 80 });
		assert.match(missing.error ?? '', /ENOENT/);
	} finally {
		await worker.terminate();
		await rm(dir, { recursive: true, force: true });
	}
});
