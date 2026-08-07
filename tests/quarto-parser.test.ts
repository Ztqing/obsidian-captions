import * as assert from "node:assert/strict";
import { test } from "node:test";

import {
	getQuartoTargetId,
	isQuartoCrossrefTarget,
	parseQuartoDocument,
} from "../src/features/quarto/parser";

void test("classifies Quarto figures and resolves bare cross-references", () => {
	const source = [
		"![Caption only](caption.png)",
		"",
		"![Native anchor](anchor.png){#architecture}",
		"",
		"![Numbered](numbered.png){#fig-architecture}",
		"",
		"See @fig-architecture.",
	].join("\n");
	const document = parseQuartoDocument(source);

	assert.equal(document.targets.length, 3);
	assert.deepEqual(document.targets.map((target) => target.identity), [
		{ mode: "caption" },
		{ mode: "anchor", id: "architecture" },
		{ mode: "crossref", id: "fig-architecture", number: 1 },
	]);
	assert.deepEqual(document.references, [{
		id: "fig-architecture",
		from: source.indexOf("@fig-architecture"),
		to: source.indexOf("@fig-architecture") + "@fig-architecture".length,
	}]);
});

void test("pairs Quarto table captions and numbers figures and tables separately", () => {
	const source = [
		": First table {#tbl-first}",
		"",
		"| A |",
		"| --- |",
		"| 1 |",
		"",
		"![First figure](one.png){#fig-first}",
		"",
		"| B |",
		"| --- |",
		"| 2 |",
		"",
		": Second table {#tbl-second}",
		"",
		"![Second figure](two.png){#fig-second}",
	].join("\n");
	const document = parseQuartoDocument(source);
	const targetsById = new Map(document.targets.map((target) => [
		getQuartoTargetId(target),
		target,
	]));

	assert.equal(targetsById.get("tbl-first")?.identity.mode, "crossref");
	assert.equal(targetsById.get("tbl-second")?.identity.mode, "crossref");
	assert.deepEqual(
		document.targets.filter(isQuartoCrossrefTarget).map((target) => ({
			id: target.identity.id,
			number: target.identity.number,
		})),
		[
			{ id: "tbl-first", number: 1 },
			{ id: "fig-first", number: 1 },
			{ id: "tbl-second", number: 2 },
			{ id: "fig-second", number: 2 },
		],
	);
});

void test("keeps Pandoc crossref syntax outside the Quarto engine", () => {
	const source = [
		"![Pandoc figure](figure.png){#fig:architecture}",
		"",
		"| A |",
		"| --- |",
		"| 1 |",
		"",
		": Pandoc table {#tbl:results}",
		"",
		"See [@fig:architecture] and [@tbl:results].",
	].join("\n");
	const document = parseQuartoDocument(source);

	assert.deepEqual(document.targets.map((target) => target.identity), [
		{ mode: "anchor", id: "fig:architecture" },
		{ mode: "anchor", id: "tbl:results" },
	]);
	assert.deepEqual(document.references, []);
});

void test("requires complete Quarto reference boundaries", () => {
	const source = [
		"Use @fig-valid, then @tbl-results.",
		"Ignore x@fig-email, \\@fig-escaped, and @fig-partial-.",
	].join("\n");
	const document = parseQuartoDocument(source);

	assert.deepEqual(document.references.map((reference) => reference.id), [
		"fig-valid",
		"tbl-results",
	]);
});

void test("retains image sources for empty captions", () => {
	const document = parseQuartoDocument([
		"![](<assets/empty image.png>)",
		"",
		"![](numbered.png){#fig-empty}",
	].join("\n"));

	assert.equal(document.targets.length, 2);
	assert.equal(document.targets[0]?.imageSource, "assets/empty image.png");
	assert.deepEqual(document.targets[0]?.identity, { mode: "caption" });
	assert.equal(document.targets[1]?.imageSource, "numbered.png");
	assert.deepEqual(document.targets[1]?.identity, {
		mode: "crossref",
		id: "fig-empty",
		number: 1,
	});
});

void test("ignores Quarto examples in frontmatter and fenced code", () => {
	const source = [
		"---",
		"title: '@fig-frontmatter'",
		"---",
		"```markdown",
		"![Example](example.png){#fig-example}",
		"See @fig-example.",
		"```",
	].join("\n");

	assert.deepEqual(parseQuartoDocument(source), {
		targets: [],
		references: [],
		tableBlocks: [],
	});
});
