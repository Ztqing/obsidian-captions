import * as assert from "node:assert/strict";
import { test } from "node:test";

import { parseHTML } from "linkedom";

import { WikiImageCaptionReadingCoordinator } from "../src/features/wiki-image/reading-coordinator";
import { WikiImageCaptionReadingLifecycle } from "../src/features/wiki-image/reading-lifecycle";

void test("uses the full Reading view scan only for initial Wiki caption activation", () => {
	const { document, window } = parseHTML([
		'<div id="view">',
		'<span class="internal-embed image-embed" src="landscape.png" alt="Swiss Alps">',
		'<img src="app://obsidian.md/landscape.png" alt="landscape.png">',
		'</span>',
		'</div>',
		'<div id="existing-view">',
		'<span class="internal-embed image-embed" src="existing.png" alt="Existing">',
		'<img src="app://obsidian.md/existing.png" alt="existing.png">',
		'</span>',
		'</div>',
	].join(""));
	const view = requireElement(document, "#view");
	const existingView = requireElement(document, "#existing-view");
	let settingsReadCount = 0;
	const getSettings = () => {
		settingsReadCount += 1;
		return {
			showFileNameAsCaption: false,
			alignment: "center",
			style: "bold",
			fontSizePercent: 85,
			spacingAbovePx: 8,
			spacingBelowPx: 8,
			figurePosition: "below",
			tablePosition: "above",
		} as const;
	};
	const MutationObserverConstructor = window.MutationObserver as unknown as (
		new (callback: MutationCallback) => MutationObserver
	);
	const coordinator = new WikiImageCaptionReadingCoordinator(
		getSettings,
		(callback) => new MutationObserverConstructor(callback),
	);
	coordinator.register(view);
	const lifecycle = new WikiImageCaptionReadingLifecycle(
		coordinator,
		getSettings,
		() => [view, existingView],
	);

	lifecycle.refresh();
	assert.equal(settingsReadCount, 1);
	assert.equal(
		view.querySelector(".captions-figure-caption")?.textContent,
		"Swiss Alps",
	);
	assert.equal(
		existingView.querySelector(".captions-figure-caption")?.textContent,
		"Existing",
	);

	requireElement(view, ".internal-embed").setAttribute("alt", "Updated registered");
	requireElement(existingView, ".internal-embed").setAttribute("alt", "Updated fallback");
	lifecycle.refresh();
	assert.equal(settingsReadCount, 2);
	assert.equal(
		view.querySelector(".captions-figure-caption")?.textContent,
		"Updated registered",
	);
	assert.equal(
		existingView.querySelector(".captions-figure-caption")?.textContent,
		"Updated fallback",
	);

	lifecycle.cleanup();
	for (const root of [view, existingView]) {
		assert.equal(root.querySelector(".captions-figure-caption"), null);
		assert.equal(root.querySelector('[data-captions-key="wiki"]'), null);
		assert.equal(root.querySelector("img[data-captions-wiki-caption]"), null);
		assert.equal(root.querySelector(".internal-embed")?.classList.contains("captions-figure"), false);
	}
});

function requireElement(root: ParentNode, selector: string): HTMLElement {
	const element = root.querySelector<HTMLElement>(selector);
	if (element === null) {
		throw new Error(`Missing element: ${selector}`);
	}
	return element;
}
