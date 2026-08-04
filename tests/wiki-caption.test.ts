import * as assert from "node:assert/strict";
import { test } from "node:test";

import { parseWikiImageCaption } from "../src/features/wiki-image/caption";

const NO_FILE_NAME_FALLBACK = { showFileNameAsCaption: false };
const FILE_NAME_FALLBACK = { showFileNameAsCaption: true };

void test("uses a Wiki image alias as the caption", () => {
	assert.equal(
		parseWikiImageCaption(
			"Swiss Alps",
			NO_FILE_NAME_FALLBACK,
			"assets/landscape.png",
		),
		"Swiss Alps",
	);
});

void test("removes a final width or width-by-height size", () => {
	assert.equal(
		parseWikiImageCaption(
			"Swiss Alps|300",
			NO_FILE_NAME_FALLBACK,
			"landscape.png",
		),
		"Swiss Alps",
	);
	assert.equal(
		parseWikiImageCaption(
			"Swiss Alps|300x200",
			NO_FILE_NAME_FALLBACK,
			"landscape.png",
		),
		"Swiss Alps",
	);
});

void test("preserves pipes that are part of the caption", () => {
	assert.equal(
		parseWikiImageCaption(
			"North | South|300",
			NO_FILE_NAME_FALLBACK,
			"map.png",
		),
		"North | South",
	);
});

void test("does not caption a size-only Wiki image", () => {
	assert.equal(
		parseWikiImageCaption(
			"400",
			NO_FILE_NAME_FALLBACK,
			"landscape.png",
		),
		null,
	);
});

void test("uses a decoded file name when fallback is enabled", () => {
	assert.equal(
		parseWikiImageCaption(
			"400",
			FILE_NAME_FALLBACK,
			"assets/Swiss%20Alps.png?cache=1",
		),
		"Swiss Alps.png",
	);
});

void test("suppresses Obsidian's generated file-name alt text", () => {
	assert.equal(
		parseWikiImageCaption(
			"landscape.png",
			NO_FILE_NAME_FALLBACK,
			"assets/landscape.png",
		),
		null,
	);
	assert.equal(
		parseWikiImageCaption(
			"another-image.webp",
			NO_FILE_NAME_FALLBACK,
			"assets/landscape.png",
		),
		null,
	);
});

void test("handles malformed URL encoding without throwing", () => {
	assert.equal(
		parseWikiImageCaption(
			null,
			FILE_NAME_FALLBACK,
			"assets/bad%name.png",
		),
		"bad%name.png",
	);
});
