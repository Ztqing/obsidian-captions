export type QuartoTargetKind = "figure" | "table";

export type QuartoTargetIdentity =
	| { mode: "caption" }
	| { mode: "anchor"; id: string }
	| { mode: "crossref"; id: string; number: number };

export interface QuartoCaptionTarget {
	key: string;
	kind: QuartoTargetKind;
	caption: string;
	imageSource: string | null;
	identity: QuartoTargetIdentity;
	targetFrom: number;
	targetTo: number;
	targetStartLine: number;
	targetEndLine: number;
	markerFrom: number | null;
	markerTo: number | null;
	markerText: string | null;
	attributeText: string | null;
	markerLine: number;
}

export type QuartoCrossrefCaptionTarget = QuartoCaptionTarget & {
	identity: Extract<QuartoTargetIdentity, { mode: "crossref" }>;
};

export interface QuartoCrossrefReference {
	id: string;
	from: number;
	to: number;
}

export interface QuartoDocument {
	targets: QuartoCaptionTarget[];
	references: QuartoCrossrefReference[];
	tableBlocks: QuartoTableBlock[];
}

interface SourceLine {
	text: string;
	from: number;
	to: number;
	index: number;
	excluded: boolean;
}

export interface QuartoTableBlock {
	from: number;
	to: number;
	startLine: number;
	endLine: number;
}

interface ParsedAttribute {
	from: number;
	text: string;
	id: string | null;
}

interface ParsedTableCaption {
	caption: string;
	attributeText: string | null;
	id: string | null;
	markerFrom: number;
	markerTo: number;
	markerText: string;
	line: SourceLine;
}

