import * as assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

void test("keeps table-caption padding on the table-facing side", () => {
	const styles = readFileSync("styles.css", "utf8");
	const baseRuleIndex = styles.indexOf(".captions-table-caption {");
	const aboveRuleIndex = styles.indexOf(
		".captions-table-caption.captions-caption--table-above {",
	);
	const belowRuleIndex = styles.indexOf(
		".captions-table-caption.captions-caption--table-below {",
	);

	assert.ok(baseRuleIndex >= 0);
	assert.ok(aboveRuleIndex > baseRuleIndex);
	assert.ok(belowRuleIndex > baseRuleIndex);
	assert.match(
		styles.slice(baseRuleIndex),
		/^\.captions-table-caption\s*\{[^}]*padding-block:\s*0;/u,
	);
	assert.match(
		styles.slice(aboveRuleIndex),
		/^\.captions-table-caption\.captions-caption--table-above\s*\{[^}]*padding-block-end:\s*var\(--captions-caption-space-below,\s*12px\);/u,
	);
	assert.match(
		styles.slice(belowRuleIndex),
		/^\.captions-table-caption\.captions-caption--table-below\s*\{[^}]*padding-block-start:\s*var\(--captions-caption-space-above,\s*12px\);/u,
	);
});

void test("uses one Reading view container marker for captioned tables", () => {
	const styles = readFileSync("styles.css", "utf8");

	assert.match(
		styles,
		/\.markdown-rendered \.el-table\.captions-table\s*\{[^}]*margin-block-start:\s*var\(--p-spacing\);[^}]*margin-block-end:\s*var\(--p-spacing\);/u,
	);
	assert.match(
		styles,
		/\.markdown-rendered \.el-table\.captions-table > table\s*\{[^}]*margin-block-start:\s*0;[^}]*margin-block-end:\s*0;/u,
	);
	assert.equal(styles.includes("captions-table-wrapper"), false);
});

void test("keeps figure-caption spacing on the image-facing side", () => {
	const styles = readFileSync("styles.css", "utf8");
	const baseRuleIndex = styles.indexOf(".captions-figure-caption,");
	const aboveRuleIndex = styles.indexOf(
		".captions-figure-caption.captions-caption--figure-above,",
	);
	const belowRuleIndex = styles.indexOf(
		".captions-figure-caption.captions-caption--figure-below,",
	);

	assert.ok(baseRuleIndex >= 0);
	assert.ok(aboveRuleIndex > baseRuleIndex);
	assert.ok(belowRuleIndex > aboveRuleIndex);
	assert.match(
		styles.slice(baseRuleIndex),
		/^\.captions-figure-caption,[\s\S]*?\.captions-editor-caption--figure\s*\{[^}]*margin-block:\s*0;/u,
	);
	assert.match(
		styles.slice(aboveRuleIndex),
		/^\.captions-figure-caption\.captions-caption--figure-above,[\s\S]*?\{[^}]*margin-block-end:\s*var\(--captions-caption-space-below,\s*12px\);/u,
	);
	assert.match(
		styles.slice(belowRuleIndex),
		/^\.captions-figure-caption\.captions-caption--figure-below,[\s\S]*?\{[^}]*margin-block-start:\s*var\(--captions-caption-space-above,\s*12px\);/u,
	);
});

void test("preserves Live Preview table-caption spacing", () => {
	const styles = readFileSync("styles.css", "utf8");

	assert.match(
		styles,
		/\.captions-editor-caption--table\s*\{[^}]*margin-block-start:\s*var\(--captions-caption-space-above,\s*12px\);[^}]*margin-block-end:\s*var\(--captions-caption-space-below,\s*12px\);/u,
	);
});
