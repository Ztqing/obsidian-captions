import * as assert from "node:assert/strict";
import { test } from "node:test";

import {
	createDefaultSettings,
	normalizeSettings,
	SETTINGS_SCHEMA_VERSION,
} from "../src/settings-data";

void test("uses a compact 0.0.9 settings schema", () => {
	assert.deepEqual(createDefaultSettings(), {
		schemaVersion: SETTINGS_SCHEMA_VERSION,
		captions: {
			showFileNameAsCaption: false,
			alignment: "center",
			style: "bold",
			fontSizePercent: 85,
			spacingAbovePx: 12,
			spacingBelowPx: 12,
			figurePosition: "below",
			tablePosition: "above",
		},
	});
});

void test("resets every pre-0.0.9 settings shape instead of migrating engines", () => {
	assert.deepEqual(normalizeSettings({
		engines: { wikiImage: false, standardMarkdown: "quarto" },
		captions: { figureLabel: "Figure", showFileNameAsCaption: true },
	}), createDefaultSettings());
});

void test("validates current settings without retaining unknown values", () => {
	const settings = normalizeSettings({
		schemaVersion: SETTINGS_SCHEMA_VERSION,
		captions: {
			showFileNameAsCaption: true,
			alignment: "right",
			style: "normal",
			fontSizePercent: 112.4,
			spacingAbovePx: 6.4,
			spacingBelowPx: -1,
			figurePosition: "above",
			tablePosition: "invalid",
		},
	});

	assert.deepEqual(settings.captions, {
		showFileNameAsCaption: true,
		alignment: "right",
		style: "normal",
		fontSizePercent: 112,
		spacingAbovePx: 6,
		spacingBelowPx: 12,
		figurePosition: "above",
		tablePosition: "above",
	});
});