const ATTRIBUTE = /\{([^{}]*)\}\s*$/u;
const ATTRIBUTE_ID = /(?:^|\s)#([A-Za-z0-9][A-Za-z0-9_.:-]*)(?=\s|$)/u;
const ATTRIBUTE_ITEM = /(?:^|\s)(?:#[A-Za-z0-9][A-Za-z0-9_.:-]*|\.[A-Za-z0-9][A-Za-z0-9_.:-]*|[A-Za-z_][A-Za-z0-9_.:-]*=(?:"[^"]*"|'[^']*'|[^\s]+))(?=\s|$)/gu;
const FIGURE_CROSSREF_ID = /^fig-[A-Za-z0-9](?:[A-Za-z0-9_.:-]*[A-Za-z0-9])?$/u;
const TABLE_CROSSREF_ID = /^tbl-[A-Za-z0-9](?:[A-Za-z0-9_.:-]*[A-Za-z0-9])?$/u;
const REFERENCE = /@((?:fig|tbl)-[A-Za-z0-9](?:[A-Za-z0-9_.:-]*[A-Za-z0-9])?)/gu;
const REFERENCE_WORD_CHARACTER = /[A-Za-z0-9_]/u;

export function parseQuartoDocument(source: string): QuartoDocument {
	const lines = createSourceLines(source);
	markExcludedLines(lines);

	const figures = lines.flatMap((line) => {
		const figure = parseFigure(line);
		return figure === null ? [] : [figure];
	});
	const tableBlocks = findPipeTableBlocks(lines);
	const tableCaptions = lines.flatMap((line) => {
		const caption = parseTableCaption(line);
		return caption === null ? [] : [caption];
	});
	const usedTableBlocks = new Set<QuartoTableBlock>();
	const tables = tableCaptions.flatMap((caption) => {
		const tableBlock = findCaptionTable(caption.line.index, tableBlocks, lines);
		if (tableBlock === null || usedTableBlocks.has(tableBlock)) {
			return [];
		}
		usedTableBlocks.add(tableBlock);

		return [{
			key: `table:${tableBlock.from}:${caption.markerFrom}`,
			kind: "table" as const,
			caption: caption.caption,
			imageSource: null,
			identity: createIdentity("table", caption.id),
			targetFrom: tableBlock.from,
			targetTo: tableBlock.to,
			targetStartLine: tableBlock.startLine,
			targetEndLine: tableBlock.endLine,
			markerFrom: caption.markerFrom,
			markerTo: caption.markerTo,
			markerText: caption.markerText,
			attributeText: caption.attributeText,
			markerLine: caption.line.index,
		}];
	});

	const targets = [...figures, ...tables].sort(
		(left, right) => left.targetFrom - right.targetFrom,
	);
	assignNumbers(targets);

	const targetLines = new Set(targets.flatMap((target) => [
		target.targetStartLine,
		target.markerLine,
	]));
	const references = parseReferences(lines, targetLines);

	return { targets, references, tableBlocks };
}

export function isQuartoCrossrefTarget(
	target: QuartoCaptionTarget,
): target is QuartoCrossrefCaptionTarget {
	return target.identity.mode === "crossref";
}

export function getQuartoTargetId(target: QuartoCaptionTarget): string | null {
	return target.identity.mode === "caption" ? null : target.identity.id;
}

export function isQuartoReferenceBoundary(
	source: string,
	from: number,
	to: number,
): boolean {
	const previous = source[from - 1];
	const next = source[to];
	return (previous === undefined
		|| (!REFERENCE_WORD_CHARACTER.test(previous) && previous !== "@" && previous !== "\\"))
		&& (next === undefined
			|| (!REFERENCE_WORD_CHARACTER.test(next) && next !== "-" && next !== "@"));
}

export function createQuartoReferencePattern(): RegExp {
	return new RegExp(REFERENCE.source, "gu");
}

function createSourceLines(source: string): SourceLine[] {
	const rawLines = source.split("\n");
	let offset = 0;

	return rawLines.map((rawLine, index) => {
		const text = rawLine.endsWith("\r") ? rawLine.slice(0, -1) : rawLine;
		const line = {
			text,
			from: offset,
			to: offset + text.length,
			index,
			excluded: false,
		};
		offset += rawLine.length + 1;
		return line;
	});
}

function markExcludedLines(lines: SourceLine[]): void {
	let inFrontmatter = lines[0]?.text.trim() === "---";
	let frontmatterClosed = !inFrontmatter;
	let fenceCharacter: "`" | "~" | null = null;
	let fenceLength = 0;

	for (const line of lines) {
		const trimmed = line.text.trim();

		if (!frontmatterClosed) {
			line.excluded = true;
			if (line.index > 0 && (trimmed === "---" || trimmed === "...")) {
				inFrontmatter = false;
				frontmatterClosed = true;
			}
			continue;
		}

		if (inFrontmatter) {
			line.excluded = true;
			continue;
		}

		if (fenceCharacter !== null) {
			line.excluded = true;
			const closingFence = new RegExp(`^${fenceCharacter}{${fenceLength},}\\s*$`, "u");
			if (closingFence.test(trimmed)) {
				fenceCharacter = null;
				fenceLength = 0;
			}
			continue;
		}

		const openingFence = /^(`{3,}|~{3,})/u.exec(trimmed)?.[1];
		if (openingFence !== undefined) {
			line.excluded = true;
			fenceCharacter = openingFence[0] as "`" | "~";
			fenceLength = openingFence.length;
		}
	}
}

function parseFigure(line: SourceLine): QuartoCaptionTarget | null {
	if (line.excluded) {
		return null;
	}

	const trimmed = line.text.trim();
	const leadingWhitespace = line.text.length - line.text.trimStart().length;
	const attribute = parseTrailingAttribute(trimmed);
	const imageMarkup = attribute === null
		? trimmed
		: trimmed.slice(0, attribute.from);
	if (
		imageMarkup.endsWith(" ")
		|| !imageMarkup.startsWith("![")
		|| imageMarkup.startsWith("![[")
	) {
		return null;
	}

	const captionEnd = findImageCaptionEnd(imageMarkup);
	if (
		captionEnd === -1
		|| imageMarkup[captionEnd + 1] !== "("
		|| !imageMarkup.endsWith(")")
	) {
		return null;
	}

	const caption = unescapeImageCaption(imageMarkup.slice(2, captionEnd));
	const imageSource = parseImageDestination(
		imageMarkup.slice(captionEnd + 2, -1),
	);

	const trimmedFrom = line.from + leadingWhitespace;
	return {
		key: `figure:${trimmedFrom}`,
		kind: "figure",
		caption,
		imageSource,
		identity: createIdentity("figure", attribute?.id ?? null),
		targetFrom: trimmedFrom,
		targetTo: trimmedFrom + trimmed.length,
		targetStartLine: line.index,
		targetEndLine: line.index,
		markerFrom: attribute === null ? null : trimmedFrom + attribute.from,
		markerTo: attribute === null ? null : trimmedFrom + trimmed.length,
		markerText: attribute?.text ?? null,
		attributeText: attribute?.text ?? null,
		markerLine: line.index,
	};
}

function parseImageDestination(source: string): string {
	const trimmed = source.trim();
	if (trimmed.startsWith("<")) {
		const closingBracket = trimmed.indexOf(">");
		if (closingBracket > 0) {
			return trimmed.slice(1, closingBracket);
		}
	}
	return trimmed.split(/\s+/u, 1)[0] ?? "";
}

function parseTrailingAttribute(source: string): ParsedAttribute | null {
	const match = ATTRIBUTE.exec(source);
	const content = match?.[1] ?? "";
	if (
		match === null
		|| match.index === undefined
		|| content.trim().length === 0
		|| content.replace(ATTRIBUTE_ITEM, "").trim().length > 0
	) {
		return null;
	}

	return {
		from: match.index,
		text: match[0].trim(),
		id: ATTRIBUTE_ID.exec(content)?.[1] ?? null,
	};
}

function findImageCaptionEnd(imageSource: string): number {
	let escaped = false;

	for (let index = 2; index < imageSource.length; index += 1) {
		const character = imageSource[index];
		if (escaped) {
			escaped = false;
			continue;
		}

		if (character === "\\") {
			escaped = true;
			continue;
		}

		if (character === "]") {
			return index;
		}
	}

	return -1;
}

function unescapeImageCaption(caption: string): string {
	return caption.replace(/\\([[\]\\])/gu, "$1");
}

function findPipeTableBlocks(lines: SourceLine[]): QuartoTableBlock[] {
	const blocks: QuartoTableBlock[] = [];

	for (let index = 0; index < lines.length - 1; index += 1) {
		const header = lines[index];
		const separator = lines[index + 1];
		if (
			header === undefined
			|| separator === undefined
			|| header.excluded
			|| separator.excluded
			|| !header.text.includes("|")
			|| !isPipeTableSeparator(separator.text)
		) {
			continue;
		}

		let endLine = index + 1;
		while (endLine + 1 < lines.length) {
			const nextLine = lines[endLine + 1];
			if (
				nextLine === undefined
				|| nextLine.excluded
				|| nextLine.text.trim().length === 0
				|| !nextLine.text.includes("|")
			) {
				break;
			}
			endLine += 1;
		}

		const lastLine = lines[endLine];
		if (lastLine !== undefined) {
			blocks.push({
				from: header.from,
				to: lastLine.to,
				startLine: index,
				endLine,
			});
		}
		index = endLine;
	}

	return blocks;
}

function isPipeTableSeparator(source: string): boolean {
	const trimmed = source.trim().replace(/^\|/u, "").replace(/\|$/u, "");
	const cells = trimmed.split("|").map((cell) => cell.trim());
	return cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/u.test(cell));
}

