import type {
	CaptionAlignment,
	CaptionSettings,
	CaptionStyle,
} from "./caption-settings";
import type {
	CaptionsEngineSettings,
	StandardMarkdownEngine,
} from "./engine-manager";

export interface CaptionsPluginSettings {
	engines: CaptionsEngineSettings;
	captions: CaptionSettings;
}

export function createDefaultSettings(): CaptionsPluginSettings {
	return {
		engines: {
			wikiImage: true,
			standardMarkdown: "pandocCrossref",
			pandocCrossref: true,
		},
		captions: {
			figureLabel: "Figure",
			tableLabel: "Table",
			showFileNameAsCaption: false,
			alignment: "center",
			style: "italic",
		},
	};
}

export function normalizeSettings(stored: unknown): CaptionsPluginSettings {
	const defaults = createDefaultSettings();
	const root = asRecord(stored);
	const engines = asRecord(root?.engines);
	const captions = asRecord(root?.captions);
	const wikiImage = asRecord(root?.wikiImage);
	const pandocCrossref = asRecord(root?.pandocCrossref);
	const quarto = asRecord(root?.quarto);
	const standardMarkdown = readStandardMarkdownEngine(
		engines?.standardMarkdown,
	) ?? (readBoolean(
		engines?.pandocCrossref,
		defaults.engines.pandocCrossref,
	) ? "pandocCrossref" : "none");
	const captionFallbacks: CaptionSettings = captions === null
		? {
			figureLabel: readLegacyLabel(
				standardMarkdown,
				pandocCrossref,
				quarto,
				defaults.captions.figureLabel,
				"figureLabel",
			),
			tableLabel: readLegacyLabel(
				standardMarkdown,
				pandocCrossref,
				quarto,
				defaults.captions.tableLabel,
				"tableLabel",
			),
			showFileNameAsCaption: readLegacyBoolean(
				wikiImage?.showFileNameAsCaption,
				defaults.captions.showFileNameAsCaption,
			),
			alignment: readLegacyAlignment(
				wikiImage?.alignment,
				defaults.captions.alignment,
			),
			style: readLegacyStyle(
				wikiImage?.style,
				defaults.captions.style,
			),
		}
		: defaults.captions;

	return {
		engines: {
			wikiImage: readBoolean(engines?.wikiImage, defaults.engines.wikiImage),
			standardMarkdown,
			pandocCrossref: standardMarkdown === "pandocCrossref",
		},
		captions: {
			figureLabel: readLabel(
				captions?.figureLabel,
				captionFallbacks.figureLabel,
			),
			tableLabel: readLabel(
				captions?.tableLabel,
				captionFallbacks.tableLabel,
			),
			showFileNameAsCaption: readBoolean(
				captions?.showFileNameAsCaption,
				captionFallbacks.showFileNameAsCaption,
			),
			alignment: readAlignment(
				captions?.alignment,
				captionFallbacks.alignment,
			),
			style: readStyle(
				captions?.style,
				captionFallbacks.style,
			),
		},
	};
}

function readLegacyLabel(
	standardMarkdown: StandardMarkdownEngine,
	pandocCrossref: Record<string, unknown> | null,
	quarto: Record<string, unknown> | null,
	fallback: string,
	key: "figureLabel" | "tableLabel",
): string {
	const preferred = standardMarkdown === "quarto"
		? readLabelValue(quarto?.[key])
		: standardMarkdown === "pandocCrossref"
			? readLabelValue(pandocCrossref?.[key])
			: null;
	return preferred
		?? readLabelValue(pandocCrossref?.[key])
		?? readLabelValue(quarto?.[key])
		?? fallback;
}

function readLabelValue(value: unknown): string | null {
	if (typeof value !== "string") {
		return null;
	}
	const label = value.trim();
	return label.length > 0 ? label : null;
}

function readLegacyBoolean(value: unknown, fallback: boolean): boolean {
	return typeof value === "boolean" ? value : fallback;
}

function readLegacyAlignment(
	value: unknown,
	fallback: CaptionAlignment,
): CaptionAlignment {
	return value === "left" || value === "center" || value === "right"
		? value
		: fallback;
}

function readLegacyStyle(value: unknown, fallback: CaptionStyle): CaptionStyle {
	return value === "italic" || value === "normal" ? value : fallback;
}

function readStandardMarkdownEngine(
	value: unknown,
): StandardMarkdownEngine | null {
	return value === "none" || value === "pandocCrossref" || value === "quarto"
		? value
		: null;
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
	fallback: CaptionAlignment,
): CaptionAlignment {
	return value === "left" || value === "center" || value === "right"
		? value
		: fallback;
}

function readStyle(
	value: unknown,
	fallback: CaptionStyle,
): CaptionStyle {
	return value === "italic" || value === "normal" ? value : fallback;
}

function readLabel(value: unknown, fallback: string): string {
	if (typeof value !== "string") {
		return fallback;
	}

	const label = value.trim();
	return label.length > 0 ? label : fallback;
}
