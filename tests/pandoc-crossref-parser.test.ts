import * as assert from "node:assert/strict";
import { test } from "node:test";

import {
	parsePandocCrossrefDocument,
	type PandocCaptionTarget,
} from "../src/features/pandoc-crossref/parser";

void test("classifies native, anchored, and crossref figures", () => {
	const document = parsePandocCrossrefDocument([
		"![Caption only](caption.png)",
		"",
		"![Native anchor](anchor.png){#architecture}",
		"",
		"![First numbered](first.png){#fig:first}",
		"",
		"![Quarto-style anchor](quarto.png){#fig-quarto}",
		"",
		"![Second numbered](second.png){#fig:second width=50%}",
	].join("\n"));

	assert.deepEqual(document.targets.map(summarizeTarget), [
		{
			kind: "figure",
			caption: "Caption only",
			identity: { mode: "caption" },
		},
		{
			kind: "figure",
			caption: "Native anchor",
			identity: { mode: "anchor", id: "architecture" },
		},
		{
			kind: "figure",
			caption: "First numbered",
			identity: { mode: "crossref", id: "fig:first", number: 1 },
		},
		{
			kind: "figure",
			caption: "Quarto-style anchor",
			identity: { mode: "anchor", id: "fig-quarto" },
		},
		{
			kind: "figure",
			caption: "Second numbered",
			identity: { mode: "crossref", id: "fig:second", number: 2 },
		},
	]);
	assert.equal(document.targets[0]?.markerText, null);
	assert.equal(document.targets[4]?.markerText, "{#fig:second width=50%}");
});

void test("classifies table captions before and after pipe tables", () => {
	const document = parsePandocCrossrefDocument([
		": Caption only",
		"",
		"| A |",
		"| --- |",
		"| 1 |",
		"",
		"| B |",
		"| --- |",
		"| 2 |",
		"",
		"Table: Native anchor {#results}",
		"",
		": Numbered {#tbl:numbered}",
		"",
		"| C |",
		"| --- |",
		"| 3 |",
	].join("\n"));

	assert.deepEqual(document.targets.map(summarizeTarget), [
		{
			kind: "table",
			caption: "Caption only",
			identity: { mode: "caption" },
		},
		{
			kind: "table",
			caption: "Native anchor",
			identity: { mode: "anchor", id: "results" },
		},
		{
			kind: "table",
			caption: "Numbered",
			identity: { mode: "crossref", id: "tbl:numbered", number: 1 },
		},
	]);
});

void test("numbers only crossref targets and keeps figure and table counters separate", () => {
	const document = parsePandocCrossrefDocument([
		"![Native](native.png)",
		"",
		"![First](one.png){#fig:one}",
		"",
		"| A |",
		"| --- |",
		"| 1 |",
		"",
		": Native table",
		"",
		"| B |",
		"| --- |",
		"| 2 |",
		"",
		": Numbered table {#tbl:data}",
		"",
		"![Second](two.png){#fig:two}",
	].join("\n"));

	assert.deepEqual(
		document.targets.map((target) => target.identity),
		[
			{ mode: "caption" },
			{ mode: "crossref", id: "fig:one", number: 1 },
			{ mode: "caption" },
			{ mode: "crossref", id: "tbl:data", number: 1 },
			{ mode: "crossref", id: "fig:two", number: 2 },
		],
	);
});

void test("parses canonical bracketed references independently of resolution", () => {
	const source = [
		"![One](one.png){#fig:one}",
		"",
		"See [@fig:one] and unresolved [@tbl:data].",
	].join("\n");
	const document = parsePandocCrossrefDocument(source);

	assert.deepEqual(
		document.references.map(({ id, from, to }) => ({
			id,
			text: source.slice(from, to),
		})),
		[
			{ id: "fig:one", text: "[@fig:one]" },
			{ id: "tbl:data", text: "[@tbl:data]" },
		],
	);
});

void test("treats attributes without matching crossref prefixes as native metadata", () => {
	const document = parsePandocCrossrefDocument([
		"![Sized](sized.png){width=50%}",
		"",
		"![Mismatched](mismatch.png){#tbl:not-a-figure}",
	].join("\n"));

	assert.deepEqual(document.targets.map(summarizeTarget), [
		{
			kind: "figure",
			caption: "Sized",
			identity: { mode: "caption" },
		},
		{
			kind: "figure",
			caption: "Mismatched",
			identity: { mode: "anchor", id: "tbl:not-a-figure" },
		},
	]);
});

void test("preserves trailing braces that are not Pandoc attributes", () => {
	const document = parsePandocCrossrefDocument([
		"| Set |",
		"| --- |",
		"| A |",
		"",
		": Result set {A}",
	].join("\n"));

	assert.equal(document.targets[0]?.caption, "Result set {A}");
	assert.equal(document.targets[0]?.attributeText, null);
	assert.deepEqual(document.targets[0]?.identity, { mode: "caption" });
});

void test("ignores fenced examples and does not treat Quarto IDs as crossrefs", () => {
	const document = parsePandocCrossrefDocument([
		"```markdown",
		"![Ignored](ignored.png){#fig:ignored}",
		"```",
		"",
		"![Quarto](quarto.png){#fig-quarto}",
		"",
		"See [@fig-ignored].",
	].join("\n"));

	assert.deepEqual(document.targets.map(summarizeTarget), [{
		kind: "figure",
		caption: "Quarto",
		identity: { mode: "anchor", id: "fig-quarto" },
	}]);
	assert.deepEqual(document.references, []);
});

void test("requires a figure to occupy its own line", () => {
	const document = parsePandocCrossrefDocument(
		"Inline ![Image](image.png){#fig:inline} content.",
	);

	assert.deepEqual(document.targets, []);
});

void test("retains image sources for empty captions and explicit anchors", () => {
	const document = parsePandocCrossrefDocument([
		"![](assets/empty%20image.png?cache=1)",
		"",
		"![](anchored.png){#empty-figure}",
	].join("\n"));

	assert.equal(document.targets.length, 2);
	assert.deepEqual(document.targets[0]?.identity, { mode: "caption" });
	assert.equal(
		document.targets[0]?.imageSource,
		"assets/empty%20image.png?cache=1",
	);
	assert.deepEqual(document.targets[1]?.identity, {
		mode: "anchor",
		id: "empty-figure",
	});
	assert.equal(document.targets[1]?.imageSource, "anchored.png");
});

function summarizeTarget(target: PandocCaptionTarget): object {
	return {
		kind: target.kind,
		caption: target.caption,
		identity: target.identity,
	};
}
