import * as assert from "node:assert/strict";
import { test } from "node:test";

import { parseHTML } from "linkedom";

import { parseQuartoDocument } from "../src/features/quarto/parser";
import { QuartoReadingCoordinator } from "../src/features/quarto/reading-coordinator";
import {
	cleanupQuartoReadingView,
	renderQuartoReadingSections,
} from "../src/features/quarto/reading-view";

const CAPTION_SETTINGS = {
	figureLabel: "Figure",
	tableLabel: "Table",
	alignment: "center",
	style: "bold",
	fontSizePercent: 85,
	spacingAbovePx: 8,
	spacingBelowPx: 8,
	figurePosition: "below",
	tablePosition: "above",
	showFileNameAsCaption: false,
} as const;

void test("renders Quarto figures, tables, and bare references across sections", () => {
	const source = [
		"![Architecture](architecture.png){#fig-architecture}",
		"",
		"| Model | Accuracy |",
		"| --- | ---: |",
		"| A | 92% |",
		"",
		": Model results {#tbl-results}",
		"",
		"See @fig-architecture and @tbl-results.",
	].join("\n");
	const model = parseQuartoDocument(source);
	const { document } = parseHTML([
		'<div id="figure-section"><p><img src="architecture.png" alt="Architecture">',
		"{#fig-architecture}</p></div>",
		'<div id="table-section"><table><tbody><tr><td>A</td><td>92%</td>',
		"</tr></tbody></table></div>",
		'<div id="caption-section"><p>: Model results {#tbl-results}</p></div>',
		'<div id="reference-section"><p>See @fig-architecture and @tbl-results.</p></div>',
	].join(""));
	const figureSection = requireElement(document, "#figure-section");
	const tableSection = requireElement(document, "#table-section");
	const captionSection = requireElement(document, "#caption-section");
	const referenceSection = requireElement(document, "#reference-section");

	renderQuartoReadingSections(
		[
			{ root: figureSection, lineStart: 0, lineEnd: 0 },
			{ root: tableSection, lineStart: 2, lineEnd: 4 },
			{ root: captionSection, lineStart: 6, lineEnd: 6 },
			{ root: referenceSection, lineStart: 8, lineEnd: 8 },
		],
		model,
		CAPTION_SETTINGS,
	);

	const figure = requireElement(document, "#figure-section > p");
	const table = requireElement(document, "table");
	assert.equal(figure.getAttribute("id"), "fig-architecture");
	const figureCaption = requireElement(
		document,
		".captions-quarto-figure-caption",
	);
	assert.equal(figureCaption.textContent, "Figure 1: Architecture");
	assert.equal(
		requireElement(document, ".captions-quarto-figure-caption")
			.classList.contains("captions-caption--center"),
		true,
	);
	assert.equal(
		figureCaption.style.getPropertyValue("--captions-caption-font-size"),
		"85%",
	);
	assert.equal(
		figureCaption.style.getPropertyValue("--captions-caption-space-above"),
		"8px",
	);
	assert.equal(
		figureCaption.style.getPropertyValue("--captions-caption-space-below"),
		"8px",
	);
	assert.equal(
		figureCaption.parentElement?.lastElementChild === figureCaption,
		true,
	);
	assert.equal(
		figureCaption.classList.contains("captions-caption--bold"),
		true,
	);
	assert.equal(table.getAttribute("id"), "tbl-results");
	assert.equal(
		requireElement(document, "table > caption").textContent,
		"Table 1: Model results",
	);
	const references = document.querySelectorAll(".captions-quarto-reference > a");
	assert.deepEqual(Array.from(references).map((reference) => reference.textContent), [
		"Figure 1",
		"Table 1",
	]);
	assert.deepEqual(Array.from(references).map((reference) => reference.getAttribute("href")), [
		"#fig-architecture",
		"#tbl-results",
	]);
	assert.deepEqual(Array.from(references).map((reference) => reference.getAttribute("style")), [
		null,
		null,
	]);
	const tableCaption = requireElement(document, "table > caption");
	assert.equal(table.firstElementChild === tableCaption, true);
	renderQuartoReadingSections(
		[
			{ root: figureSection, lineStart: 0, lineEnd: 0 },
			{ root: tableSection, lineStart: 2, lineEnd: 4 },
			{ root: captionSection, lineStart: 6, lineEnd: 6 },
			{ root: referenceSection, lineStart: 8, lineEnd: 8 },
		],
		model,
		{ ...CAPTION_SETTINGS, tablePosition: "below" },
	);
	assert.equal(table.lastElementChild === tableCaption, true);
	assert.equal(
		tableCaption.classList.contains("captions-caption--table-below"),
		true,
	);

	for (const root of [figureSection, tableSection, captionSection, referenceSection]) {
		cleanupQuartoReadingView(root);
	}
	assert.equal(figure.getAttribute("id"), null);
	assert.equal(table.getAttribute("id"), null);
	assert.equal(document.querySelector(".captions-quarto-figure-caption"), null);
	assert.equal(document.querySelector("table > caption"), null);
	assert.equal(figureSection.textContent, "{#fig-architecture}");
	assert.equal(captionSection.textContent, ": Model results {#tbl-results}");
	assert.equal(
		referenceSection.textContent,
		"See @fig-architecture and @tbl-results.",
	);
});

