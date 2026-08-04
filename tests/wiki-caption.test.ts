import * as assert from "node:assert/strict";
import { test } from "node:test";

import { parseHTML } from "linkedom";

import {
	parseWikiImageCaption,
	resolveWikiImageCaption,
} from "../src/features/wiki-image/caption";
import {
	hasWikiImageEmbed,
	renderWikiImageCaptions,
} from "../src/features/wiki-image/dom";
import { WikiImageCaptionObserver } from "../src/features/wiki-image/observer";
import { WikiImageCaptionReadingCoordinator } from "../src/features/wiki-image/reading-coordinator";

const NO_FILE_NAME_FALLBACK = { showFileNameAsCaption: false };
const FILE_NAME_FALLBACK = { showFileNameAsCaption: true };

void test("uses a Wiki image alias as the caption", () => {
	assert.equal(
		parseWikiImageCaption(
			"Swiss Alps",
			NO_FILE_NAME_FALLBACK,
			"assets/landscape.png",
		),
		"Swiss Alps",
	);
});

void test("removes a final width or width-by-height size", () => {
	assert.equal(
		parseWikiImageCaption(
			"Swiss Alps|300",
			NO_FILE_NAME_FALLBACK,
			"landscape.png",
		),
		"Swiss Alps",
	);
	assert.equal(
		parseWikiImageCaption(
			"Swiss Alps|300x200",
			NO_FILE_NAME_FALLBACK,
			"landscape.png",
		),
		"Swiss Alps",
	);
});

void test("preserves pipes that are part of the caption", () => {
	assert.equal(
		parseWikiImageCaption(
			"North | South|300",
			NO_FILE_NAME_FALLBACK,
			"map.png",
		),
		"North | South",
	);
});

void test("does not caption a size-only Wiki image", () => {
	assert.equal(
		parseWikiImageCaption(
			"400",
			NO_FILE_NAME_FALLBACK,
			"landscape.png",
		),
		null,
	);
});

void test("uses a decoded file name when fallback is enabled", () => {
	assert.equal(
		parseWikiImageCaption(
			"400",
			FILE_NAME_FALLBACK,
			"assets/Swiss%20Alps.png?cache=1",
		),
		"Swiss Alps.png",
	);
});

void test("suppresses Obsidian's generated file-name alt text", () => {
	assert.equal(
		parseWikiImageCaption(
			"landscape.png",
			NO_FILE_NAME_FALLBACK,
			"assets/landscape.png",
		),
		null,
	);
	assert.equal(
		parseWikiImageCaption(
			"another-image.webp",
			NO_FILE_NAME_FALLBACK,
			"assets/landscape.png",
		),
		null,
	);
});

void test("handles malformed URL encoding without throwing", () => {
	assert.equal(
		parseWikiImageCaption(
			null,
			FILE_NAME_FALLBACK,
			"assets/bad%name.png",
		),
		"bad%name.png",
	);
});

void test("prefers the Wiki embed alias over an image file-name alt", () => {
	const caption = "图 1.4 符号主义、亚符号主义与神经符号混合主义的知识表示范式";
	assert.equal(
		resolveWikiImageCaption({
			embedAlt: caption,
			imageAlt: "Pasted image 20260730230844.png",
			embedSource: "90-附件/10-图片/Pasted image 20260730230844.png",
			imageSource: "app://obsidian.md/Pasted%20image%2020260730230844.png",
		}, NO_FILE_NAME_FALLBACK),
		caption,
	);
});

void test("uses an explicit image alt when the embed alt is a file name", () => {
	assert.equal(
		resolveWikiImageCaption({
			embedAlt: "landscape.png",
			imageAlt: "Swiss Alps",
			embedSource: "assets/landscape.png",
			imageSource: "app://obsidian.md/landscape.png",
		}, FILE_NAME_FALLBACK),
		"Swiss Alps",
	);
});

void test("extracts a caption from a file-name and alias alt", () => {
	assert.equal(
		resolveWikiImageCaption({
			embedAlt: "landscape.png|Swiss Alps|300",
			imageAlt: "landscape.png",
			embedSource: "assets/landscape.png",
			imageSource: "app://obsidian.md/landscape.png",
		}, NO_FILE_NAME_FALLBACK),
		"Swiss Alps",
	);
});

void test("does not let a size-only candidate hide a later explicit alias", () => {
	assert.equal(
		resolveWikiImageCaption({
			embedAlt: "400",
			imageAlt: "Swiss Alps",
			embedSource: "assets/landscape.png",
			imageSource: "app://obsidian.md/landscape.png",
		}, FILE_NAME_FALLBACK),
		"Swiss Alps",
	);
});

