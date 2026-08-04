import type { PandocCrossrefSettings } from "./features/pandoc-crossref/settings";
import type {
	WikiCaptionAlignment,
	WikiCaptionStyle,
	WikiImageCaptionSettings,
} from "./features/wiki-image/caption";
import type { CaptionsEngineSettings } from "./engine-manager";

export interface CaptionsPluginSettings {
	engines: CaptionsEngineSettings;
	wikiImage: WikiImageCaptionSettings;
	pandocCrossref: PandocCrossrefSettings;
}

export function createDefaultSettings(): CaptionsPluginSettings {
	return {
		engines: {
			wikiImage: true,
			pandocCrossref: true,
		},
		wikiImage: {
			showFileNameAsCaption: false,
			alignment: "center",
			style: "italic",
		},
		pandocCrossref: {
			figureLabel: "Figure",
			tableLabel: "Table",
		},
	};
}

export function normalizeSettings(stored: unknown): CaptionsPluginSettings {
	const defaults = createDefaultSettings();
	const root = asRecord(stored);
	const engines = asRecord(root?.engines);
	const wikiImage = asRecord(root?.wikiImage);
	const pandocCrossref = asRecord(root?.pandocCrossref);

	return {
		engines: {
			wikiImage: readBoolean(engines?.wikiImage, defaults.engines.wikiImage),
			pandocCrossref: readBoolean(
				engines?.pandocCrossref,
				defaults.engines.pandocCrossref,
			),
		},
		wikiImage: {
			showFileNameAsCaption: readBoolean(
				wikiImage?.showFileNameAsCaption,
				defaults.wikiImage.showFileNameAsCaption,
			),
			alignment: readAlignment(
				wikiImage?.alignment,
				defaults.wikiImage.alignment,
			),
			style: readStyle(wikiImage?.style, defaults.wikiImage.style),
		},
		pandocCrossref: {
			figureLabel: readLabel(
				pandocCrossref?.figureLabel,
				defaults.pandocCrossref.figureLabel,
			),
			tableLabel: readLabel(
				pandocCrossref?.tableLabel,
				defaults.pandocCrossref.tableLabel,
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

function readAlignment(
	value: unknown,
	fallback: WikiCaptionAlignment,
): WikiCaptionAlignment {
	return value === "left" || value === "center" || value === "right"
		? value
		: fallback;
}

function readStyle(
	value: unknown,
	fallback: WikiCaptionStyle,
): WikiCaptionStyle {
	return value === "italic" || value === "normal" ? value : fallback;
}

function readLabel(value: unknown, fallback: string): string {
	if (typeof value !== "string") {
		return fallback;
	}

	const label = value.trim();
	return label.length > 0 ? label : fallback;
}
