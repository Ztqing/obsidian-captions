export type CaptionTargetKind = "figure" | "table";

export interface SourceSpan {
	from: number;
	to: number;
	startLine: number;
	endLine: number;
}

export interface ImageTarget {
	key: string;
	kind: "figure";
	caption: string;
	imageSource: string | null;
	target: SourceSpan;
	marker: SourceSpan | null;
	markerText: string | null;
}

export interface TableTarget {
	key: string;
	kind: "table";
	caption: string;
	target: SourceSpan;
	marker: SourceSpan;
	markerText: string;
	attributeText: string | null;
}

export type CaptionTarget = ImageTarget | TableTarget;

export type TableBlock = SourceSpan;

export interface CaptionDocument {
	targets: CaptionTarget[];
	tableBlocks: TableBlock[];
}

interface SourceLine {
	text: string;
	from: number;
	to: number;
	index: number;
	excluded: boolean;
}

interface ParsedAttribute {
	from: number;
	text: string;
}

interface ParsedTableCaption {
	caption: string;
	attributeText: string | null;
	line: SourceLine;
	markerFrom: number;
	markerTo: number;
	markerText: string;
}

const ATTRIBUTE = /\{([^{}]*)\}\s*$/u;
const ATTRIBUTE_ITEM = /(?:^|\s)(?:#[A-Za-z0-9][A-Za-z0-9_.:-]*|\.[A-Za-z0-9][A-Za-z0-9_.:-]*|[A-Za-z_][A-Za-z0-9_.:-]*=(?:"[^"]*"|'[^']*'|[^\s]+))(?=\s|$)/gu;

/**
 * Parse the caption syntax that is shared by Reading view and Live Preview.
 * It intentionally has no Obsidian or DOM dependency.
 */
export function parseCaptionDocument(source: string): CaptionDocument {
	const lines = createSourceLines(source);
	markExcludedLines(lines);

	const images = lines.flatMap((line) => {
		const image = parseStandaloneImage(line);
		return image === null ? [] : [image];
	});
	const tableBlocks = findPipeTableBlocks(lines);
	const usedTableBlocks = new Set<TableBlock>();
	const tables = lines.flatMap((line) => {
		const caption = parseTableCaption(line);
		if (caption === null) {
			return [];
		}

		const tableBlock = findCaptionTable(caption.line.index, tableBlocks, lines);
		if (tableBlock === null || usedTableBlocks.has(tableBlock)) {
			return [];
		}
		usedTableBlocks.add(tableBlock);

		return [{
			key: `table:${tableBlock.from}:${caption.markerFrom}`,
			kind: "table" as const,
			caption: caption.caption,
			target: tableBlock,
			marker: {
				from: caption.markerFrom,
				to: caption.markerTo,
				startLine: caption.line.index,
				endLine: caption.line.index,
			},
			markerText: caption.markerText,
			attributeText: caption.attributeText,
		}];
	});

	return {
		targets: [...images, ...tables].sort(
			(left, right) => left.target.from - right.target.from,
		),
		tableBlocks,
	};
}

function createSourceLines(source: string): SourceLine[] {
	const rawLines = source.split("\n");
	let offset = 0;

	return rawLines.map((rawLine, index) => {
		const text = rawLine.endsWith("\r") ? rawLine.slice(0, -1) : rawLine;
		const line: SourceLine = {
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
	let frontmatterOpen = lines[0]?.text.trim() === "---";
	let fenceCharacter: "`" | "~" | null = null;
	let fenceLength = 0;

	for (const line of lines) {
		const trimmed = line.text.trim();
		if (frontmatterOpen) {
			line.excluded = true;
			if (line.index > 0 && (trimmed === "---" || trimmed === "...")) {
				frontmatterOpen = false;
			}
			continue;
		}

		if (fenceCharacter !== null) {
			line.excluded = true;
			const closingFence = new RegExp(
				`^${fenceCharacter}{${fenceLength},}\\s*$`,
				"u",
			);
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

function parseStandaloneImage(line: SourceLine): ImageTarget | null {
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

	const targetFrom = line.from + leadingWhitespace;
	const targetTo = targetFrom + trimmed.length;
	return {
		key: `figure:${targetFrom}`,
		kind: "figure",
		caption: unescapeImageCaption(imageMarkup.slice(2, captionEnd)),
		imageSource: parseImageDestination(imageMarkup.slice(captionEnd + 2, -1)),
		target: {
			from: targetFrom,
			to: targetTo,
			startLine: line.index,
			endLine: line.index,
		},
		marker: attribute === null
			? null
			: {
				from: targetFrom + attribute.from,
				to: targetTo,
				startLine: line.index,
				endLine: line.index,
			},
		markerText: attribute?.text ?? null,
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

	return { from: match.index, text: match[0].trim() };
}

function findImageCaptionEnd(source: string): number {
	let escaped = false;
	for (let index = 2; index < source.length; index += 1) {
		const character = source[index];
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

function findPipeTableBlocks(lines: SourceLine[]): TableBlock[] {
	const blocks: TableBlock[] = [];
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
	const prefixAndCaption = (attribute === null
		? trimmed
		: trimmed.slice(0, attribute.from)).trimEnd();
	const captionMatch = /^(?::|Table:)\s*(.*)$/iu.exec(prefixAndCaption);
	const caption = captionMatch?.[1]?.trim() ?? "";
	if (captionMatch === null || caption.length === 0) {
		return null;
	}

	const markerFrom = line.from + leadingWhitespace;
	return {
		caption,
		attributeText: attribute?.text ?? null,
		line,
		markerFrom,
		markerTo: markerFrom + trimmed.length,
		markerText: trimmed,
	};
}

function findCaptionTable(
	captionLine: number,
	blocks: TableBlock[],
	lines: SourceLine[],
): TableBlock | null {
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

	return blocks.find((block) => (
		block.startLine > captionLine
		&& linesAreBlank(lines, captionLine + 1, block.startLine - 1)
	)) ?? null;
}

function linesAreBlank(lines: SourceLine[], from: number, to: number): boolean {
	for (let index = from; index <= to; index += 1) {
		if (lines[index]?.text.trim().length !== 0) {
			return false;
		}
	}
	return true;
}
