import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import { decode, encode } from './codecs';
import { resizeImage } from './convert';
import { detectFormat, type ImageFormat } from './formats';
import { Pixels } from './image';
import { jpegWithOrientation, makeImage, rgbAt } from './testing';

const FORMATS: ImageFormat[] = ['jpeg', 'png', 'webp'];

test('every format is resized to the requested longest side and keeps its format', async () => {
	for (const format of FORMATS) {
		const outcome = await resizeImage(await makeImage(format, 128, 64), { mode: 'pixels', value: 32 }, 90);
		assert.ok('output' in outcome, format);
		assert.equal(detectFormat(outcome.output), format, `${format} stays ${format}`);
		const result = await decode(format, outcome.output);
		assert.deepEqual([result.width, result.height], [32, 16], `${format}: size`);
		assert.ok(rgbAt(result, 4, 8)[0] > 180, `${format}: left half stays red`);
		assert.ok(rgbAt(result, 27, 8)[2] > 180, `${format}: right half stays blue`);
	}
});

test('percent mode halves the dimensions', async () => {
	const outcome = await resizeImage(await makeImage('png', 100, 60), { mode: 'percent', value: 50 }, 90);
	assert.ok('output' in outcome);
	const result = await decode('png', outcome.output);
	assert.deepEqual([result.width, result.height], [50, 30]);
});

test('an image that is already small enough is left alone', async () => {
	const outcome = await resizeImage(await makeImage('jpeg', 64, 32), { mode: 'pixels', value: 1920 }, 90);
	assert.ok('skipped' in outcome);
	assert.match(outcome.skipped, /not larger/);
});

test('transparency survives in PNG and WebP', async () => {
	const pixels = new Pixels(new Uint8ClampedArray(64 * 64 * 4), 64, 64);
	for (let i = 0; i < 32 * 64; i++) {
		pixels.data.set([200, 30, 30, 255], i * 4);
	}
	for (const format of ['png', 'webp'] as const) {
		const outcome = await resizeImage(await encode(format, pixels, 100), { mode: 'pixels', value: 32 }, 100);
		assert.ok('output' in outcome);
		const result = await decode(format, outcome.output);
		assert.equal(result.data[(4 * 32 + 16) * 4 + 3], 255, `${format}: opaque half`);
		assert.equal(result.data[(28 * 32 + 16) * 4 + 3], 0, `${format}: transparent half`);
	}
});

test('JPEG photos are turned upright using their EXIF orientation', async () => {
	const jpeg = Buffer.from(await makeImage('jpeg', 64, 32));
	// Insert an EXIF block saying "rotate 90 degrees clockwise" right after the JPEG start marker.
	const rotated = Buffer.concat([jpeg.subarray(0, 2), jpegWithOrientation(6).subarray(2, -2), jpeg.subarray(2)]);
	const outcome = await resizeImage(rotated, { mode: 'pixels', value: 32 }, 90);
	assert.ok('output' in outcome);
	const result = await decode('jpeg', outcome.output);
	assert.deepEqual([result.width, result.height], [16, 32]);
	assert.ok(rgbAt(result, 8, 4)[0] > 180, 'top of the rotated image is the red half');
	assert.ok(rgbAt(result, 8, 27)[2] > 180, 'bottom of the rotated image is the blue half');
});

test('JPG output keeps fine detail at the default quality', async () => {
	// Noise, a gradient and thin diagonal lines: the kind of detail a soft encoder smears.
	const width = 256;
	const data = new Uint8ClampedArray(width * width * 4);
	let seed = 12345;
	const noise = (): number => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff) * 40;
	for (let y = 0; y < width; y++) {
		for (let x = 0; x < width; x++) {
			const i = (y * width + x) * 4;
			const line = (x + y) % 9 === 0 ? 90 : 0;
			const n = noise();
			data.set([Math.min(255, x + n + line), Math.min(255, y + n - line / 2), Math.min(255, 128 + 60 * Math.sin(x / 7) + n), 255], i);
		}
	}
	const original = new Pixels(data, width, width);
	const back = await decode('jpeg', await encode('jpeg', original, 95));
	let squares = 0;
	for (let i = 0; i < data.length; i += 4) {
		for (let c = 0; c < 3; c++) {
			squares += (data[i + c] - back.data[i + c]) ** 2;
		}
	}
	const psnr = 10 * Math.log10(255 ** 2 / (squares / (width * width * 3)));
	// The softer default quantization table of mozjpeg gives about 34 dB here, the standard one 37.4 dB.
	assert.ok(psnr > 36, `fidelity should stay above 36 dB, got ${psnr.toFixed(1)}`);
});

test('lower quality gives smaller JPG files', async () => {
	const source = await makeImage('jpeg', 256, 256);
	const high = await resizeImage(source, { mode: 'percent', value: 90 }, 100);
	const low = await resizeImage(source, { mode: 'percent', value: 90 }, 10);
	assert.ok('output' in high && 'output' in low);
	assert.ok(low.output.length < high.output.length);
});

test('animated files are refused instead of being flattened', async () => {
	const animatedWebp = Buffer.concat([Buffer.from('RIFF\0\0\0\0WEBPVP8X'), Buffer.from([10, 0, 0, 0, 0x02, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])]);
	await assert.rejects(resizeImage(animatedWebp, { mode: 'pixels', value: 32 }, 90), /Animated images are not supported/);
});

test('metadata such as EXIF and GPS is not copied to the resized file', async () => {
	const jpeg = Buffer.from(await makeImage('jpeg', 64, 32));
	const withExif = Buffer.concat([jpeg.subarray(0, 2), jpegWithOrientation(1).subarray(2, -2), jpeg.subarray(2)]);
	assert.ok(withExif.includes('Exif'));
	const outcome = await resizeImage(withExif, { mode: 'pixels', value: 32 }, 90);
	assert.ok('output' in outcome);
	assert.equal(Buffer.from(outcome.output).includes('Exif'), false);
});

test('unsupported or corrupted files are rejected with a clear error', async () => {
	const spec = { mode: 'pixels', value: 32 } as const;
	await assert.rejects(resizeImage(Buffer.from('hello world'), spec, 90), /Unsupported or corrupted/);
	await assert.rejects(resizeImage(Buffer.from('GIF89a......'), spec, 90), /Unsupported or corrupted/);
	await assert.rejects(resizeImage(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0, 0]), spec, 90));
});
