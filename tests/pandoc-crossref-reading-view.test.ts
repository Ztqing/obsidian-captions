import * as assert from "node:assert/strict";
import { test } from "node:test";

import { parseHTML } from "linkedom";

import { parsePandocCrossrefDocument } from "../src/features/pandoc-crossref/parser";
import { PandocCrossrefReadingCoordinator } from "../src/features/pandoc-crossref/reading-coordinator";
import {
	cleanupPandocCrossrefReadingView,
	renderPandocCrossrefReadingSections,
} from "../src/features/pandoc-crossref/reading-view";

const CAPTION_SETTINGS = {
	figureLabel: "Figure",
	tableLabel: "Table",
	alignment: "center",
	style: "italic",
	showFileNameAsCaption: false,
} as const;

void test("pairs a table and caption rendered in separate Obsidian sections", () => {
	const source = [
		"| Crop | Yield |",
		"| --- | ---: |",
		"| Peas | 12 |",
		"",
		": Garden peas {#tbl:peas}",
		"",
		"See [@tbl:peas].",
	].join("\n");
	const model = parsePandocCrossrefDocument(source);
	const { document } = parseHTML([
		'<div id="table-section"><div class="table-wrapper">',
		"<table><thead><tr><th>Crop</th><th>Yield</th></tr></thead>",
		"<tbody><tr><td>Peas</td><td>12</td></tr></tbody></table>",
		"</div></div>",
		'<div id="caption-section"><p>: Garden peas {#tbl:peas}</p></div>',
		'<div id="reference-section"><p>See [@tbl:peas].</p></div>',
	].join(""));
	const tableSection = requireElement(document, "#table-section");
	const captionSection = requireElement(document, "#caption-section");
	const referenceSection = requireElement(document, "#reference-section");

	renderPandocCrossrefReadingSections(
		[
			{ root: tableSection, lineStart: 0, lineEnd: 2 },
			{ root: captionSection, lineStart: 4, lineEnd: 4 },
			{ root: referenceSection, lineStart: 6, lineEnd: 6 },
		],
		model,
		CAPTION_SETTINGS,
	);

	const table = requireElement(document, "table");
	assert.equal(table.getAttribute("id"), "tbl:peas");
	assert.equal(
		requireElement(document, "table > caption").textContent,
		"Table 1: Garden peas",
	);
	assert.equal(
		requireElement(document, "table > caption").classList.contains(
			"captions-caption--center",
		),
		true,
	);
	assert.equal(
		requireElement(document, "table > caption").classList.contains(
			"captions-caption--italic",
		),
		true,
	);
	assert.equal(
		requireElement(document, "#caption-section > p")
			.classList.contains("captions-pandoc-source-caption"),
		true,
	);
	const reference = requireElement(document, ".captions-pandoc-reference > a");
	assert.equal(reference.textContent, "Table 1");
	assert.equal(reference.getAttribute("href"), "#tbl:peas");

	for (const root of [tableSection, captionSection, referenceSection]) {
		cleanupPandocCrossrefReadingView(root);
	}
	assert.equal(table.getAttribute("id"), null);
	assert.equal(document.querySelector("table > caption"), null);
	assert.equal(captionSection.textContent, ": Garden peas {#tbl:peas}");
	assert.equal(referenceSection.textContent, "See [@tbl:peas].");
});

