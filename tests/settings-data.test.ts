import * as assert from "node:assert/strict";
import { test } from "node:test";

import {
	createDefaultSettings,
	normalizeSettings,
} from "../src/settings-data";

void test("enables both caption engines by default", () => {
	assert.deepEqual(createDefaultSettings().engines, {
		wikiImage: true,
		pandocCrossref: true,
	});
});

void test("migrates 0.0.2 settings with both engines enabled", () => {
	const settings = normalizeSettings({
		wikiImage: {
			showFileNameAsCaption: true,
			alignment: "left",
			style: "normal",
		},
		pandocCrossref: {
			figureLabel: "Fig.",
			tableLabel: "Tbl.",
		},
	});

	assert.deepEqual(settings.engines, {
		wikiImage: true,
		pandocCrossref: true,
	});
	assert.deepEqual(settings.wikiImage, {
		showFileNameAsCaption: true,
		alignment: "left",
		style: "normal",
	});
	assert.deepEqual(settings.pandocCrossref, {
		figureLabel: "Fig.",
		tableLabel: "Tbl.",
	});
});

void test("normalizes missing and invalid persisted engine values", () => {
	const settings = normalizeSettings({
		engines: {
			wikiImage: false,
			pandocCrossref: "disabled",
		},
		wikiImage: {
			showFileNameAsCaption: "yes",
			alignment: "justify",
			style: null,
		},
		pandocCrossref: {
			figureLabel: "   ",
			tableLabel: 42,
		},
	});

	assert.deepEqual(settings, {
		engines: {
			wikiImage: false,
			pandocCrossref: true,
		},
		wikiImage: {
			showFileNameAsCaption: false,
			alignment: "center",
			style: "italic",
		},
		pandocCrossref: {
			figureLabel: "Figure",
			tableLabel: "Table",
		},
	});
	assert.deepEqual(normalizeSettings(null), createDefaultSettings());
});
