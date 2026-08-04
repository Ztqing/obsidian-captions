import {
	parseWikiImageCaption,
	type WikiImageCaptionSettings,
} from "./caption";

const WIKI_IMAGE_SELECTOR = ".internal-embed.image-embed";
const CAPTION_CLASS = "captions-wiki-caption";
const HAS_CAPTION_CLASS = "captions-wiki-has-caption";
const CAPTION_MARKER = "captionsWikiCaption";

export function hasWikiImageEmbed(root: HTMLElement): boolean {
	return root.matches(WIKI_IMAGE_SELECTOR)
		|| root.querySelector(WIKI_IMAGE_SELECTOR) !== null;
}

export function renderWikiImageCaptions(
	root: HTMLElement,
	settings: WikiImageCaptionSettings,
): void {
	for (const embed of collectWikiImageEmbeds(root)) {
		renderWikiImageCaption(embed, settings);
	}
}

export function cleanupWikiImageCaptions(root: HTMLElement): void {
	if (root.classList.contains(CAPTION_CLASS)) {
		root.remove();
	}

	for (const caption of Array.from(root.querySelectorAll(`.${CAPTION_CLASS}`))) {
		caption.remove();
	}

	if (root.classList.contains(HAS_CAPTION_CLASS)) {
		root.classList.remove(HAS_CAPTION_CLASS);
	}

	for (const embed of Array.from(root.querySelectorAll(`.${HAS_CAPTION_CLASS}`))) {
		embed.classList.remove(HAS_CAPTION_CLASS);
	}

	const markedImages = root.querySelectorAll<HTMLImageElement>(
		`img[data-${toKebabCase(CAPTION_MARKER)}]`,
	);
	for (const image of Array.from(markedImages)) {
		delete image.dataset[CAPTION_MARKER];
	}
}

function collectWikiImageEmbeds(root: HTMLElement): HTMLElement[] {
	const embeds = Array.from(
		root.querySelectorAll<HTMLElement>(WIKI_IMAGE_SELECTOR),
	);

	if (root.matches(WIKI_IMAGE_SELECTOR)) {
		embeds.unshift(root);
	}

	return embeds;
}

function renderWikiImageCaption(
	embed: HTMLElement,
	settings: WikiImageCaptionSettings,
): void {
	const image = embed.querySelector<HTMLImageElement>("img");
	const existingCaption = findDirectCaption(embed);

	if (image === null) {
		existingCaption?.remove();
		embed.classList.remove(HAS_CAPTION_CLASS);
		return;
	}

	const altText = image.getAttribute("alt") || embed.getAttribute("alt");
	const sourceText = image.getAttribute("src") || embed.getAttribute("src");
	const captionText = parseWikiImageCaption(altText, settings, sourceText);

	if (captionText === null) {
		existingCaption?.remove();
		embed.classList.remove(HAS_CAPTION_CLASS);
		delete image.dataset[CAPTION_MARKER];
		return;
	}

	const caption = existingCaption
		?? embed.ownerDocument.createElement("div");
	caption.className = [
		CAPTION_CLASS,
		`${CAPTION_CLASS}--${settings.alignment}`,
		`${CAPTION_CLASS}--${settings.style}`,
	].join(" ");
	caption.textContent = captionText;

	if (existingCaption === null) {
		embed.appendChild(caption);
	}

	embed.classList.add(HAS_CAPTION_CLASS);
	image.dataset[CAPTION_MARKER] = "true";
}

function findDirectCaption(embed: HTMLElement): HTMLElement | null {
	for (const child of Array.from(embed.children)) {
		if (child.classList.contains(CAPTION_CLASS)) {
			return child as HTMLElement;
		}
	}

	return null;
}

function toKebabCase(value: string): string {
	return value.replace(/[A-Z]/gu, (character) => `-${character.toLowerCase()}`);
}