void test("does not resolve Pandoc references in the Quarto Reading view", () => {
	const source = [
		"![Architecture](architecture.png){#fig:architecture}",
		"",
		"See [@fig:architecture].",
	].join("\n");
	const model = parseQuartoDocument(source);
	const { document } = parseHTML([
		'<div id="figure-section"><p><img src="architecture.png" alt="Architecture">',
		"{#fig:architecture}</p></div>",
		'<div id="reference-section"><p>See [@fig:architecture].</p></div>',
	].join(""));

	renderQuartoReadingSections(
		[
			{ root: requireElement(document, "#figure-section"), lineStart: 0, lineEnd: 0 },
			{ root: requireElement(document, "#reference-section"), lineStart: 2, lineEnd: 2 },
		],
		model,
		CAPTION_SETTINGS,
	);

	assert.equal(
		requireElement(document, ".captions-quarto-figure-caption").textContent,
		"Architecture",
	);
	assert.equal(document.querySelector(".captions-quarto-reference"), null);
	assert.equal(
		requireElement(document, "#reference-section").textContent,
		"See [@fig:architecture].",
	);
});

void test("uses file-name fallback for empty Quarto figures", () => {
	const model = parseQuartoDocument([
		"![](charts/Results%202026.svg#preview)",
		"",
		"![](numbered.webp){#fig-empty}",
	].join("\n"));
	const { document } = parseHTML([
		'<div id="figure-section">',
		'<p><img src="app://obsidian.md/Results%202026.svg" alt="Results 2026.svg"></p>',
		'<p><img src="app://obsidian.md/numbered.webp" alt="numbered.webp">',
		"{#fig-empty}</p>",
		"</div>",
	].join(""));
	const root = requireElement(document, "#figure-section");

	renderQuartoReadingSections(
		[{ root, lineStart: 0, lineEnd: 2 }],
		model,
		{
			...CAPTION_SETTINGS,
			figureLabel: "Image",
			alignment: "left",
			style: "normal",
			fontSizePercent: 70,
			spacingAbovePx: 0,
			spacingBelowPx: 16,
			figurePosition: "above",
			showFileNameAsCaption: true,
		},
	);

	const captions = root.querySelectorAll<HTMLElement>(
		".captions-quarto-figure-caption",
	);
	assert.deepEqual(Array.from(captions).map((caption) => caption.textContent), [
		"Results 2026.svg",
		"Image 1: numbered.webp",
	]);
	for (const caption of Array.from(captions)) {
		assert.equal(caption.classList.contains("captions-caption--left"), true);
		assert.equal(caption.classList.contains("captions-caption--normal"), true);
		assert.equal(
			caption.style.getPropertyValue("--captions-caption-font-size"),
			"70%",
		);
		assert.equal(
			caption.style.getPropertyValue("--captions-caption-space-above"),
			"0px",
		);
		assert.equal(
			caption.style.getPropertyValue("--captions-caption-space-below"),
			"16px",
		);
	}
	for (const caption of Array.from(captions)) {
		assert.equal(caption.parentElement?.firstElementChild === caption, true);
	}
});

void test("clears and restores Quarto coordinator state", async () => {
	const source = [
		"![Architecture](architecture.png){#fig-architecture}",
		"",
		"See @fig-architecture.",
	].join("\n");
	const model = parseQuartoDocument(source);
	const { document } = parseHTML([
		'<div id="figure-section"><p><img src="architecture.png" alt="Architecture">',
		"{#fig-architecture}</p></div>",
		'<div id="reference-section"><p>See @fig-architecture.</p></div>',
	].join(""));
	const figureSection = requireElement(document, "#figure-section");
	const referenceSection = requireElement(document, "#reference-section");
	const coordinator = new QuartoReadingCoordinator(() => CAPTION_SETTINGS);
	let loadCount = 0;
	const loadDocument = (): Promise<typeof model> => {
		loadCount += 1;
		return Promise.resolve(model);
	};
	coordinator.registerSection(
		"note",
		figureSection,
		{ lineStart: 0, lineEnd: 0 },
		loadDocument,
	);
	coordinator.registerSection(
		"note",
		referenceSection,
		{ lineStart: 2, lineEnd: 2 },
		loadDocument,
	);

	coordinator.enable();
	await flushCoordinatorUpdates();
	assert.equal(loadCount, 2);
	assert.equal(document.querySelectorAll(".captions-quarto-reference").length, 1);

	coordinator.disable();
	assert.equal(document.querySelector(".captions-quarto-reference"), null);
	assert.equal(requireElement(document, "#figure-section > p").getAttribute("id"), null);

	coordinator.enable();
	await flushCoordinatorUpdates();
	assert.equal(loadCount, 4);
	assert.equal(document.querySelectorAll(".captions-quarto-reference").length, 1);
	assert.equal(
		requireElement(document, "#figure-section > p").getAttribute("id"),
		"fig-architecture",
	);
	coordinator.clear();
});

function requireElement(document: Document, selector: string): HTMLElement {
	const element = document.querySelector(selector);
	assert.notEqual(element, null, `Expected ${selector} to exist`);
	return element as HTMLElement;
}

async function flushCoordinatorUpdates(): Promise<void> {
	await Promise.resolve();
	await Promise.resolve();
	await Promise.resolve();
}
