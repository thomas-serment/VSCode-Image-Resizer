import * as path from 'node:path';

/** The formats the extension can read and write back, so a resized image keeps its format. */
export type ImageFormat = 'jpeg' | 'png' | 'webp';

const EXTENSIONS: readonly string[] = ['.jpg', '.jpeg', '.jpe', '.png', '.webp'];

/** True when the file extension is one the extension can resize. */
export function isImagePath(file: string): boolean {
	return EXTENSIONS.includes(path.extname(file).toLowerCase());
}

const startsWith = (buffer: Uint8Array, bytes: number[]): boolean =>
	buffer.length >= bytes.length && bytes.every((byte, i) => buffer[i] === byte);

const ascii = (buffer: Uint8Array, start: number, end: number): string =>
	Buffer.from(buffer.subarray(start, end)).toString('latin1');

/** Finds the real format from the first bytes, whatever the file name says. */
export function detectFormat(buffer: Uint8Array): ImageFormat | undefined {
	if (startsWith(buffer, [0xff, 0xd8, 0xff])) {
		return 'jpeg';
	}
	if (startsWith(buffer, [0x89, 0x50, 0x4e, 0x47])) {
		return 'png';
	}
	if (ascii(buffer, 0, 4) === 'RIFF' && ascii(buffer, 8, 12) === 'WEBP') {
		return 'webp';
	}
	return undefined;
}

/** True for animated WebP and PNG files, which would lose their animation when resized. */
export function isAnimated(buffer: Uint8Array, format: ImageFormat): boolean {
	const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
	if (format === 'webp') {
		// The extended header (VP8X) carries an animation flag in its first byte.
		return buffer.length >= 21 && ascii(buffer, 12, 16) === 'VP8X' && (buffer[20] & 0x02) !== 0;
	}
	if (format === 'png') {
		// An acTL chunk before the image data marks an animated PNG.
		for (let offset = 8; offset + 8 <= buffer.length; ) {
			const type = ascii(buffer, offset + 4, offset + 8);
			if (type === 'acTL') {
				return true;
			}
			if (type === 'IDAT' || type === 'IEND') {
				return false;
			}
			offset += 12 + view.getUint32(offset);
		}
	}
	return false;
}