void test("maps a labeled table after an unlabeled table in the same section", () => {
	const source = [
		"| Unlabeled |",
		"| --- |",
		"| First |",
		"",
		"| Labeled |",
		"| --- |",
		"| Second |",
		"",
		": Selected table {#tbl:selected}",
	].join("\n");
	const model = parsePandocCrossrefDocument(source);
	const { document } = parseHTML([
		'<div id="tables-section">',
		"<table><thead><tr><th>Unlabeled</th></tr></thead></table>",
		"<table><thead><tr><th>Labeled</th></tr></thead></table>",
		"</div>",
		'<div id="caption-section"><p>: Selected table {#tbl:selected}</p></div>',
	].join(""));
	const tablesSection = requireElement(document, "#tables-section");
	const captionSection = requireElement(document, "#caption-section");

	renderPandocCrossrefReadingSections(
		[
			{ root: tablesSection, lineStart: 0, lineEnd: 6 },
			{ root: captionSection, lineStart: 8, lineEnd: 8 },
		],
		model,
		CAPTION_SETTINGS,
	);

	const tables = document.querySelectorAll("table");
	assert.equal(tables[0]?.getAttribute("id"), null);
	assert.equal(tables[0]?.querySelector("caption"), null);
	assert.equal(tables[1]?.getAttribute("id"), "tbl:selected");
	assert.equal(tables[1]?.querySelector("caption")?.textContent, "Table 1: Selected table");
});

void test("renders an unlabelled table caption across Obsidian sections", () => {
	const source = [
		"| Crop | Yield |",
		"| --- | ---: |",
		"| Peas | 12 |",
		"",
		": Garden peas",
	].join("\n");
	const model = parsePandocCrossrefDocument(source);
	const { document } = parseHTML([
		'<div id="table-section"><table>',
		"<thead><tr><th>Crop</th><th>Yield</th></tr></thead>",
		"<tbody><tr><td>Peas</td><td>12</td></tr></tbody>",
		"</table></div>",
		'<div id="caption-section"><p>: Garden peas</p></div>',
	].join(""));
	const tableSection = requireElement(document, "#table-section");
	const captionSection = requireElement(document, "#caption-section");

	renderPandocCrossrefReadingSections(
		[
			{ root: tableSection, lineStart: 0, lineEnd: 2 },
			{ root: captionSection, lineStart: 4, lineEnd: 4 },
		],
		model,
		CAPTION_SETTINGS,
	);

	const table = requireElement(document, "table");
	assert.equal(table.getAttribute("id"), null);
	assert.equal(requireElement(document, "table > caption").textContent, "Garden peas");
	assert.equal(document.querySelector("table > caption .captions-pandoc-label"), null);
	assert.equal(
		requireElement(document, "#caption-section > p")
			.classList.contains("captions-pandoc-source-caption"),
		true,
	);

	cleanupPandocCrossrefReadingView(tableSection);
	cleanupPandocCrossrefReadingView(captionSection);
	assert.equal(document.querySelector("table > caption"), null);
	assert.equal(table.classList.contains("captions-pandoc-table"), false);
	assert.equal(captionSection.textContent, ": Garden peas");
});

void test("renders a native table ID without numbering or crossref replacement", () => {
	const source = [
		"| Crop |",
		"| --- |",
		"| Peas |",
		"",
		": Garden peas {#peas}",
		"",
		"See [@tbl:peas] or [details](#peas).",
	].join("\n");
	const model = parsePandocCrossrefDocument(source);
	const { document } = parseHTML([
		'<div id="table-section"><table><tbody><tr><td>Peas</td></tr></tbody></table></div>',
		'<div id="caption-section"><p>: Garden peas {#peas}</p></div>',
		'<div id="reference-section"><p>See [@tbl:peas] or ',
		'<a href="#peas">details</a>.</p></div>',
	].join(""));
	const tableSection = requireElement(document, "#table-section");
	const captionSection = requireElement(document, "#caption-section");
	const referenceSection = requireElement(document, "#reference-section");

	renderPandocCrossrefReadingSections(
		[
			{ root: tableSection, lineStart: 0, lineEnd: 2 },
			{ root: captionSection, lineStart: 4, lineEnd: 4 },
			{ root: referenceSection, lineStart: 6, lineEnd: 6 },
		],
		model,
		CAPTION_SETTINGS,
	);

	assert.equal(requireElement(document, "table").getAttribute("id"), "peas");
	assert.equal(requireElement(document, "table > caption").textContent, "Garden peas");
	assert.equal(document.querySelector(".captions-pandoc-reference"), null);
	assert.equal(referenceSection.textContent, "See [@tbl:peas] or details.");
	assert.equal(
		requireElement(document, '#reference-section a[href="#peas"]').textContent,
		"details",
	);
});

