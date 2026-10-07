import * as assert from 'node:assert/strict';
import { chmod, mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import { test } from 'node:test';
import { collectImages, outputFolderName, uniqueOutputPath } from './files';

async function withTree(files: string[], run: (root: string) => Promise<void>): Promise<void> {
	const root = await mkdtemp(path.join(tmpdir(), 'image-converter-'));
	try {
		for (const file of files) {
			await mkdir(path.dirname(path.join(root, file)), { recursive: true });
			await writeFile(path.join(root, file), 'x');
		}
		await run(root);
	} finally {
		await rm(root, { recursive: true, force: true });
	}
}

test('outputFolderName keeps a plain folder name only', () => {
	assert.equal(outputFolderName(undefined), 'resized');
	assert.equal(outputFolderName('  '), 'resized');
	assert.equal(outputFolderName('..'), 'resized');
	assert.equal(outputFolderName('../../etc'), 'etc');
	assert.equal(outputFolderName('out'), 'out');
});

test('collectImages walks folders and skips output, hidden and dependency folders', async () => {
	await withTree(
		['a.png', 'sub/b.JPG', 'sub/deep/c.webp', 'notes.txt', 'resized/old.png', '.git/x.png', 'node_modules/p/y.png'],
		async (root) => {
			const { files, ignored } = await collectImages([root], 'resized');
			assert.deepEqual(files.map((file) => path.relative(root, file)).sort(), ['a.png', path.join('sub', 'b.JPG'), path.join('sub', 'deep', 'c.webp')]);
			assert.deepEqual(ignored, []);
		},
	);
});

test('collectImages reports explicit files it cannot convert', async () => {
	await withTree(['a.png', 'readme.txt'], async (root) => {
		const { files, ignored } = await collectImages([path.join(root, 'a.png'), path.join(root, 'readme.txt'), path.join(root, 'gone.png')], 'resized');
		assert.deepEqual(files, [path.join(root, 'a.png')]);
		assert.deepEqual(ignored, [path.join(root, 'readme.txt'), path.join(root, 'gone.png')]);
	});
});

test('collectImages follows a link picked by hand but not links met in a folder', async () => {
	await withTree(['real/a.png', 'walk/b.png'], async (root) => {
		await symlink(path.join(root, 'real', 'a.png'), path.join(root, 'picked.png'));
		await symlink(path.join(root, 'real'), path.join(root, 'walk', 'loop'));
		assert.deepEqual((await collectImages([path.join(root, 'picked.png')], 'resized')).files, [path.join(root, 'picked.png')]);
		assert.deepEqual((await collectImages([path.join(root, 'walk')], 'resized')).files, [path.join(root, 'walk', 'b.png')]);
	});
});

test('collectImages skips unreadable folders instead of failing', { skip: process.getuid?.() === 0 }, async () => {
	await withTree(['a.png', 'locked/b.png'], async (root) => {
		await chmod(path.join(root, 'locked'), 0o000);
		try {
			const { files, ignored } = await collectImages([root], 'resized');
			assert.deepEqual(files, [path.join(root, 'a.png')]);
			assert.deepEqual(ignored, [path.join(root, 'locked')]);
		} finally {
			await chmod(path.join(root, 'locked'), 0o755);
		}
	});
});

test('collectImages lists a file given twice only once', async () => {
	await withTree(['a.png'], async (root) => {
		const file = path.join(root, 'a.png');
		assert.deepEqual((await collectImages([file, file, root], 'resized')).files, [file]);
	});
});

test('uniqueOutputPath keeps the source name and never overwrites a file', async () => {
	await withTree(['photo.JPG', 'resized/photo.JPG'], async (root) => {
		const reserved = new Set<string>();
		const source = path.join(root, 'photo.JPG');
		assert.equal(await uniqueOutputPath(source, 'resized', reserved), path.join(root, 'resized', 'photo (1).JPG'));
		assert.equal(await uniqueOutputPath(source, 'resized', reserved), path.join(root, 'resized', 'photo (2).JPG'));
	});
});

test('uniqueOutputPath gives different names to parallel resizes of the same name', async () => {
	await withTree(['a/photo.png', 'b/photo.png'], async (root) => {
		const reserved = new Set<string>();
		const same = path.join(root, 'a', 'photo.png');
		const names = await Promise.all([same, same, same].map((file) => uniqueOutputPath(file, 'resized', reserved)));
		assert.deepEqual(names.map((name) => path.basename(name)).sort(), ['photo (1).png', 'photo (2).png', 'photo.png']);
	});
});
