import * as assert from "node:assert/strict";
import { test } from "node:test";

import { parseHTML } from "linkedom";

import {
	applyCaptionAppearance,
	getCaptionAppearance,
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
		null,
	);
});

void test("treats generated extensions and pure dimensions as absent image captions", () => {
	assert.equal(resolveImageCaption("png", ["assets/diagram.png"], false), null);
	assert.equal(resolveImageCaption("400x300", ["assets/diagram.png"], false), null);
	assert.equal(resolveImageCaption("400x300", ["assets/diagram.png"], true), "diagram.png");
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

void test("creates and applies namespaced caption appearance", () => {
	const appearance = getCaptionAppearance({
		alignment: "right",
		style: "normal",
		fontSizePercent: 115,
		spacingAbovePx: 4,
		spacingBelowPx: 12,
		figurePosition: "below",
		tablePosition: "above",
	}, "figure");
	assert.deepEqual(appearance.classNames, [
		"captions-caption",
		"captions-caption--right",
		"captions-caption--normal",
		"captions-caption--figure-below",
	]);
	assert.equal(appearance.signature, "right|normal|115|4|12|figure|below");
	assert.notEqual(
		appearance.signature,
		getCaptionAppearance({
			alignment: "right",
			style: "normal",
			fontSizePercent: 120,
			spacingAbovePx: 4,
			spacingBelowPx: 12,
			figurePosition: "below",
			tablePosition: "above",
		}, "figure").signature,
	);
	assert.notEqual(
		appearance.signature,
		getCaptionAppearance({
			alignment: "right",
			style: "normal",
			fontSizePercent: 115,
			spacingAbovePx: 4,
			spacingBelowPx: 13,
			figurePosition: "below",
			tablePosition: "above",
		}, "figure").signature,
	);
	assert.notEqual(
		appearance.signature,
		getCaptionAppearance({
			alignment: "right",
			style: "normal",
			fontSizePercent: 115,
			spacingAbovePx: 4,
			spacingBelowPx: 12,
			figurePosition: "above",
			tablePosition: "above",
		}, "figure").signature,
	);

	const { document } = parseHTML('<div id="caption"></div>');
	const caption = document.querySelector<HTMLElement>("#caption");
	assert.notEqual(caption, null);
	applyCaptionAppearance(caption as HTMLElement, appearance);
	assert.equal(
		caption?.style.getPropertyValue("--captions-caption-font-size"),
		"115%",
	);
	assert.equal(
		caption?.style.getPropertyValue("--captions-caption-space-above"),
		"4px",
	);
	assert.equal(
		caption?.style.getPropertyValue("--captions-caption-space-below"),
		"12px",
	);
});
