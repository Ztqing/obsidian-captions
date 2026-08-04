export type WikiCaptionAlignment = "left" | "center" | "right";
export type WikiCaptionStyle = "italic" | "normal";

export interface WikiImageCaptionSettings {
	showFileNameAsCaption: boolean;
	alignment: WikiCaptionAlignment;
	style: WikiCaptionStyle;
}

const WIKI_IMAGE_SIZE = /^\d+(?:x\d+)?$/;
const IMAGE_FILE_EXTENSION = /\.(?:avif|bmp|gif|jpe?g|png|svg|webp)$/i;

export function parseWikiImageCaption(
	altText: string | null,
	settings: Pick<WikiImageCaptionSettings, "showFileNameAsCaption">,
	sourceText: string | null,
): string | null {
	const fileName = getCleanFileName(sourceText);
	const parts = altText?.split("|") ?? [];
	const lastPart = parts.length > 0
		? parts[parts.length - 1]?.trim()
		: undefined;

	if (lastPart !== undefined && WIKI_IMAGE_SIZE.test(lastPart)) {
		parts.pop();
	}

	const caption = parts.join("|").trim();
	if (caption.length === 0) {
		return settings.showFileNameAsCaption ? fileName : null;
	}

	if (!settings.showFileNameAsCaption) {
		if (fileName !== null && caption === fileName) {
			return null;
		}

		if (IMAGE_FILE_EXTENSION.test(caption)) {
			return null;
		}
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
