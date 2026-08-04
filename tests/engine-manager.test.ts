import type { Extension } from "@codemirror/state";
import * as assert from "node:assert/strict";
import { test } from "node:test";

import {
	type CaptionEngine,
	type CaptionEngineId,
	CaptionEngineManager,
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

void test("manages caption engines independently and supports re-enabling", () => {
	const enabled = {
		wikiImage: true,
		pandocCrossref: true,
	};
	const wiki = new FakeEngine("wikiImage");
	const pandoc = new FakeEngine("pandocCrossref");
	const manager = new CaptionEngineManager(
		[wiki, pandoc],
		(id) => enabled[id],
	);

	assert.equal(manager.createEditorExtensions().length, 2);
	manager.refresh();
	assert.equal(wiki.refreshCount, 1);
	assert.equal(pandoc.refreshCount, 1);

	enabled.wikiImage = false;
	assert.equal(manager.createEditorExtensions().length, 1);
	manager.refresh();
	assert.equal(wiki.disableCount, 1);
	assert.equal(pandoc.refreshCount, 2);

	enabled.wikiImage = true;
	manager.refresh();
	assert.equal(wiki.refreshCount, 2);
	assert.equal(pandoc.refreshCount, 3);

	manager.cleanup();
	assert.equal(wiki.cleanupCount, 1);
	assert.equal(pandoc.cleanupCount, 1);
});