void test("renders native and crossref figures without shifting numbering", () => {
	const source = [
		"![Caption only](caption.png)",
		"",
		"![Native anchor](anchor.png){#architecture}",
		"",
		"![Numbered](numbered.png){#fig:numbered}",
		"",
		"See [@fig:numbered].",
	].join("\n");
	const model = parsePandocCrossrefDocument(source);
	const { document } = parseHTML([
		'<div id="figure-section">',
		'<p><img src="caption.png" alt="Caption only"></p>',
		'<p><img src="anchor.png" alt="Native anchor">{#architecture}</p>',
		'<p><img src="numbered.png" alt="Numbered">{#fig:numbered}</p>',
		"</div>",
		'<div id="reference-section"><p>See [@fig:numbered].</p></div>',
	].join(""));
	const figureSection = requireElement(document, "#figure-section");
	const referenceSection = requireElement(document, "#reference-section");

	renderPandocCrossrefReadingSections(
		[
			{ root: figureSection, lineStart: 0, lineEnd: 4 },
			{ root: referenceSection, lineStart: 6, lineEnd: 6 },
		],
		model,
		CAPTION_SETTINGS,
	);

	const figures = figureSection.querySelectorAll("p");
	const captions = figureSection.querySelectorAll(".captions-pandoc-figure-caption");
	assert.equal(captions[0]?.textContent, "Caption only");
	assert.equal(captions[1]?.textContent, "Native anchor");
	assert.equal(captions[2]?.textContent, "Figure 1: Numbered");
	assert.equal(figures[0]?.getAttribute("id"), null);
	assert.equal(figures[1]?.getAttribute("id"), "architecture");
	assert.equal(figures[2]?.getAttribute("id"), "fig:numbered");
	assert.equal(
		requireElement(document, ".captions-pandoc-reference > a").textContent,
		"Figure 1",
	);

	cleanupPandocCrossrefReadingView(figureSection);
	cleanupPandocCrossrefReadingView(referenceSection);
	assert.equal(figureSection.querySelector(".captions-pandoc-figure-caption"), null);
	assert.equal(figures[1]?.getAttribute("id"), null);
	assert.equal(figures[2]?.getAttribute("id"), null);
	assert.equal(
		Array.from(figures).some((figure) => (
			figure.classList.contains("captions-pandoc-figure")
		)),
		false,
	);
});

void test("pairs figures with duplicate captions by source order", () => {
	const source = [
		"![Same caption](first.png)",
		"",
		"![Same caption](second.png){#second}",
	].join("\n");
	const model = parsePandocCrossrefDocument(source);
	const { document } = parseHTML([
		'<div id="figure-section">',
		'<p><img src="first.png" alt="Same caption"></p>',
		'<p><img src="second.png" alt="Same caption">{#second}</p>',
		"</div>",
	].join(""));
	const figureSection = requireElement(document, "#figure-section");

	renderPandocCrossrefReadingSections(
		[{ root: figureSection, lineStart: 0, lineEnd: 2 }],
		model,
		CAPTION_SETTINGS,
	);

	const figures = figureSection.querySelectorAll("p");
	assert.equal(figures[0]?.getAttribute("id"), null);
	assert.equal(figures[1]?.getAttribute("id"), "second");
	assert.equal(
		figures[0]?.querySelectorAll(".captions-pandoc-figure-caption").length,
		1,
	);
	assert.equal(
		figures[1]?.querySelectorAll(".captions-pandoc-figure-caption").length,
		1,
	);
});

