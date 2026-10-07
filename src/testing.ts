// Helpers shared by the tests only; never imported by the extension.

import { encode } from './codecs';
import type { ImageFormat } from './formats';
import { Pixels } from './image';

/** Left half red, right half blue, fully opaque. */
export function sample(width: number, height: number): Pixels {
	const data = new Uint8ClampedArray(width * height * 4);
	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			const i = (y * width + x) * 4;
			data[i] = x < width / 2 ? 230 : 20;
			data[i + 1] = 20;
			data[i + 2] = x < width / 2 ? 20 : 230;
			data[i + 3] = 255;
		}
	}
	return new Pixels(data, width, height);
}

export const makeImage = (format: ImageFormat, width: number, height: number): Promise<Uint8Array> => encode(format, sample(width, height), 95);

export const rgbAt = (image: Pixels, x: number, y: number): number[] => Array.from(image.data.subarray((y * image.width + x) * 4, (y * image.width + x) * 4 + 3));

export function jpegWithOrientation(orientation: number): Uint8Array {
	const tiff = Buffer.alloc(8 + 2 + 12 + 4);
	tiff.write('II', 0, 'latin1');
	tiff.writeUInt16LE(0x2a, 2);
	tiff.writeUInt32LE(8, 4);
	tiff.writeUInt16LE(1, 8);
	tiff.writeUInt16LE(0x0112, 10);
	tiff.writeUInt16LE(3, 12);
	tiff.writeUInt32LE(1, 14);
	tiff.writeUInt16LE(orientation, 18);
	const exif = Buffer.concat([Buffer.from('Exif\0\0', 'latin1'), tiff]);
	const header = Buffer.from([0xff, 0xe1, 0, 0]);
	header.writeUInt16BE(exif.length + 2, 2);
	return Buffer.concat([Buffer.from([0xff, 0xd8]), header, exif, Buffer.from([0xff, 0xd9])]);
}
