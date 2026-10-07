export type ResizeMode = 'pixels' | 'percent';

export interface ResizeSpec {
	mode: ResizeMode;
	value: number;
}

/**
 * Size of the resized image, or undefined when it would not get smaller.
 * "pixels" sets the longest side, "percent" scales both sides. Images are never enlarged.
 */
export function targetSize(width: number, height: number, spec: ResizeSpec): { width: number; height: number } | undefined {
	const scale = spec.mode === 'pixels' ? spec.value / Math.max(width, height) : spec.value / 100;
	if (!(scale > 0) || scale >= 1) {
		return undefined;
	}
	return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

/** Describes a spec for messages, e.g. "1920 px" or "50%". */
export function describe(spec: ResizeSpec): string {
	return spec.mode === 'pixels' ? `${spec.value} px` : `${spec.value}%`;
}
