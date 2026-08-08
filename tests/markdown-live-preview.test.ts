import {
	EditorState,
	StateEffect,
	StateField,
} from "@codemirror/state";
import type { DecorationSet } from "@codemirror/view";
import * as assert from "node:assert/strict";
import { test } from "node:test";

import { parseHTML } from "linkedom";

import { createMarkdownCaptionEditorExtension } from "../src/features/markdown/live-preview";
import { parseCaptionDocument } from "../src/features/markdown/parser";
import {
	createLivePreviewField,
	renderDecorations,
	setLivePreview,
} from "./live-preview-test-helpers";

const SOURCE = [
	"![Architecture](architecture.png){#fig:architecture}",
	"",
	"| Model | Accuracy |",
	"| --- | ---: |",
	"| A | 92% |",
	"",
	": Model results {#tbl-results}",
	"",
	"See [@fig:architecture] and @tbl-results.",
].join("\n");

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

void test("decorates captions but never cross-reference syntax", () => {
	const { document } = parseHTML("<main></main>");
	const livePreview = createLivePreviewField();
	const extension = createMarkdownCaptionEditorExtension(
		() => SETTINGS,
		livePreview,
	) as StateField<DecorationSet>;
	let state = EditorState.create({ doc: SOURCE, extensions: [livePreview, extension] });
	assert.deepEqual(renderDecorations(state, extension, document), []);

	state = state.update({ effects: setLivePreview.of(true) }).state;
	const decorations = renderDecorations(state, extension, document);
	assert.deepEqual(decorations.filter((item) => item.className?.includes("captions-editor-caption"))
		.map((item) => [item.textContent, item.side]), [
			["Architecture", 1],
			["Model results", -1],
		]);
	assert.equal(decorations.some((item) => item.textContent?.includes("Figure")), false);
	assert.equal(decorations.filter((item) => item.className === null && item.block === false).length, 1);
});

void test("parses only after document changes and clears decorations outside Live Preview", () => {
	const { document } = parseHTML("<main></main>");
	const livePreview = createLivePreviewField(true);
	let parseCount = 0;
	const extension = createMarkdownCaptionEditorExtension(
		() => SETTINGS,
		livePreview,
		(source) => {
			parseCount += 1;
			return parseCaptionDocument(source);
		},
	) as StateField<DecorationSet>;
	let state = EditorState.create({ doc: SOURCE, extensions: [livePreview, extension] });
	assert.equal(parseCount, 1);

	state = state.update({ selection: { anchor: 0 } }).state;
	renderDecorations(state, extension, document);
	assert.equal(parseCount, 1);

	const position = SOURCE.indexOf("Architecture");
	state = state.update({
		changes: { from: position, to: position + "Architecture".length, insert: "System" },
	}).state;
	assert.equal(parseCount, 2);
	assert.equal(renderDecorations(state, extension, document)
		.find((item) => item.className?.includes("captions-editor-caption--figure"))?.textContent, "System");

	state = state.update({ effects: setLivePreview.of(false) }).state;
	assert.deepEqual(renderDecorations(state, extension, document), []);
	state = state.update({ effects: StateEffect.reconfigure.of([livePreview, extension]) }).state;
	assert.deepEqual(renderDecorations(state, extension, document), []);
});
