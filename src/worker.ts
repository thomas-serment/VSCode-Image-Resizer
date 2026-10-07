import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import * as path from 'node:path';
import { parentPort } from 'node:worker_threads';
import { MAX_INPUT_BYTES, resizeImage } from './convert';
import type { ResizeSpec } from './resize';

export interface Job {
	id: number;
	source: string;
	output: string;
	spec: ResizeSpec;
	quality: number;
}

export type Result = { id: number; error?: string; skipped?: string };

// Decoding, resizing and encoding run here so the extension host stays responsive.
parentPort?.on('message', async (job: Job) => {
	const result: Result = { id: job.id };
	try {
		// Check the size first, so a huge file is never read into memory.
		if ((await stat(job.source)).size > MAX_INPUT_BYTES) {
			throw new Error('File is larger than 256 MB.');
		}
		const outcome = await resizeImage(await readFile(job.source), job.spec, job.quality);
		if ('skipped' in outcome) {
			result.skipped = outcome.skipped;
		} else {
			await mkdir(path.dirname(job.output), { recursive: true });
			await writeFile(job.output, outcome.output, { flag: 'wx' });
		}
	} catch (error) {
		result.error = error instanceof Error ? error.message : String(error);
	}
	parentPort?.postMessage(result);
});