void test("renders a Wiki alias stored on the embed when img alt is a file name", () => {
	const caption = "图 1.4 符号主义、亚符号主义与神经符号混合主义的知识表示范式";
	const { document } = parseHTML([
		'<div id="root"><span class="internal-embed image-embed"',
		' src="90-附件/10-图片/Pasted image 20260730230844.png"',
		` alt="${caption}">`,
		'<img src="app://obsidian.md/Pasted%20image%2020260730230844.png"',
		' alt="Pasted image 20260730230844.png">',
		"</span></div>",
	].join(""));
	const root = document.querySelector<HTMLElement>("#root");
	if (root === null) {
		assert.fail("Expected #root to exist");
	}

	renderWikiImageCaptions(root, {
		showFileNameAsCaption: false,
		alignment: "center",
		style: "italic",
	});

	const renderedCaption = document.querySelector(".captions-wiki-caption");
	assert.equal(renderedCaption?.textContent, caption);
	assert.equal(
		document.querySelector(".internal-embed")?.classList.contains(
			"captions-wiki-has-caption",
		),
		true,
	);

	renderWikiImageCaptions(root, {
		showFileNameAsCaption: false,
		alignment: "center",
		style: "italic",
	});
	assert.equal(document.querySelectorAll(".captions-wiki-caption").length, 1);
});

void test("recognizes a Wiki image before Obsidian finishes its DOM", () => {
	const { document } = parseHTML([
		'<div id="root"><span class="internal-embed"',
		' src="assets/landscape.png" alt="Swiss Alps"></span></div>',
	].join(""));
	const root = requireElement(document, "#root");

	assert.equal(hasWikiImageEmbed(root), true);
	assert.equal(
		hasWikiImageEmbed(
			requireElement(parseHTML('<div id="empty"></div>').document, "#empty"),
			"![[assets/landscape.png|Swiss Alps]]",
		),
		true,
	);
});

void test("renders a Wiki image that appears asynchronously in Reading view", async () => {
	const caption = "图 1.4 符号主义、亚符号主义与神经符号混合主义的知识表示范式";
	const { document, window } = parseHTML('<div id="root"></div>');
	const root = requireElement(document, "#root");
	const MutationObserverConstructor = window.MutationObserver as unknown as (
		new (callback: MutationCallback) => MutationObserver
	);
	const observer = new WikiImageCaptionObserver(
		root,
		() => ({
			showFileNameAsCaption: false,
			alignment: "center",
			style: "normal",
		}),
		(callback) => new MutationObserverConstructor(callback),
	);
	observer.start();

	const embed = document.createElement("span");
	embed.className = "internal-embed";
	embed.setAttribute(
		"src",
		"90-附件/10-图片/Pasted image 20260730230844.png",
	);
	embed.setAttribute("alt", caption);
	root.appendChild(embed);
	await flushDomUpdates();
	assert.equal(document.querySelector(".captions-wiki-caption"), null);

	const image = document.createElement("img");
	image.setAttribute(
		"src",
		"app://obsidian.md/Pasted%20image%2020260730230844.png",
	);
	image.setAttribute("alt", "Pasted image 20260730230844.png");
	embed.appendChild(image);
	embed.classList.add("image-embed");
	await flushDomUpdates();

	assert.equal(
		document.querySelector(".captions-wiki-caption")?.textContent,
		caption,
	);
	assert.equal(document.querySelectorAll(".captions-wiki-caption").length, 1);

	observer.stop();
});

void test("disables and re-enables Wiki Reading view observers", async () => {
	const { document, window } = parseHTML([
		'<div id="root"><span class="internal-embed image-embed"',
		' src="assets/landscape.png" alt="Swiss Alps">',
		'<img src="app://obsidian.md/landscape.png" alt="landscape.png">',
		"</span></div>",
	].join(""));
	const root = requireElement(document, "#root");
	const MutationObserverConstructor = window.MutationObserver as unknown as (
		new (callback: MutationCallback) => MutationObserver
	);
	const coordinator = new WikiImageCaptionReadingCoordinator(
		() => ({
			showFileNameAsCaption: false,
			alignment: "center",
			style: "italic",
		}),
		(callback) => new MutationObserverConstructor(callback),
	);

	coordinator.register(root);
	coordinator.enable();
	assert.equal(
		document.querySelector(".captions-wiki-caption")?.textContent,
		"Swiss Alps",
	);

	coordinator.disable();
	assert.equal(document.querySelector(".captions-wiki-caption"), null);
	const embed = requireElement(document, ".internal-embed");
	embed.setAttribute("alt", "Updated caption");
	await flushDomUpdates();
	assert.equal(document.querySelector(".captions-wiki-caption"), null);

	coordinator.enable();
	assert.equal(
		document.querySelector(".captions-wiki-caption")?.textContent,
		"Updated caption",
	);
	coordinator.clear();
});

function requireElement(document: Document, selector: string): HTMLElement {
	const element = document.querySelector(selector);
	if (element === null) {
		assert.fail(`Expected ${selector} to exist`);
	}
	return element as HTMLElement;
}

async function flushDomUpdates(): Promise<void> {
	await Promise.resolve();
	await Promise.resolve();
	await new Promise<void>((resolve) => setTimeout(resolve, 0));
}
