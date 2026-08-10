import * as assert from "node:assert/strict";
import { test } from "node:test";

import { parseHTML } from "linkedom";

import { parseCaptionDocument } from "../src/features/markdown/parser";
import { CaptionReadingCoordinator } from "../src/features/markdown/reading-coordinator";
import {
	cleanupCaptionReadingView,
	renderCaptionReadingSections,
} from "../src/features/markdown/reading-view";

const SETTINGS = {
	showFileNameAsCaption: false,
	alignment: "center",
	style: "bold",
	fontSizePercent: 85,
	spacingAbovePx: 8,
	spacingBelowPx: 8,
	figurePosition: "below",
	tablePosition: "above",
} as const;

void test("renders Markdown images and tables without IDs, labels, or references", () => {
	const source = [
		"![Architecture](architecture.png){#fig:architecture}",
		"",
		"| Model | Accuracy |",
		"| --- | ---: |",
		"| A | 92% |",
		"",
		": Model results {#tbl:results}",
		"",
		"See [@fig:architecture] and @tbl-results.",
	].join("\n");
	const model = parseCaptionDocument(source);
	const { document } = parseHTML([
		'<div id="figure"><p><img src="architecture.png" alt="Architecture">{#fig:architecture}</p></div>',
		'<div id="table" class="el-table"><table><tbody><tr><td>A</td><td>92%</td></tr></tbody></table></div>',
		'<div id="caption"><p>: Model results {#tbl:results}</p></div>',
		'<div id="reference"><p>See [@fig:architecture] and @tbl-results.</p></div>',
	].join(""));
	const figure = requireElement(document, "#figure");
	const table = requireElement(document, "#table");
	const caption = requireElement(document, "#caption");
	const reference = requireElement(document, "#reference");

	renderCaptionReadingSections([
		{ root: figure, lineStart: 0, lineEnd: 0 },
		{ root: table, lineStart: 2, lineEnd: 4 },
		{ root: caption, lineStart: 6, lineEnd: 6 },
		{ root: reference, lineStart: 8, lineEnd: 8 },
	], model, SETTINGS);

	assert.equal(requireElement(document, ".captions-figure-caption").textContent, "Architecture");
	assert.equal(requireElement(document, "table > caption").textContent, "Model results");
	assert.equal(document.querySelector("#figure > p")?.getAttribute("id"), null);
	assert.equal(reference.textContent, "See [@fig:architecture] and @tbl-results.");
	assert.equal(document.querySelectorAll(".captions-figure-caption").length, 1);
	assert.equal(document.querySelectorAll(".captions-table-caption").length, 1);
	assert.equal(table.classList.contains("captions-table"), true);
	assert.equal(requireElement(document, "table").classList.contains("captions-table"), false);

	renderCaptionReadingSections([
		{ root: figure, lineStart: 0, lineEnd: 0 },
		{ root: table, lineStart: 2, lineEnd: 4 },
		{ root: caption, lineStart: 6, lineEnd: 6 },
		{ root: reference, lineStart: 8, lineEnd: 8 },
	], model, { ...SETTINGS, figurePosition: "above", tablePosition: "below" });
	assert.equal(document.querySelectorAll(".captions-figure-caption").length, 1);
	assert.equal(requireElement(document, "#figure > p").firstElementChild?.classList.contains("captions-figure-caption"), true);
	assert.equal(requireElement(document, "table").lastElementChild?.tagName, "CAPTION");
	assert.equal(document.querySelectorAll(".captions-table").length, 1);

	for (const root of [figure, table, caption, reference]) {
		cleanupCaptionReadingView(root);
	}
	assert.equal(document.querySelector(".captions-figure-caption"), null);
	assert.equal(document.querySelector("table > caption"), null);
	assert.equal(table.classList.contains("captions-table"), false);
	assert.equal(requireElement(document, "table").classList.contains("captions-table"), false);
	assert.equal(caption.textContent, ": Model results {#tbl:results}");
});

void test("uses the shared file-name fallback and leaves ordinary empty images alone", () => {
	const source = [
		"![](assets/Results%202026.svg#preview)",
		"",
		"![](empty.png)",
	].join("\n");
	const model = parseCaptionDocument(source);
	const { document } = parseHTML([
		'<div id="root"><p><img src="app://obsidian.md/Results%202026.svg" alt="Results 2026.svg"></p>',
		'<p><img src="app://obsidian.md/empty.png" alt="empty.png"></p></div>',
	].join(""));
	const root = requireElement(document, "#root");

	renderCaptionReadingSections([{ root, lineStart: 0, lineEnd: 2 }], model, SETTINGS);
	assert.equal(document.querySelector(".captions-figure-caption"), null);

	renderCaptionReadingSections([{ root, lineStart: 0, lineEnd: 2 }], model, {
		...SETTINGS,
		showFileNameAsCaption: true,
	});
	assert.deepEqual(Array.from(root.querySelectorAll(".captions-figure-caption"))
		.map((element) => element.textContent), ["Results 2026.svg", "empty.png"]);
});

void test("coalesces Reading view registrations for one document", async () => {
	const source = "![Architecture](architecture.png)";
	const model = parseCaptionDocument(source);
	const { document } = parseHTML('<div id="first"><p><img src="architecture.png" alt="Architecture"></p></div><div id="second"></div>');
	const first = requireElement(document, "#first");
	const second = requireElement(document, "#second");
	const coordinator = new CaptionReadingCoordinator(() => SETTINGS);
	let loadCount = 0;
	const loadDocument = (): Promise<typeof model> => {
		loadCount += 1;
		return Promise.resolve(model);
	};

	coordinator.registerSection("note", first, { lineStart: 0, lineEnd: 0 }, loadDocument);
	coordinator.registerSection("note", second, { lineStart: 2, lineEnd: 2 }, loadDocument);
	coordinator.enable();
	await flushUpdates();

	assert.equal(loadCount, 2);
	assert.equal(document.querySelectorAll(".captions-figure-caption").length, 1);
	coordinator.clear();
});

void test("cleans legacy engine markers without touching a live Wiki caption", () => {
	const { document } = parseHTML([
		'<div id="root">',
		'<p id="fig:new" data-captions-pandoc-managed-id="true"',
		' data-captions-pandoc-previous-id="original"></p>',
		'<span class="internal-embed image-embed captions-figure">',
		'<img src="image.png">',
		'<span class="captions-figure-caption" data-captions-key="wiki">Wiki caption</span>',
		'</span></div>',
	].join(""));
	const root = requireElement(document, "#root");

	cleanupCaptionReadingView(root);

	assert.equal(document.querySelector("p")?.id, "original");
	assert.equal(document.querySelector("[data-captions-pandoc-managed-id]"), null);
	assert.equal(document.querySelector(".captions-figure-caption")?.textContent, "Wiki caption");
	assert.equal(document.querySelector(".internal-embed")?.classList.contains("captions-figure"), true);
});

function requireElement(document: Document, selector: string): HTMLElement {
	const element = document.querySelector(selector);
	assert.notEqual(element, null, `Expected ${selector} to exist`);
	return element as HTMLElement;
}

async function flushUpdates(): Promise<void> {
	await Promise.resolve();
	await Promise.resolve();
	await Promise.resolve();
}
