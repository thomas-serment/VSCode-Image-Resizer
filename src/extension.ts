import { rm } from 'node:fs/promises';
import * as os from 'node:os';
import * as vscode from 'vscode';
import { collectImages, outputFolderName, uniqueOutputPath } from './files';
import { WorkerPool } from './pool';
import { describe, type ResizeMode, type ResizeSpec } from './resize';

const COMMAND = 'image-resizer.resize';
const LAST_MODE_KEY = 'lastMode';
const DEFAULT_PERCENT = 50;

export function activate(context: vscode.ExtensionContext): void {
	const output = vscode.window.createOutputChannel('Image Resizer');
	context.subscriptions.push(
		output,
		vscode.commands.registerCommand(COMMAND, async (uri?: vscode.Uri, uris?: vscode.Uri[]) => {
			try {
				await resize(context, output, uri, uris);
			} catch (error) {
				void vscode.window.showErrorMessage(`Image resizing failed: ${error instanceof Error ? error.message : String(error)}`);
			}
		}),
	);
}

export function deactivate(): void {}

async function pickInputs(uri?: vscode.Uri, uris?: vscode.Uri[]): Promise<string[] | undefined> {
	const selected = uris?.length ? uris : uri ? [uri] : await vscode.window.showOpenDialog({
		canSelectFiles: true,
		canSelectFolders: true,
		canSelectMany: true,
		openLabel: 'Resize',
	});
	const local = selected?.filter((item) => item.scheme === 'file');
	return local?.length ? local.map((item) => item.fsPath) : undefined;
}

/** Reads a whole-number setting, falling back to `fallback` when it is not usable. */
function integerSetting(value: unknown, min: number, max: number, fallback: number): number {
	return typeof value === 'number' && Number.isFinite(value) ? Math.round(Math.min(max, Math.max(min, value))) : fallback;
}

const plural = (count: number, word: string): string => `${count} ${word}${count === 1 ? '' : 's'}`;

/** Asks how to resize: the mode first (the last one used comes first), then the value. */
async function askSpec(context: vscode.ExtensionContext, defaultSize: number, count: number): Promise<ResizeSpec | undefined> {
	const last = context.globalState.get<ResizeMode>(LAST_MODE_KEY);
	const modes = [
		{ label: 'Longest side in pixels', description: `${defaultSize} px by default`, mode: 'pixels' as const },
		{ label: 'Percentage of the original size', description: `${DEFAULT_PERCENT}% by default`, mode: 'percent' as const },
	];
	modes.sort((a, b) => Number(b.mode === last) - Number(a.mode === last));
	const choice = await vscode.window.showQuickPick(modes, { placeHolder: `Resize ${plural(count, 'image')} how?` });
	if (!choice) {
		return undefined;
	}
	const pixels = choice.mode === 'pixels';
	const answer = await vscode.window.showInputBox({
		prompt: pixels ? 'Size of the longest side, in pixels. Smaller images are left untouched.' : 'Percentage of the original size (1 to 99).',
		value: String(pixels ? defaultSize : DEFAULT_PERCENT),
		validateInput: (value) => {
			if (!/^\d+$/.test(value.trim())) {
				return 'Enter a whole number.';
			}
			const number = Number(value);
			if (pixels ? number < 1 || number > 20000 : number < 1 || number > 99) {
				return pixels ? 'Enter a size between 1 and 20000 pixels.' : 'Enter a percentage between 1 and 99.';
			}
			return undefined;
		},
	});
	if (answer === undefined) {
		return undefined;
	}
	await context.globalState.update(LAST_MODE_KEY, choice.mode);
	return { mode: choice.mode, value: Number(answer) };
}

async function resize(context: vscode.ExtensionContext, output: vscode.OutputChannel, uri?: vscode.Uri, uris?: vscode.Uri[]): Promise<void> {
	const inputs = await pickInputs(uri, uris);
	if (!inputs) {
		return;
	}
	const settings = vscode.workspace.getConfiguration('imageResizer');
	const quality = integerSetting(settings.get('quality'), 1, 100, 95);
	const defaultSize = integerSetting(settings.get('defaultSize'), 1, 20000, 1920);
	const folder = outputFolderName(settings.get<string>('outputFolder'));

	// Look for images before asking questions, so an empty selection is reported at once.
	const { files, ignored } = await collectImages(inputs, folder);
	for (const file of ignored) {
		output.appendLine(`Skipped (not a JPG, PNG or WebP image, or unreadable): ${file}`);
	}
	if (files.length === 0) {
		void vscode.window.showWarningMessage('No JPG, PNG or WebP image found in the selection. Other formats can be converted with Image Converter first.');
		return;
	}
	const spec = await askSpec(context, defaultSize, files.length);
	if (!spec) {
		return;
	}

	const failures: string[] = [];
	let resized = 0;
	let unchanged = 0;
	let cancelled = false;
	await vscode.window.withProgress(
		{ location: vscode.ProgressLocation.Notification, title: `Resizing to ${describe(spec)}`, cancellable: true },
		async (progress, token) => {
			const pool = new WorkerPool(Math.max(1, Math.min(2, os.availableParallelism() - 1)));
			const stopped = new Promise<void>((resolve) =>
				token.onCancellationRequested(async () => {
					cancelled = true;
					// Remove the files that were half written when the workers were stopped.
					const interrupted = await pool.dispose();
					await Promise.all(interrupted.map((file) => rm(file, { force: true })));
					resolve();
				}),
			);
			const reserved = new Set<string>();
			let done = 0;
			await Promise.all(
				files.map(async (source) => {
					try {
						const target = await uniqueOutputPath(source, folder, reserved);
						const result = await pool.run({ source, output: target, spec, quality });
						if (result.skipped) {
							unchanged++;
							output.appendLine(`Unchanged: ${source} (${result.skipped})`);
						} else {
							resized++;
						}
					} catch (error) {
						if (!cancelled) {
							failures.push(`${source}: ${error instanceof Error ? error.message : String(error)}`);
						}
					}
					progress.report({ increment: 100 / files.length, message: `${++done}/${files.length}` });
				}),
			);
			if (cancelled) {
				await stopped;
			} else {
				await pool.dispose();
			}
		},
	);

	for (const failure of failures) {
		output.appendLine(`Failed: ${failure}`);
	}
	if (cancelled) {
		void vscode.window.showInformationMessage(`Cancelled after ${resized} of ${plural(files.length, 'image')}.`);
		return;
	}
	const details = [
		unchanged > 0 ? `${unchanged} already small enough` : '',
		failures.length > 0 ? `${failures.length} failed` : '',
		ignored.length > 0 ? `${ignored.length} skipped` : '',
	].filter(Boolean);
	const summary = `${resized} of ${plural(files.length, 'image')} resized to ${describe(spec)} in "${folder}".`;
	if (failures.length > 0 || ignored.length > 0) {
		const action = await vscode.window.showWarningMessage(`${summary} ${details.join(', ')}.`, 'Show Details');
		if (action) {
			output.show();
		}
	} else {
		void vscode.window.showInformationMessage(details.length > 0 ? `${summary} ${details.join(', ')}.` : summary);
	}
}