function parseTableCaption(line: SourceLine): ParsedTableCaption | null {
	if (line.excluded) {
		return null;
	}

	const trimmed = line.text.trim();
	const leadingWhitespace = line.text.length - line.text.trimStart().length;
	const attribute = parseTrailingAttribute(trimmed);
	const prefixAndCaption = (
		attribute === null ? trimmed : trimmed.slice(0, attribute.from)
	).trimEnd();
	const captionMatch = /^:\s*(.*)$/u.exec(prefixAndCaption);
	if (captionMatch === null) {
		return null;
	}

	const caption = captionMatch[1]?.trim() ?? "";
	if (caption.length === 0 && (attribute?.id ?? null) === null) {
		return null;
	}

	const markerFrom = line.from + leadingWhitespace;
	return {
		caption,
		attributeText: attribute?.text ?? null,
		id: attribute?.id ?? null,
		markerFrom,
		markerTo: markerFrom + trimmed.length,
		markerText: trimmed,
		line,
	};
}

function findCaptionTable(
	captionLine: number,
	blocks: QuartoTableBlock[],
	lines: SourceLine[],
): QuartoTableBlock | null {
	for (let index = blocks.length - 1; index >= 0; index -= 1) {
		const block = blocks[index];
		if (
			block !== undefined
			&& block.endLine < captionLine
			&& linesAreBlank(lines, block.endLine + 1, captionLine - 1)
		) {
			return block;
		}
	}

	return blocks.find((block) =>
		block.startLine > captionLine
		&& linesAreBlank(lines, captionLine + 1, block.startLine - 1)) ?? null;
}

function linesAreBlank(lines: SourceLine[], from: number, to: number): boolean {
	for (let index = from; index <= to; index += 1) {
		if (lines[index]?.text.trim().length !== 0) {
			return false;
		}
	}
	return true;
}

function createIdentity(
	kind: QuartoTargetKind,
	id: string | null,
): QuartoTargetIdentity {
	if (id === null) {
		return { mode: "caption" };
	}

	const isCrossref = kind === "figure"
		? FIGURE_CROSSREF_ID.test(id)
		: TABLE_CROSSREF_ID.test(id);
	return isCrossref
		? { mode: "crossref", id, number: 0 }
		: { mode: "anchor", id };
}

function assignNumbers(targets: QuartoCaptionTarget[]): void {
	let figureNumber = 0;
	let tableNumber = 0;

	for (const target of targets) {
		if (!isQuartoCrossrefTarget(target)) {
			continue;
		}

		if (target.kind === "figure") {
			figureNumber += 1;
			target.identity = {
				...target.identity,
				number: figureNumber,
			};
		} else {
			tableNumber += 1;
			target.identity = {
				...target.identity,
				number: tableNumber,
			};
		}
	}
}

function parseReferences(
	lines: SourceLine[],
	targetLines: Set<number>,
): QuartoCrossrefReference[] {
	const references: QuartoCrossrefReference[] = [];

	for (const line of lines) {
		if (line.excluded || targetLines.has(line.index)) {
			continue;
		}

		for (const match of line.text.matchAll(REFERENCE)) {
			const id = match[1];
			if (
				id === undefined
				|| match.index === undefined
				|| !isQuartoReferenceBoundary(
					line.text,
					match.index,
					match.index + match[0].length,
				)
			) {
				continue;
			}

			references.push({
				id,
				from: line.from + match.index,
				to: line.from + match.index + match[0].length,
			});
		}
	}

	return references;
}