void test("uses file-name fallback and refreshes Pandoc figure appearance", () => {
	const source = [
		"![](assets/Swiss%20Alps.png?cache=1)",
		"",
		"![](numbered.png){#fig:empty}",
	].join("\n");
	const model = parsePandocCrossrefDocument(source);
	const { document } = parseHTML([
		'<div id="figure-section">',
		'<p><img src="app://obsidian.md/Swiss%20Alps.png" alt="Swiss Alps.png"></p>',
		'<p><img src="app://obsidian.md/numbered.png" alt="numbered.png">',
		"{#fig:empty}</p>",
		"</div>",
	].join(""));
	const root = requireElement(document, "#figure-section");

	renderPandocCrossrefReadingSections(
		[{ root, lineStart: 0, lineEnd: 2 }],
		model,
		CAPTION_SETTINGS,
	);
	let captions = root.querySelectorAll(".captions-pandoc-figure-caption");
	assert.equal(captions.length, 1);
	assert.equal(captions[0]?.textContent, "Figure 1");

	renderPandocCrossrefReadingSections(
		[{ root, lineStart: 0, lineEnd: 2 }],
		model,
		{
			...CAPTION_SETTINGS,
			figureLabel: "Illustration",
			alignment: "right",
			style: "normal",
			showFileNameAsCaption: true,
		},
	);
	captions = root.querySelectorAll(".captions-pandoc-figure-caption");
	assert.deepEqual(Array.from(captions).map((caption) => caption.textContent), [
		"Swiss Alps.png",
		"Illustration 1: numbered.png",
	]);
	for (const caption of Array.from(captions)) {
		assert.equal(caption.classList.contains("captions-caption--right"), true);
		assert.equal(caption.classList.contains("captions-caption--normal"), true);
	}
	assert.equal(captions.length, 2);
});

void test("disables and re-enables Pandoc Reading view state", async () => {
	const source = [
		"| Crop | Yield |",
		"| --- | ---: |",
		"| Peas | 12 |",
		"",
		": Garden peas {#tbl:peas}",
		"",
		"See [@tbl:peas].",
	].join("\n");
	const model = parsePandocCrossrefDocument(source);
	const { document } = parseHTML([
		'<div id="table-section"><table><tbody><tr><td>Peas</td></tr></tbody></table></div>',
		'<div id="caption-section"><p>: Garden peas {#tbl:peas}</p></div>',
		'<div id="reference-section"><p>See [@tbl:peas].</p></div>',
	].join(""));
	const tableSection = requireElement(document, "#table-section");
	const captionSection = requireElement(document, "#caption-section");
	const referenceSection = requireElement(document, "#reference-section");
	const coordinator = new PandocCrossrefReadingCoordinator(
		() => CAPTION_SETTINGS,
	);
	let loadCount = 0;
	const loadDocument = (): Promise<typeof model> => {
		loadCount += 1;
		return Promise.resolve(model);
	};

	coordinator.registerSection(
		"note",
		tableSection,
		{ lineStart: 0, lineEnd: 2 },
		loadDocument,
	);
	coordinator.registerSection(
		"note",
		captionSection,
		{ lineStart: 4, lineEnd: 4 },
		loadDocument,
	);
	coordinator.registerSection(
		"note",
		referenceSection,
		{ lineStart: 6, lineEnd: 6 },
		loadDocument,
	);
	assert.equal(loadCount, 0);
	assert.equal(document.querySelector("table > caption"), null);

	coordinator.enable();
	await flushCoordinatorUpdates();
	assert.equal(loadCount, 3);
	assert.equal(requireElement(document, "table").getAttribute("id"), "tbl:peas");
	assert.equal(
		requireElement(document, "table > caption").textContent,
		"Table 1: Garden peas",
	);
	assert.equal(
		requireElement(document, ".captions-pandoc-reference > a").textContent,
		"Table 1",
	);

	coordinator.disable();
	assert.equal(requireElement(document, "table").getAttribute("id"), null);
	assert.equal(document.querySelector("table > caption"), null);
	assert.equal(captionSection.textContent, ": Garden peas {#tbl:peas}");
	assert.equal(referenceSection.textContent, "See [@tbl:peas].");

	coordinator.enable();
	await flushCoordinatorUpdates();
	assert.equal(loadCount, 6);
	assert.equal(requireElement(document, "table").getAttribute("id"), "tbl:peas");
	assert.equal(document.querySelectorAll("table > caption").length, 1);
	assert.equal(document.querySelectorAll(".captions-pandoc-reference").length, 1);
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
