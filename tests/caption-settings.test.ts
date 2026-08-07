import * as assert from "node:assert/strict";
import { test } from "node:test";

import {
	getCaptionAppearanceClasses,
	getCleanFileName,
	resolveImageCaption,
} from "../src/caption-settings";

void test("uses explicit captions before file-name fallback", () => {
	assert.equal(
		resolveImageCaption("Swiss Alps", ["assets/landscape.png"], true),
		"Swiss Alps",
	);
	assert.equal(
		resolveImageCaption("landscape.png", ["assets/landscape.png"], false),
		null,
	);
	assert.equal(
		resolveImageCaption("diagram.png", ["assets/source.png"], false),
		"diagram.png",
	);
});

void test("decodes file names and removes query and hash suffixes", () => {
	assert.equal(
		getCleanFileName("assets/Swiss%20Alps.png?cache=1#preview"),
		"Swiss Alps.png",
	);
	assert.equal(
		resolveImageCaption(null, ["assets/Swiss%20Alps.png?cache=1"], true),
		"Swiss Alps.png",
	);
	assert.equal(resolveImageCaption(null, ["assets/image.png"], false), null);
});

void test("keeps malformed encoding and rejects missing file names", () => {
	assert.equal(getCleanFileName("assets/bad%name.png"), "bad%name.png");
	assert.equal(getCleanFileName("assets/"), null);
	assert.equal(resolveImageCaption(null, ["assets/"], true), null);
});

void test("creates namespaced appearance classes", () => {
	assert.deepEqual(getCaptionAppearanceClasses({
		alignment: "right",
		style: "normal",
	}), [
		"captions-caption",
		"captions-caption--right",
		"captions-caption--normal",
	]);
});
