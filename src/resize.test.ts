import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import { describe, targetSize } from './resize';

test('pixels mode sets the longest side and keeps the aspect ratio', () => {
	assert.deepEqual(targetSize(4000, 3000, { mode: 'pixels', value: 1920 }), { width: 1920, height: 1440 });
	assert.deepEqual(targetSize(3000, 4000, { mode: 'pixels', value: 1920 }), { width: 1440, height: 1920 });
	assert.deepEqual(targetSize(2000, 2000, { mode: 'pixels', value: 500 }), { width: 500, height: 500 });
});

test('images are never enlarged', () => {
	assert.equal(targetSize(1920, 1080, { mode: 'pixels', value: 1920 }), undefined);
	assert.equal(targetSize(800, 600, { mode: 'pixels', value: 1920 }), undefined);
	assert.equal(targetSize(800, 600, { mode: 'percent', value: 100 }), undefined);
	assert.equal(targetSize(800, 600, { mode: 'percent', value: 150 }), undefined);
});

test('percent mode scales both sides', () => {
	assert.deepEqual(targetSize(800, 600, { mode: 'percent', value: 50 }), { width: 400, height: 300 });
	assert.deepEqual(targetSize(101, 51, { mode: 'percent', value: 50 }), { width: 51, height: 26 });
});

test('a side never drops below one pixel', () => {
	assert.deepEqual(targetSize(10000, 1, { mode: 'pixels', value: 100 }), { width: 100, height: 1 });
	assert.deepEqual(targetSize(100, 2, { mode: 'percent', value: 1 }), { width: 1, height: 1 });
});

test('invalid values leave the image untouched', () => {
	assert.equal(targetSize(800, 600, { mode: 'pixels', value: 0 }), undefined);
	assert.equal(targetSize(800, 600, { mode: 'percent', value: -5 }), undefined);
	assert.equal(targetSize(800, 600, { mode: 'pixels', value: Number.NaN }), undefined);
});

test('describe names the size for messages', () => {
	assert.equal(describe({ mode: 'pixels', value: 1920 }), '1920 px');
	assert.equal(describe({ mode: 'percent', value: 50 }), '50%');
});
