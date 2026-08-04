export type PandocTargetKind = "figure" | "table";

export type PandocTargetIdentity =
	| { mode: "caption" }
	| { mode: "anchor"; id: string }
	| { mode: "crossref"; id: string; number: number };

export interface PandocCaptionTarget {
	key: string;
	kind: PandocTargetKind;
	caption: string;
	identity: PandocTargetIdentity;
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

export type PandocCrossrefCaptionTarget = PandocCaptionTarget & {
	identity: Extract<PandocTargetIdentity, { mode: "crossref" }>;
};

export interface PandocCrossrefReference {
	id: string;
	from: number;
	to: number;
}

export interface PandocCrossrefDocument {
	targets: PandocCaptionTarget[];
	references: PandocCrossrefReference[];
	tableBlocks: PandocTableBlock[];
}

interface SourceLine {
	text: string;
	from: number;
	to: number;
	index: number;
	excluded: boolean;
}

export interface PandocTableBlock {
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
const FIGURE_CROSSREF_ID = /^fig:[A-Za-z0-9][A-Za-z0-9_.:-]*$/u;
const TABLE_CROSSREF_ID = /^tbl:[A-Za-z0-9][A-Za-z0-9_.:-]*$/u;
const REFERENCE = /\[@((?:fig|tbl):[A-Za-z0-9][A-Za-z0-9_.:-]*)\]/gu;

export function parsePandocCrossrefDocument(
	source: string,
): PandocCrossrefDocument {
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
	const usedTableBlocks = new Set<PandocTableBlock>();
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

export function isPandocCrossrefTarget(
	target: PandocCaptionTarget,
): target is PandocCrossrefCaptionTarget {
	return target.identity.mode === "crossref";
}

export function getPandocTargetId(target: PandocCaptionTarget): string | null {
	return target.identity.mode === "caption" ? null : target.identity.id;
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

function parseFigure(line: SourceLine): PandocCaptionTarget | null {
	if (line.excluded) {
		return null;
	}

	const trimmed = line.text.trim();
	const leadingWhitespace = line.text.length - line.text.trimStart().length;
	const attribute = parseTrailingAttribute(trimmed);
	const imageSource = attribute === null
		? trimmed
		: trimmed.slice(0, attribute.from);
	if (
		imageSource.endsWith(" ")
		|| !imageSource.startsWith("![")
		|| imageSource.startsWith("![[")
	) {
		return null;
	}

	const captionEnd = findImageCaptionEnd(imageSource);
	if (
		captionEnd === -1
		|| imageSource[captionEnd + 1] !== "("
		|| !imageSource.endsWith(")")
	) {
		return null;
	}

	const caption = unescapeImageCaption(imageSource.slice(2, captionEnd));
	if (caption.length === 0 && (attribute?.id ?? null) === null) {
		return null;
	}

	const trimmedFrom = line.from + leadingWhitespace;
	return {
		key: `figure:${trimmedFrom}`,
		kind: "figure",
		caption,
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

function findPipeTableBlocks(lines: SourceLine[]): PandocTableBlock[] {
	const blocks: PandocTableBlock[] = [];

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
	const captionMatch = /^(?::|Table:)\s*(.*)$/iu.exec(prefixAndCaption);
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
	blocks: PandocTableBlock[],
	lines: SourceLine[],
): PandocTableBlock | null {
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
	kind: PandocTargetKind,
	id: string | null,
): PandocTargetIdentity {
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

function assignNumbers(targets: PandocCaptionTarget[]): void {
	let figureNumber = 0;
	let tableNumber = 0;

	for (const target of targets) {
		if (!isPandocCrossrefTarget(target)) {
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
): PandocCrossrefReference[] {
	const references: PandocCrossrefReference[] = [];

	for (const line of lines) {
		if (line.excluded || targetLines.has(line.index)) {
			continue;
		}

		for (const match of line.text.matchAll(REFERENCE)) {
			const id = match[1];
			if (id === undefined || match.index === undefined) {
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
