import type { Extension } from "@codemirror/state";
import * as assert from "node:assert/strict";
import { test } from "node:test";

import {
	type CaptionEngine,
	type CaptionEngineId,
	CaptionEngineManager,
	type CaptionsEngineSettings,
	isCaptionEngineEnabled,
} from "../src/engine-manager";

class FakeEngine implements CaptionEngine {
	refreshCount = 0;
	disableCount = 0;
	cleanupCount = 0;

	constructor(readonly id: CaptionEngineId) {}

	createEditorExtension(): Extension {
		return this.id as unknown as Extension;
	}

	attachReadingSection(): void {}

	refresh(): void {
		this.refreshCount += 1;
	}

	disable(): void {
		this.disableCount += 1;
	}

	cleanup(): void {
		this.cleanupCount += 1;
	}
}

void test("keeps Wiki independent while selecting one standard engine", () => {
	const enabled: CaptionsEngineSettings = {
		wikiImage: true,
		standardMarkdown: "pandocCrossref",
		pandocCrossref: true,
	};
	const wiki = new FakeEngine("wikiImage");
	const pandoc = new FakeEngine("pandocCrossref");
	const quarto = new FakeEngine("quarto");
	const manager = new CaptionEngineManager(
		[wiki, pandoc, quarto],
		(id) => isCaptionEngineEnabled(enabled, id),
	);

	assert.equal(manager.createEditorExtensions().length, 2);
	manager.refresh();
	assert.equal(wiki.refreshCount, 1);
	assert.equal(pandoc.refreshCount, 1);
	assert.equal(quarto.disableCount, 1);

	enabled.standardMarkdown = "quarto";
	enabled.pandocCrossref = false;
	assert.equal(manager.createEditorExtensions().length, 2);
	manager.refresh();
	assert.equal(wiki.refreshCount, 2);
	assert.equal(pandoc.disableCount, 1);
	assert.equal(quarto.refreshCount, 1);

	enabled.standardMarkdown = "none";
	manager.refresh();
	assert.equal(manager.createEditorExtensions().length, 1);
	assert.equal(wiki.refreshCount, 3);
	assert.equal(pandoc.disableCount, 2);
	assert.equal(quarto.disableCount, 2);

	manager.cleanup();
	assert.equal(wiki.cleanupCount, 1);
	assert.equal(pandoc.cleanupCount, 1);
	assert.equal(quarto.cleanupCount, 1);
});
