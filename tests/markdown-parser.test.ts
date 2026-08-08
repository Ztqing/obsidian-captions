import * as assert from "node:assert/strict";
import { test } from "node:test";

import { parseCaptionDocument } from "../src/features/markdown/parser";

void test("parses only standalone Markdown images and keeps old references literal", () => {
	const source = [
		"![Architecture](assets/architecture.png){#fig:architecture}",
		"Inline ![ignored](inline.png) text.",
		"See [@fig:architecture] and @fig-architecture.",
	].join("\n");
	const document = parseCaptionDocument(source);

	assert.equal(document.targets.length, 1);
	const image = document.targets[0];
	assert.equal(image?.kind, "figure");
	assert.equal(image?.caption, "Architecture");
	assert.equal(image?.markerText, "{#fig:architecture}");
	assert.equal(image?.target.startLine, 0);
});

void test("ignores caption-like input in frontmatter and fenced code", () => {
	const source = [
		"---",
		"cover: ![Ignored](cover.png)",
		"---",
		"```markdown",
		"![Ignored](example.png)",
		"| A | B |",
		"| --- | --- |",
		": Ignored table",
		"```",
		"![Visible](visible.png)",
	].join("\n");
	const document = parseCaptionDocument(source);

	assert.deepEqual(document.targets.map((target) => [target.kind, target.caption]), [
		["figure", "Visible"],
	]);
});

void test("pairs pipe tables with captions before or after and discards empty captions", () => {
	const source = [
		": First result {#tbl:first}",
		"",
		"| A | B |",
		"| --- | ---: |",
		"| x | 1 |",
		"",
		"| C | D |",
		"| --- | ---: |",
		"| y | 2 |",
		"",
		"Table: Second result",
		"",
		": {#tbl:empty}",
	].join("\n");
	const document = parseCaptionDocument(source);

	assert.deepEqual(document.targets.map((target) => [
		target.kind,
		target.caption,
		target.target.startLine,
	]), [
		["table", "First result", 2],
		["table", "Second result", 6],
	]);
});

void test("retains Markdown caption pipes and parses destinations with titles", () => {
	const document = parseCaptionDocument(
		"![North | South](<assets/North%20South.png> \"title\")",
	);
	const image = document.targets[0];
	assert.equal(image?.kind, "figure");
	assert.equal(image?.caption, "North | South");
	assert.equal(image?.kind === "figure" ? image.imageSource : null, "assets/North%20South.png");
});
