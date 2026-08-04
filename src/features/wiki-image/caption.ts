export type WikiCaptionAlignment = "left" | "center" | "right";
export type WikiCaptionStyle = "italic" | "normal";

export interface WikiImageCaptionSettings {
	showFileNameAsCaption: boolean;
	alignment: WikiCaptionAlignment;
	style: WikiCaptionStyle;
}

export interface WikiImageCaptionCandidates {
	embedAlt: string | null;
	imageAlt: string | null;
	embedSource: string | null;
	imageSource: string | null;
}

const WIKI_IMAGE_SIZE = /^\d+(?:x\d+)?$/;
const IMAGE_FILE_EXTENSION = /\.(?:avif|bmp|gif|jpe?g|png|svg|webp)$/i;

export function parseWikiImageCaption(
	altText: string | null,
	settings: Pick<WikiImageCaptionSettings, "showFileNameAsCaption">,
	sourceText: string | null,
): string | null {
	const caption = parseExplicitWikiImageCaption(altText, [sourceText]);
	if (caption !== null) {
		return caption;
	}

	return settings.showFileNameAsCaption
		? getCleanFileName(sourceText)
		: null;
}

export function resolveWikiImageCaption(
	candidates: WikiImageCaptionCandidates,
	settings: Pick<WikiImageCaptionSettings, "showFileNameAsCaption">,
): string | null {
	const sourceTexts = [candidates.embedSource, candidates.imageSource];

	for (const altText of [candidates.embedAlt, candidates.imageAlt]) {
		const caption = parseExplicitWikiImageCaption(altText, sourceTexts);
		if (caption !== null) {
			return caption;
		}
	}

	if (!settings.showFileNameAsCaption) {
		return null;
	}

	return getCleanFileName(candidates.embedSource)
		?? getCleanFileName(candidates.imageSource);
}

function parseExplicitWikiImageCaption(
	altText: string | null,
	sourceTexts: readonly (string | null)[],
): string | null {
	const parts = altText?.split("|") ?? [];
	const lastPart = parts.length > 0
		? parts[parts.length - 1]?.trim()
		: undefined;

	if (lastPart !== undefined && WIKI_IMAGE_SIZE.test(lastPart)) {
		parts.pop();
	}

	const firstPart = parts[0]?.trim();
	const firstPartFileName = firstPart === undefined
		? null
		: getCleanFileName(firstPart);
	if (
		parts.length > 1
		&& firstPartFileName !== null
		&& sourceTexts.some((sourceText) => (
			firstPartFileName === getCleanFileName(sourceText)
		))
	) {
		parts.shift();
	}

	const caption = parts.join("|").trim();
	if (caption.length === 0) {
		return null;
	}

	if (sourceTexts.some((sourceText) => getCleanFileName(sourceText) === caption)) {
		return null;
	}

	if (IMAGE_FILE_EXTENSION.test(caption)) {
		return null;
	}

	return caption;
}

function getCleanFileName(sourceText: string | null): string | null {
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
