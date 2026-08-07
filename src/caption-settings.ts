export type CaptionAlignment = "left" | "center" | "right";
export type CaptionStyle = "italic" | "normal" | "bold";
export type CaptionPosition = "above" | "below";
export type CaptionKind = "figure" | "table";

export const CAPTION_FONT_SIZE_PERCENT_MIN = 50;
export const CAPTION_FONT_SIZE_PERCENT_MAX = 200;
export const CAPTION_FONT_SIZE_PERCENT_STEP = 5;
export const CAPTION_SPACING_PX_MIN = 0;
export const CAPTION_SPACING_PX_MAX = 32;
export const CAPTION_SPACING_PX_STEP = 1;

export interface CaptionLabelSettings {
	figureLabel: string;
	tableLabel: string;
}

export interface CaptionAppearanceSettings {
	alignment: CaptionAlignment;
	style: CaptionStyle;
	fontSizePercent: number;
	spacingAbovePx: number;
	spacingBelowPx: number;
	figurePosition: CaptionPosition;
	tablePosition: CaptionPosition;
}

export interface CaptionBehaviorSettings {
	showFileNameAsCaption: boolean;
}

export interface CaptionSettings extends
	CaptionLabelSettings,
	CaptionAppearanceSettings,
	CaptionBehaviorSettings {}

export const DEFAULT_CAPTION_APPEARANCE: Readonly<CaptionAppearanceSettings> = {
	alignment: "center",
	style: "bold",
	fontSizePercent: 85,
	spacingAbovePx: 8,
	spacingBelowPx: 8,
	figurePosition: "below",
	tablePosition: "above",
};

export interface CaptionAppearance {
	classNames: string[];
	cssVariables: ReadonlyArray<readonly [string, string]>;
	signature: string;
}

export function getCaptionLabel(
	kind: CaptionKind,
	settings: Pick<CaptionSettings, "figureLabel" | "tableLabel">,
): string {
	return kind === "figure" ? settings.figureLabel : settings.tableLabel;
}

export function getCaptionAppearanceClasses(
	settings: Pick<CaptionAppearanceSettings, "alignment" | "style">,
): string[] {
	return [
		"captions-caption",
		`captions-caption--${settings.alignment}`,
		`captions-caption--${settings.style}`,
	];
}

export function getCaptionAppearance(
	settings: CaptionAppearanceSettings,
	kind: CaptionKind,
): CaptionAppearance {
	const position = kind === "figure"
		? settings.figurePosition
		: settings.tablePosition;
	return {
		classNames: [
			...getCaptionAppearanceClasses(settings),
			`captions-caption--${kind}-${position}`,
		],
		cssVariables: [
			["--captions-caption-font-size", `${settings.fontSizePercent}%`],
			["--captions-caption-space-above", `${settings.spacingAbovePx}px`],
			["--captions-caption-space-below", `${settings.spacingBelowPx}px`],
		],
		signature: [
			settings.alignment,
			settings.style,
			settings.fontSizePercent,
			settings.spacingAbovePx,
			settings.spacingBelowPx,
			kind,
			position,
		].join("|"),
	};
}

export function applyCaptionAppearance(
	element: HTMLElement,
	appearance: CaptionAppearance,
): void {
	for (const [property, value] of appearance.cssVariables) {
		element.style.setProperty(property, value);
	}
}

export function placeCaptionRelativeToTarget(
	container: HTMLElement,
	target: HTMLElement,
	caption: HTMLElement,
	position: CaptionPosition,
): void {
	let anchor = target;
	while (anchor.parentElement !== null && anchor.parentElement !== container) {
		anchor = anchor.parentElement;
	}

	if (position === "above" && anchor.parentElement === container) {
		if (
			caption.parentElement !== container
			|| caption.nextElementSibling !== anchor
		) {
			container.insertBefore(caption, anchor);
		}
	} else if (
		caption.parentElement !== container
		|| container.lastElementChild !== caption
	) {
		container.appendChild(caption);
	}
}

export function getCleanFileName(sourceText: string | null): string | null {
	if (sourceText === null || sourceText.length === 0) {
		return null;
	}

	const pathWithoutQuery = sourceText.split(/[?#]/u, 1)[0];
	const pathParts = pathWithoutQuery?.split("/") ?? [];
	const encodedFileName = pathParts[pathParts.length - 1];
	if (encodedFileName === undefined || encodedFileName.length === 0) {
		return null;
	}

	try {
		return decodeURIComponent(encodedFileName);
	} catch {
		return encodedFileName;
	}
}

export function isGeneratedFileNameCaption(
	caption: string,
	sourceTexts: readonly (string | null)[],
): boolean {
	const cleanCaption = caption.trim();
	return sourceTexts.some((sourceText) => (
		getCleanFileName(sourceText) === cleanCaption
	));
}

export function resolveImageCaption(
	explicitCaption: string | null,
	sourceTexts: readonly (string | null)[],
	showFileNameAsCaption: boolean,
): string | null {
	const caption = explicitCaption?.trim() ?? "";
	if (
		caption.length > 0
		&& !isGeneratedFileNameCaption(caption, sourceTexts)
	) {
		return caption;
	}

	if (!showFileNameAsCaption) {
		return null;
	}

	for (const sourceText of sourceTexts) {
		const fileName = getCleanFileName(sourceText);
		if (fileName !== null) {
			return fileName;
		}
	}

	return null;
}
