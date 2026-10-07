import { readFile } from 'node:fs/promises';
import * as path from 'node:path';
import type { ImageFormat } from './formats';
import { applyOrientation, hasTransparency, jpegOrientation, Pixels } from './image';

// Both the bundle (dist) and the compiled tests (out) sit one level under the extension root.
const wasmDir = path.join(__dirname, '..', 'wasm');

type Init = (module: WebAssembly.Module) => Promise<unknown>;

function once<T>(load: () => Promise<T>): () => Promise<T> {
	let cached: Promise<T> | undefined;
	return () => (cached ??= load());
}

async function wasmModule(file: string): Promise<WebAssembly.Module> {
	return WebAssembly.compile(await readFile(path.join(wasmDir, file)));
}

const toPixels = (image: { data: Uint8ClampedArray; width: number; height: number }): Pixels =>
	new Pixels(image.data, image.width, image.height);

// Each codec is loaded the first time a file needs it.
const jpegDecode = once(async () => {
	const codec = await import('@jsquash/jpeg/decode.js');
	await (codec.init as unknown as Init)(await wasmModule('mozjpeg_dec.wasm'));
	return codec.default;
});
const jpegEncode = once(async () => {
	const codec = await import('@jsquash/jpeg/encode.js');
	await (codec.init as unknown as Init)(await wasmModule('mozjpeg_enc.wasm'));
	return codec.default;
});
const pngDecode = once(async () => {
	const codec = await import('@jsquash/png/decode.js');
	await (codec.init as unknown as Init)(await wasmModule('squoosh_png_bg.wasm'));
	return codec.default;
});
const pngEncode = once(async () => {
	const codec = await import('@jsquash/png/encode.js');
	await (codec.init as unknown as Init)(await wasmModule('squoosh_png_bg.wasm'));
	return codec.default;
});
const webpDecode = once(async () => {
	const codec = await import('@jsquash/webp/decode.js');
	await (codec.init as unknown as Init)(await wasmModule('webp_dec.wasm'));
	return codec.default;
});
const webpEncode = once(async () => {
	const codec = await import('@jsquash/webp/encode.js');
	await (codec.init as unknown as Init)(await wasmModule('webp_enc.wasm'));
	return codec.default;
});
const resizer = once(async () => {
	const codec = await import('@jsquash/resize');
	await (codec.initResize as unknown as Init)(await wasmModule('squoosh_resize_bg.wasm'));
	return codec.default;
});

type CodecImage = Parameters<Awaited<ReturnType<typeof jpegEncode>>>[0];

// Codecs take an ArrayBuffer: reuse the file's own buffer when it holds exactly the file.
const arrayBuffer = (data: Uint8Array): ArrayBuffer =>
	(data.byteOffset === 0 && data.byteLength === data.buffer.byteLength ? data.buffer : data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength)) as ArrayBuffer;

export async function decode(format: ImageFormat, data: Uint8Array): Promise<Pixels> {
	switch (format) {
		case 'jpeg': {
			const decodeJpeg = await jpegDecode();
			// Photos carry a rotation in their EXIF data, which is dropped when saving: apply it now.
			return applyOrientation(toPixels(await decodeJpeg(arrayBuffer(data))), jpegOrientation(data));
		}
		case 'png': {
			const decodePng = await pngDecode();
			return toPixels(await decodePng(arrayBuffer(data)));
		}
		case 'webp': {
			const decodeWebp = await webpDecode();
			return toPixels(await decodeWebp(arrayBuffer(data)));
		}
	}
}

/**
 * Lanczos3 resize. Opaque images skip the premultiplied and linear-light passes, which nearly
 * double the memory use on large photos for no visible gain. Transparent images keep the
 * premultiplied pass so the edges of transparent areas stay clean.
 */
export async function resize(image: Pixels, width: number, height: number): Promise<Pixels> {
	const resizeImage = await resizer();
	const options = { fitMethod: 'stretch', method: 'lanczos3', premultiply: hasTransparency(image), linearRGB: false } as const;
	return toPixels(await resizeImage(image as unknown as CodecImage, { ...options, width, height }));
}

export async function encode(format: ImageFormat, image: Pixels, quality: number): Promise<Uint8Array> {
	// The codecs only read `data`, `width` and `height`, which Pixels provides.
	const source = image as unknown as CodecImage;
	switch (format) {
		case 'jpeg': {
			const encodeJpeg = await jpegEncode();
			// mozjpeg's default quantization table gives smaller but visibly softer files than the standard one.
			return new Uint8Array(await encodeJpeg(source, { quality, quant_table: 0 }));
		}
		case 'png': {
			const encodePng = await pngEncode();
			return new Uint8Array(await encodePng(source));
		}
		case 'webp': {
			const encodeWebp = await webpEncode();
			return new Uint8Array(await encodeWebp(source, { quality }));
		}
	}
}
