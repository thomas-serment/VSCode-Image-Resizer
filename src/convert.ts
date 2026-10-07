import { decode, encode, resize } from './codecs';
import { detectFormat, isAnimated } from './formats';
import { targetSize, type ResizeSpec } from './resize';

/** Images above this size are refused instead of exhausting the memory of the worker. */
export const MAX_PIXELS = 100_000_000;
export const MAX_INPUT_BYTES = 256 * 1024 * 1024;

export type Outcome = { output: Uint8Array } | { skipped: string };

/** Resizes one image file's bytes, keeping its format. Returns `skipped` when it would not get smaller. */
export async function resizeImage(input: Uint8Array, spec: ResizeSpec, quality: number): Promise<Outcome> {
	if (input.length > MAX_INPUT_BYTES) {
		throw new Error('File is larger than 256 MB.');
	}
	const format = detectFormat(input);
	if (!format) {
		throw new Error('Unsupported or corrupted image.');
	}
	if (isAnimated(input, format)) {
		throw new Error('Animated images are not supported: they would lose their animation.');
	}
	const pixels = await decode(format, input);
	if (pixels.width * pixels.height > MAX_PIXELS) {
		throw new Error('Image is larger than 100 megapixels.');
	}
	const size = targetSize(pixels.width, pixels.height, spec);
	if (!size) {
		return { skipped: `already ${pixels.width}x${pixels.height}, not larger than requested` };
	}
	return { output: await encode(format, await resize(pixels, size.width, size.height), quality) };
}
