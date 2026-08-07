import {
	resolveWikiImageCaption,
	type WikiImageCaptionSettings,
} from "./caption";
import { getCaptionAppearanceClasses } from "../../caption-settings";

const INTERNAL_EMBED_SELECTOR = ".internal-embed";
const WIKI_IMAGE_SELECTOR = `${INTERNAL_EMBED_SELECTOR}.image-embed`;
const WIKI_IMAGE_SOURCE = /!\[\[[^\]\r\n]*\.(?:avif|bmp|gif|jpe?g|png|svg|webp)[^\]\r\n]*\]\]/iu;
const CAPTION_CLASS = "captions-wiki-caption";
const HAS_CAPTION_CLASS = "captions-wiki-has-caption";
const CAPTION_MARKER = "captionsWikiCaption";

export function hasWikiImageEmbed(
	root: HTMLElement,
	sourceText = "",
): boolean {
	return root.matches(INTERNAL_EMBED_SELECTOR)
		|| root.querySelector(INTERNAL_EMBED_SELECTOR) !== null
		|| WIKI_IMAGE_SOURCE.test(sourceText);
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
		removeCaptionClass(embed);
		return;
	}

	const captionText = resolveWikiImageCaption({
		embedAlt: embed.getAttribute("alt"),
		imageAlt: image.getAttribute("alt"),
		embedSource: embed.getAttribute("src"),
		imageSource: image.getAttribute("src"),
	}, settings);

	if (captionText === null) {
		existingCaption?.remove();
		removeCaptionClass(embed);
		delete image.dataset[CAPTION_MARKER];
		return;
	}

	const caption = existingCaption
		?? embed.ownerDocument.createElement("div");
	const className = [
		CAPTION_CLASS,
		...getCaptionAppearanceClasses(settings),
	].join(" ");
	if (caption.className !== className) {
		caption.className = className;
	}
	if (caption.textContent !== captionText) {
		caption.textContent = captionText;
	}

	if (existingCaption === null) {
		embed.appendChild(caption);
	}

	if (!embed.classList.contains(HAS_CAPTION_CLASS)) {
		embed.classList.add(HAS_CAPTION_CLASS);
	}
	image.dataset[CAPTION_MARKER] = "true";
}

function removeCaptionClass(embed: HTMLElement): void {
	if (embed.classList.contains(HAS_CAPTION_CLASS)) {
		embed.classList.remove(HAS_CAPTION_CLASS);
	}
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
