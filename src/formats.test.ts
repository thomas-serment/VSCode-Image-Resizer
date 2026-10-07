import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import { detectFormat, isAnimated, isImagePath } from './formats';

const bytes = (...values: number[]): Uint8Array => Uint8Array.from(values);

test('detectFormat recognises JPG, PNG and WebP from their first bytes', () => {
	assert.equal(detectFormat(bytes(0xff, 0xd8, 0xff, 0xe0)), 'jpeg');
	assert.equal(detectFormat(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d)), 'png');
	assert.equal(detectFormat(Buffer.from('RIFF\0\0\0\0WEBPVP8 ')), 'webp');
});

test('detectFormat rejects formats that cannot be written back', () => {
	assert.equal(detectFormat(Buffer.from('GIF89a')), undefined);
	assert.equal(detectFormat(Buffer.from('BM\0\0\0\0')), undefined);
	assert.equal(detectFormat(bytes(0x49, 0x49, 0x2a, 0x00)), undefined);
	assert.equal(detectFormat(Buffer.concat([bytes(0, 0, 0, 24), Buffer.from('ftypheic')])), undefined);
	assert.equal(detectFormat(Buffer.from('<svg/>')), undefined);
	assert.equal(detectFormat(new Uint8Array(0)), undefined);
});

test('isImagePath only accepts JPG, PNG and WebP extensions, ignoring case', () => {
	for (const file of ['a.JPG', 'b.jpeg', 'c.JPE', 'd.webp', 'e.PNG']) {
		assert.equal(isImagePath(file), true, file);
	}
	for (const file of ['a.heic', 'b.gif', 'c.bmp', 'd.svg', 'e.tiff', 'toString', 'f.png.bak', 'g']) {
		assert.equal(isImagePath(file), false, file);
	}
});

test('isAnimated spots animated WebP and PNG files', () => {
	const webp = (flags: number): Uint8Array => Buffer.concat([Buffer.from('RIFF\0\0\0\0WEBPVP8X'), Buffer.from([10, 0, 0, 0, flags, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])]);
	assert.equal(isAnimated(webp(0x02), 'webp'), true);
	assert.equal(isAnimated(webp(0x10), 'webp'), false);
	assert.equal(isAnimated(Buffer.from('RIFF\0\0\0\0WEBPVP8 '), 'webp'), false);
	const chunk = (type: string, length: number): Buffer => {
		const header = Buffer.alloc(8);
		header.writeUInt32BE(length, 0);
		header.write(type, 4, 'latin1');
		return Buffer.concat([header, Buffer.alloc(length + 4)]);
	};
	const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
	assert.equal(isAnimated(Buffer.concat([signature, chunk('IHDR', 13), chunk('acTL', 8), chunk('IDAT', 4)]), 'png'), true);
	assert.equal(isAnimated(Buffer.concat([signature, chunk('IHDR', 13), chunk('IDAT', 4)]), 'png'), false);
	assert.equal(isAnimated(Buffer.concat([signature, Buffer.from([0xff, 0xff, 0xff, 0xff, 0x61, 0x62, 0x63, 0x64])]), 'png'), false);
	assert.equal(isAnimated(bytes(0xff, 0xd8, 0xff), 'jpeg'), false);
});
