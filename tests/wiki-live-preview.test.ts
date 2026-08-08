import { EditorState } from "@codemirror/state";
import * as assert from "node:assert/strict";
import { test } from "node:test";

import { shouldRenderWikiImageCaptions } from "../src/features/wiki-image/live-preview";
import {
	createLivePreviewField,
	setLivePreview,
} from "./live-preview-test-helpers";

void test("gates Wiki DOM captions to Live Preview", () => {
	const livePreview = createLivePreviewField(false);
	let state = EditorState.create({ extensions: [livePreview] });
	assert.equal(shouldRenderWikiImageCaptions(state, livePreview), false);

	state = state.update({ effects: setLivePreview.of(true) }).state;
	assert.equal(shouldRenderWikiImageCaptions(state, livePreview), true);

	state = state.update({ effects: setLivePreview.of(false) }).state;
	assert.equal(shouldRenderWikiImageCaptions(state, livePreview), false);
});
