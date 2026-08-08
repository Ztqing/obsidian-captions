import {
	EditorState,
	StateEffect,
	StateField,
} from "@codemirror/state";
import type { DecorationSet } from "@codemirror/view";
import * as assert from "node:assert/strict";
import { test } from "node:test";

import { parseHTML } from "linkedom";

import { createPandocCrossrefEditorExtension } from "../src/features/pandoc-crossref/live-preview";
import type { PandocCrossrefSettings } from "../src/features/pandoc-crossref/settings";
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
	": Model results {#tbl:results}",
	"",
	"See [@fig:architecture] and [@tbl:results].",
].join("\n");

const CAPTION_SETTINGS: PandocCrossrefSettings = {
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
};

void test("provides Pandoc block decorations from editor state", () => {
	const { document } = parseHTML("<main></main>");
	const livePreviewField = createLivePreviewField();
	const extension = createPandocCrossrefEditorExtension(
		() => CAPTION_SETTINGS,
		livePreviewField,
	) as StateField<DecorationSet>;
	assert.equal(extension instanceof StateField, true);

	let state = EditorState.create({
		doc: SOURCE,
		extensions: [livePreviewField, extension],
	});
	assert.deepEqual(renderDecorations(state, extension, document), []);

	state = state.update({ effects: setLivePreview.of(true) }).state;
	const decorations = renderDecorations(state, extension, document);
	assert.equal(decorations.length, 6);
	assert.deepEqual(
		decorations.filter((item) => item.className?.includes("editor-caption"))
			.map((item) => [item.className, item.block, item.side]),
		[
			["captions-pandoc-editor-caption captions-pandoc-editor-caption--figure captions-caption captions-caption--center captions-caption--bold captions-caption--figure-below", true, 1],
			["captions-pandoc-editor-caption captions-pandoc-editor-caption--table captions-caption captions-caption--center captions-caption--bold captions-caption--table-above", true, -1],
		],
	);
	assert.equal(
		decorations.filter((item) => item.className === "captions-pandoc-editor-reference").length,
		2,
	);
	assert.equal(
		decorations.filter((item) => item.block && item.className === null).length,
		1,
	);
});

void test("refreshes Pandoc decorations for selections, edits, settings, and mode", () => {
	const { document } = parseHTML("<main></main>");
	const livePreviewField = createLivePreviewField(true);
	let settings = CAPTION_SETTINGS;
	const extension = createPandocCrossrefEditorExtension(
		() => settings,
		livePreviewField,
	) as StateField<DecorationSet>;
	let state = EditorState.create({
		doc: SOURCE,
		extensions: [livePreviewField, extension],
	});

	const referencePosition = SOURCE.indexOf("[@fig:architecture]") + 2;
	state = state.update({ selection: { anchor: referencePosition } }).state;
	assert.equal(
		renderDecorations(state, extension, document)
			.filter((item) => item.className === "captions-pandoc-editor-reference").length,
		1,
	);

	const captionPosition = state.doc.toString().indexOf("Architecture");
	state = state.update({
		changes: { from: captionPosition, to: captionPosition + "Architecture".length, insert: "System" },
		selection: { anchor: 0 },
	}).state;
	assert.equal(
		renderDecorations(state, extension, document)
			.find((item) => item.className?.includes("editor-caption--figure"))
			?.textContent,
		"Figure 1: System",
	);

	settings = {
		...CAPTION_SETTINGS,
		figurePosition: "above",
		tablePosition: "below",
	};
	state = state.update({
		effects: StateEffect.reconfigure.of([livePreviewField, extension]),
	}).state;
	assert.deepEqual(
		renderDecorations(state, extension, document)
			.filter((item) => item.className?.includes("editor-caption"))
			.map((item) => item.side),
		[-1, 1],
	);

	state = state.update({ effects: setLivePreview.of(false) }).state;
	assert.deepEqual(renderDecorations(state, extension, document), []);
});
