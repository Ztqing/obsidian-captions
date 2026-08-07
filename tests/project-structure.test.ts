import * as assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

interface PluginManifest {
	id: string;
	isDesktopOnly: boolean;
	minAppVersion: string;
	version: string;
}

void test("manifest exposes a cross-platform Obsidian plugin", () => {
	const manifest = JSON.parse(
		readFileSync("manifest.json", "utf8"),
	) as PluginManifest;

	assert.equal(manifest.id, "captions");
	assert.equal(manifest.version, "0.0.5");
	assert.equal(manifest.minAppVersion, "1.10.3");
	assert.equal(manifest.isDesktopOnly, false);
});
