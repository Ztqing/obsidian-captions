import {
	CAPTION_FONT_SIZE_PERCENT_MAX,
	CAPTION_FONT_SIZE_PERCENT_MIN,
	CAPTION_FONT_SIZE_PERCENT_STEP,
	CAPTION_SPACING_PX_MAX,
	CAPTION_SPACING_PX_MIN,
	CAPTION_SPACING_PX_STEP,
	DEFAULT_CAPTION_APPEARANCE,
	type CaptionAlignment,
	type CaptionPosition,
	type CaptionSettings,
	type CaptionStyle,
} from "./caption-settings";

export const SETTINGS_SCHEMA_VERSION = 9;

export interface CaptionsPluginSettings {
	schemaVersion: typeof SETTINGS_SCHEMA_VERSION;
	captions: CaptionSettings;
}

export function createDefaultSettings(): CaptionsPluginSettings {
	return {
		schemaVersion: SETTINGS_SCHEMA_VERSION,
		captions: {
			showFileNameAsCaption: false,
			...DEFAULT_CAPTION_APPEARANCE,
		},
	};
}

/**
 * 0.0.9 deliberately does not migrate old engine settings. Any data that is
 * not written by this schema starts from the new defaults.
 */
export function normalizeSettings(stored: unknown): CaptionsPluginSettings {
	const root = asRecord(stored);
	if (root?.schemaVersion !== SETTINGS_SCHEMA_VERSION) {
		return createDefaultSettings();
	}

	const defaults = createDefaultSettings();
	const captions = asRecord(root.captions);
	if (captions === null) {
		return defaults;
	}

	return {
		schemaVersion: SETTINGS_SCHEMA_VERSION,
		captions: {
			showFileNameAsCaption: readBoolean(
				captions.showFileNameAsCaption,
				defaults.captions.showFileNameAsCaption,
			),
			alignment: readAlignment(captions.alignment, defaults.captions.alignment),
			style: readStyle(captions.style, defaults.captions.style),
			fontSizePercent: readQuantizedNumber(
				captions.fontSizePercent,
				defaults.captions.fontSizePercent,
				CAPTION_FONT_SIZE_PERCENT_MIN,
				CAPTION_FONT_SIZE_PERCENT_MAX,
				CAPTION_FONT_SIZE_PERCENT_STEP,
			),
			spacingAbovePx: readQuantizedNumber(
				captions.spacingAbovePx,
				defaults.captions.spacingAbovePx,
				CAPTION_SPACING_PX_MIN,
				CAPTION_SPACING_PX_MAX,
				CAPTION_SPACING_PX_STEP,
			),
			spacingBelowPx: readQuantizedNumber(
				captions.spacingBelowPx,
				defaults.captions.spacingBelowPx,
				CAPTION_SPACING_PX_MIN,
				CAPTION_SPACING_PX_MAX,
				CAPTION_SPACING_PX_STEP,
			),
			figurePosition: readPosition(
				captions.figurePosition,
				defaults.captions.figurePosition,
			),
			tablePosition: readPosition(
				captions.tablePosition,
				defaults.captions.tablePosition,
			),
		},
	};
}

function asRecord(value: unknown): Record<string, unknown> | null {
	return typeof value === "object" && value !== null && !Array.isArray(value)
		? value as Record<string, unknown>
		: null;
}

function readBoolean(value: unknown, fallback: boolean): boolean {
	return typeof value === "boolean" ? value : fallback;
}

function readAlignment(value: unknown, fallback: CaptionAlignment): CaptionAlignment {
	return value === "left" || value === "center" || value === "right" ? value : fallback;
}

function readStyle(value: unknown, fallback: CaptionStyle): CaptionStyle {
	return value === "italic" || value === "normal" || value === "bold" ? value : fallback;
}

function readPosition(value: unknown, fallback: CaptionPosition): CaptionPosition {
	return value === "above" || value === "below" ? value : fallback;
}

function readQuantizedNumber(
	value: unknown,
	fallback: number,
	min: number,
	max: number,
	step: number,
): number {
	if (
		typeof value !== "number"
		|| !Number.isFinite(value)
		|| value < min
		|| value > max
	) {
		return fallback;
	}
	return min + Math.round((value - min) / step) * step;
}
