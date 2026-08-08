import * as assert from "node:assert/strict";
import { test } from "node:test";

import {
	createDefaultSettings,
	normalizeSettings,
} from "../src/settings-data";

void test("enables Wiki and selects Pandoc by default", () => {
	assert.deepEqual(createDefaultSettings(), {
		engines: {
			wikiImage: true,
			standardMarkdown: "pandocCrossref",
			pandocCrossref: true,
		},
		captions: {
			figureLabel: "Figure",
			tableLabel: "Table",
			alignment: "center",
			style: "bold",
			fontSizePercent: 85,
			spacingAbovePx: 12,
			spacingBelowPx: 12,
			figurePosition: "below",
			tablePosition: "above",
			showFileNameAsCaption: false,
		},
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
		standardMarkdown: "pandocCrossref",
		pandocCrossref: true,
	});
	assert.deepEqual(settings.captions, {
		figureLabel: "Fig.",
		tableLabel: "Tbl.",
		showFileNameAsCaption: true,
		alignment: "left",
		style: "normal",
		fontSizePercent: 85,
		spacingAbovePx: 12,
		spacingBelowPx: 12,
		figurePosition: "below",
		tablePosition: "above",
	});
});

void test("migrates 0.0.3 engine toggles to the standard engine selection", () => {
	assert.equal(normalizeSettings({
		engines: { wikiImage: true, pandocCrossref: false },
	}).engines.standardMarkdown, "none");
	assert.deepEqual(normalizeSettings({
		engines: {
			wikiImage: false,
			standardMarkdown: "quarto",
			pandocCrossref: true,
		},
	}).engines, {
		wikiImage: false,
		standardMarkdown: "quarto",
		pandocCrossref: false,
	});
});

void test("migrates labels from the selected 0.0.4 standard engine", () => {
	const stored = {
		wikiImage: {
			showFileNameAsCaption: false,
			alignment: "center",
			style: "italic",
		},
		pandocCrossref: {
			figureLabel: "Pandoc figure",
			tableLabel: "Pandoc table",
		},
		quarto: {
			figureLabel: "Quarto figure",
			tableLabel: "Quarto table",
		},
	};

	assert.deepEqual(normalizeSettings({
		...stored,
		engines: { standardMarkdown: "quarto" },
	}).captions, {
		figureLabel: "Quarto figure",
		tableLabel: "Quarto table",
		showFileNameAsCaption: false,
		alignment: "center",
		style: "italic",
		fontSizePercent: 85,
		spacingAbovePx: 12,
		spacingBelowPx: 12,
		figurePosition: "below",
		tablePosition: "above",
	});
	assert.equal(normalizeSettings({
		...stored,
		engines: { standardMarkdown: "none" },
	}).captions.figureLabel, "Pandoc figure");
});

void test("prefers and validates the 0.0.5 captions object", () => {
	const settings = normalizeSettings({
		captions: {
			figureLabel: " Illustration ",
			tableLabel: "Data table",
			showFileNameAsCaption: true,
			alignment: "right",
			style: "normal",
		},
		wikiImage: {
			showFileNameAsCaption: false,
			alignment: "left",
			style: "italic",
		},
		pandocCrossref: {
			figureLabel: "Old figure",
			tableLabel: "Old table",
		},
	});

	assert.deepEqual(settings.captions, {
		figureLabel: "Illustration",
		tableLabel: "Data table",
		showFileNameAsCaption: true,
		alignment: "right",
		style: "normal",
		fontSizePercent: 85,
		spacingAbovePx: 12,
		spacingBelowPx: 12,
		figurePosition: "below",
		tablePosition: "above",
	});
});

void test("validates and quantizes 0.0.6 appearance values", () => {
	const settings = normalizeSettings({
		captions: {
			figureLabel: "Figure",
			tableLabel: "Table",
			showFileNameAsCaption: false,
			alignment: "center",
			style: "italic",
			fontSizePercent: 112.4,
			spacingAbovePx: 6.4,
			spacingBelowPx: 8.7,
			figurePosition: "above",
			tablePosition: "below",
		},
	});

	assert.equal(settings.captions.fontSizePercent, 112);
	assert.equal(settings.captions.spacingAbovePx, 6);
	assert.equal(settings.captions.spacingBelowPx, 9);
	assert.equal(settings.captions.figurePosition, "above");
	assert.equal(settings.captions.tablePosition, "below");
});

void test("normalizes missing and invalid persisted engine values", () => {
	const settings = normalizeSettings({
		engines: {
			wikiImage: false,
			standardMarkdown: "invalid",
			pandocCrossref: "disabled",
		},
		captions: {
			figureLabel: " Fig. ",
			tableLabel: "   ",
			showFileNameAsCaption: "yes",
			alignment: "right",
			style: null,
			fontSizePercent: Number.POSITIVE_INFINITY,
			spacingAbovePx: -1,
			spacingBelowPx: "8",
			figurePosition: "left",
			tablePosition: null,
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
		quarto: {
			figureLabel: [],
			tableLabel: " Tbl. ",
		},
	});

	assert.deepEqual(settings, {
		engines: {
			wikiImage: false,
			standardMarkdown: "pandocCrossref",
			pandocCrossref: true,
		},
		captions: {
			figureLabel: "Fig.",
			tableLabel: "Table",
			showFileNameAsCaption: false,
			alignment: "right",
			style: "bold",
			fontSizePercent: 85,
			spacingAbovePx: 12,
			spacingBelowPx: 12,
			figurePosition: "below",
			tablePosition: "above",
		},
	});
	assert.deepEqual(normalizeSettings(null), createDefaultSettings());
});
