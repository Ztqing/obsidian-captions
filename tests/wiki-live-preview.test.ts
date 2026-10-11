import { EditorState } from "@codemirror/state";
import * as assert from "node:assert/strict";
import { test } from "node:test";

import {
	getWikiImageCaptionSourcePosition,
	selectionOverlapsWikiImageEmbed,
	shouldDeferWikiImageCaptionRender,
	shouldRenderWikiImageCaptions,
} from "../src/features/wiki-image/live-preview";
import {
	createLivePreviewField,
	setLivePreview,
} from "./live-preview-test-helpers";

void test("treats only source positions inside a Wiki embed as active editing", () => {
	assert.equal(selectionOverlapsWikiImageEmbed({ from: 12, to: 12 }, 10, 20), true);
	assert.equal(selectionOverlapsWikiImageEmbed({ from: 10, to: 10 }, 10, 20), false);
	assert.equal(selectionOverlapsWikiImageEmbed({ from: 20, to: 20 }, 10, 20), false);
	assert.equal(selectionOverlapsWikiImageEmbed({ from: 5, to: 7 }, 10, 20), false);
	assert.equal(selectionOverlapsWikiImageEmbed({ from: 18, to: 24 }, 10, 20), true);
});

void test("maps Wiki caption clicks to the matching aliased embed", () => {
	const source = "![[first.png|First]] ![[second.png|Second]]";
	const secondEmbedStart = source.indexOf("![[second.png");
	const secondEmbedEnd = source.indexOf("]]", secondEmbedStart) + 2;
	const aliasPosition = source.indexOf("Second");

	assert.equal(
		getWikiImageCaptionSourcePosition(source, secondEmbedStart),
		source.indexOf("Second"),
	);
	assert.equal(
		getWikiImageCaptionSourcePosition(source, secondEmbedStart, secondEmbedEnd),
		aliasPosition,
	);
	assert.equal(
		getWikiImageCaptionSourcePosition(source, secondEmbedStart + 1, secondEmbedEnd - 1),
		aliasPosition,
	);
	assert.equal(getWikiImageCaptionSourcePosition(source, secondEmbedStart - 1), null);
	assert.equal(getWikiImageCaptionSourcePosition("![[first.png]]", 0), null);
});

void test("defers Wiki caption DOM updates while IME composition is active", () => {
	assert.equal(shouldDeferWikiImageCaptionRender(true), true);
	assert.equal(shouldDeferWikiImageCaptionRender(false), false);
});

void test("gates Wiki DOM captions to Live Preview", () => {
	const livePreview = createLivePreviewField(false);
	let state = EditorState.create({ extensions: [livePreview] });
	assert.equal(shouldRenderWikiImageCaptions(state, livePreview), false);

	state = state.update({ effects: setLivePreview.of(true) }).state;
	assert.equal(shouldRenderWikiImageCaptions(state, livePreview), true);

	state = state.update({ effects: setLivePreview.of(false) }).state;
	assert.equal(shouldRenderWikiImageCaptions(state, livePreview), false);
});
