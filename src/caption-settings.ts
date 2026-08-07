export type CaptionAlignment = "left" | "center" | "right";
export type CaptionStyle = "italic" | "normal";
export type CaptionKind = "figure" | "table";

export interface CaptionSettings {
	figureLabel: string;
	tableLabel: string;
	alignment: CaptionAlignment;
	style: CaptionStyle;
	showFileNameAsCaption: boolean;
}

export function getCaptionLabel(
	kind: CaptionKind,
	settings: Pick<CaptionSettings, "figureLabel" | "tableLabel">,
): string {
	return kind === "figure" ? settings.figureLabel : settings.tableLabel;
}

export function getCaptionAppearanceClasses(
	settings: Pick<CaptionSettings, "alignment" | "style">,
): string[] {
	return [
		"captions-caption",
		`captions-caption--${settings.alignment}`,
		`captions-caption--${settings.style}`,
	];
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
