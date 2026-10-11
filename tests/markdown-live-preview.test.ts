import {
	EditorState,
	StateEffect,
	StateField,
} from "@codemirror/state";
import type { DecorationSet } from "@codemirror/view";
import * as assert from "node:assert/strict";
import { test } from "node:test";

import { parseHTML } from "linkedom";

import type { CaptionSettings } from "../src/caption-settings";
import { createCaptionRefreshEffect } from "../src/features/shared/editor-refresh";
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
	"Table: Model results {#tbl-results}",
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

void test("rebuilds table caption decoration when appearance settings change", () => {
	const { document } = parseHTML("<main></main>");
	const livePreview = createLivePreviewField(true);
	let settings: CaptionSettings = { ...SETTINGS };
	const extension = createMarkdownCaptionEditorExtension(
		() => settings,
		livePreview,
	) as StateField<DecorationSet>;
	let state = EditorState.create({ doc: SOURCE, extensions: [livePreview, extension] });
	const before = renderDecorations(state, extension, document)
		.find((item) => item.className?.includes("captions-editor-caption--table"));
	assert.ok(before?.className?.includes("captions-caption--center"));

	settings = { ...SETTINGS, alignment: "left", fontSizePercent: 125 };
	state = state.update({ effects: createCaptionRefreshEffect() }).state;
	const after = renderDecorations(state, extension, document)
		.find((item) => item.className?.includes("captions-editor-caption--table"));
	assert.ok(after?.className?.includes("captions-caption--left"));
	assert.equal(after?.fontSize, "125%");
});

void test("hides a Markdown image caption only while its source is selected", () => {
	const { document } = parseHTML("<main></main>");
	const livePreview = createLivePreviewField(true);
	const extension = createMarkdownCaptionEditorExtension(
		() => SETTINGS,
		livePreview,
	) as StateField<DecorationSet>;
	let state = EditorState.create({ doc: SOURCE, extensions: [livePreview, extension] });
	const imageFrom = SOURCE.indexOf("![Architecture]");
	const imageTo = imageFrom + "![Architecture](architecture.png){#fig:architecture}".length;

	state = state.update({ selection: { anchor: imageFrom + 5 } }).state;
	assert.equal(renderDecorations(state, extension, document).some((item) => (
		item.className?.includes("captions-editor-caption--figure") === true
	)), false);

	state = state.update({ selection: { anchor: 0 } }).state;
	assert.equal(renderDecorations(state, extension, document).some((item) => (
		item.className?.includes("captions-editor-caption--figure") === true
	)), true);

	state = state.update({ selection: { anchor: imageFrom } }).state;
	assert.equal(renderDecorations(state, extension, document).some((item) => (
		item.className?.includes("captions-editor-caption--figure") === true
	)), true);

	state = state.update({ selection: { anchor: imageTo } }).state;
	assert.equal(renderDecorations(state, extension, document).some((item) => (
		item.className?.includes("captions-editor-caption--figure") === true
	)), true);
});

void test("shows an editable table caption source while editing", () => {
	const { document } = parseHTML("<main></main>");
	const livePreview = createLivePreviewField(true);
	const extension = createMarkdownCaptionEditorExtension(
		() => SETTINGS,
		livePreview,
	) as StateField<DecorationSet>;
	let state = EditorState.create({ doc: SOURCE, extensions: [livePreview, extension] });
	const markerFrom = SOURCE.indexOf("Table:");

	state = state.update({ selection: { anchor: markerFrom + 1 } }).state;
	const editingDecorations = renderDecorations(state, extension, document);
	assert.equal(editingDecorations.some((item) => (
		item.className?.includes("captions-editor-caption--table") === true
	)), false);
	assert.equal(editingDecorations.some((item) => (
		item.className === null && item.block && item.from === markerFrom
	)), false);

	state = state.update({ selection: { anchor: 0 } }).state;
	const renderedDecorations = renderDecorations(state, extension, document);
	assert.equal(renderedDecorations.some((item) => (
		item.className?.includes("captions-editor-caption--table") === true
	)), true);
	assert.equal(renderedDecorations.some((item) => (
		item.className === null && item.block && item.from === markerFrom
	)), true);
});
