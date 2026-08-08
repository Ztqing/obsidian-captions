import {
	placeCaptionRelativeToTarget,
	resolveImageCaption,
	type CaptionSettings,
} from "../../caption-settings";
import type {
	CaptionDocument,
	ImageTarget,
	TableBlock,
	TableTarget,
} from "./parser";
import {
	CAPTION_KEY,
	FIGURE_CAPTION_CLASS,
	FIGURE_CONTAINER_CLASS,
	SOURCE_CAPTION_CLASS,
	SOURCE_MARKER_CLASS,
	TABLE_CAPTION_CLASS,
	TABLE_CONTAINER_CLASS,
	updateCaptionElement,
} from "../shared/renderer";

export interface CaptionReadingSection {
	root: HTMLElement;
	lineStart: number;
	lineEnd: number;
}

export function renderCaptionReadingSections(
	sections: readonly CaptionReadingSection[],
	document: CaptionDocument,
	settings: CaptionSettings,
): void {
	const sectionIndex = new SectionIndex(sections);
	const imageIndex = new Map<HTMLElement, HTMLImageElement[]>();
	const tableIndex = new Map<HTMLElement, HTMLTableElement[]>();
	const assignments = document.targets.flatMap((target) => {
		const section = sectionIndex.find(target.target.startLine);
		return section === null ? [] : [{ section, target }];
	});
	const figuresBySection = groupFiguresBySection(assignments);
	const tableBlocksBySection = groupTableBlocksBySection(
		document.tableBlocks,
		sectionIndex,
	);
	const figureElements = new Map<string, HTMLImageElement>();
	const indexedFigureSections = new Set<HTMLElement>();

	for (const { section: targetSection, target } of assignments) {
		if (target.kind === "figure") {
			renderFigure(
				targetSection,
				sectionIndex.find(target.marker?.startLine ?? target.target.startLine),
				target,
				settings,
				imageIndex,
				figuresBySection,
				figureElements,
				indexedFigureSections,
			);
		} else {
			renderTable(
				targetSection,
				sectionIndex.find(target.marker.startLine),
				target,
				settings,
				tableIndex,
				tableBlocksBySection,
			);
		}
	}
}

export function cleanupCaptionReadingView(root: HTMLElement): void {
	for (const wrapper of collectElements<HTMLElement>(root, ".captions-reference, .captions-pandoc-reference, .captions-quarto-reference")) {
		const source = wrapper.querySelector<HTMLElement>(
			".captions-reference-source, .captions-pandoc-reference-source, .captions-quarto-reference-source",
		);
		wrapper.replaceWith(wrapper.ownerDocument.createTextNode(source?.textContent ?? ""));
	}

	for (const marker of collectElements<HTMLElement>(
		root,
		`.${SOURCE_MARKER_CLASS}, .captions-pandoc-source-marker, .captions-quarto-source-marker`,
	)) {
		marker.replaceWith(marker.ownerDocument.createTextNode(marker.textContent ?? ""));
	}

	for (const sourceCaption of collectElements<HTMLElement>(
		root,
		`.${SOURCE_CAPTION_CLASS}, .captions-pandoc-source-caption, .captions-quarto-source-caption`,
	)) {
		sourceCaption.classList.remove(
			SOURCE_CAPTION_CLASS,
			"captions-pandoc-source-caption",
			"captions-quarto-source-caption",
		);
		delete sourceCaption.dataset[CAPTION_KEY];
		delete sourceCaption.dataset.captionKey;
		delete sourceCaption.dataset.captionId;
	}

	for (const caption of collectElements<HTMLElement>(
		root,
		[
			`.${FIGURE_CAPTION_CLASS}`,
			`.${TABLE_CAPTION_CLASS}`,
			".captions-pandoc-figure-caption",
			".captions-pandoc-table-caption",
			".captions-quarto-figure-caption",
			".captions-quarto-table-caption",
		].join(", "),
	)) {
		if (
			caption.classList.contains(FIGURE_CAPTION_CLASS)
			&& caption.dataset[CAPTION_KEY] === "wiki"
		) {
			continue;
		}
		caption.remove();
	}

	restoreLegacyTargetIds(root);

	for (const container of collectElements<HTMLElement>(
		root,
		[
			`.${FIGURE_CONTAINER_CLASS}`,
			`.${TABLE_CONTAINER_CLASS}`,
			".captions-pandoc-figure",
			".captions-pandoc-table",
			".captions-quarto-figure",
			".captions-quarto-table",
		].join(", "),
	)) {
		if (container.matches(".internal-embed.image-embed")) {
			continue;
		}
		container.classList.remove(
			FIGURE_CONTAINER_CLASS,
			TABLE_CONTAINER_CLASS,
			"captions-pandoc-figure",
			"captions-pandoc-table",
			"captions-quarto-figure",
			"captions-quarto-table",
		);
	}
}

function restoreLegacyTargetIds(root: HTMLElement): void {
	for (const target of collectElements<HTMLElement>(
		root,
		"[data-captions-pandoc-managed-id], [data-captions-quarto-managed-id]",
	)) {
		const pandocManaged = target.hasAttribute("data-captions-pandoc-managed-id");
		const previousAttribute = pandocManaged
			? "data-captions-pandoc-previous-id"
			: "data-captions-quarto-previous-id";
		const previousId = target.getAttribute(previousAttribute) ?? "";
		if (previousId.length > 0) {
			target.id = previousId;
		} else {
			target.removeAttribute("id");
		}
		target.removeAttribute("data-captions-pandoc-managed-id");
		target.removeAttribute("data-captions-pandoc-previous-id");
		target.removeAttribute("data-captions-quarto-managed-id");
		target.removeAttribute("data-captions-quarto-previous-id");
	}
}

function renderFigure(
	targetSection: CaptionReadingSection,
	markerSection: CaptionReadingSection | null,
	target: ImageTarget,
	settings: CaptionSettings,
	imageIndex: Map<HTMLElement, HTMLImageElement[]>,
	figuresBySection: Map<HTMLElement, ImageTarget[]>,
	figureElements: Map<string, HTMLImageElement>,
	indexedFigureSections: Set<HTMLElement>,
): void {
	const markerRoot = markerSection?.root ?? targetSection.root;
	const marker = findOrCreateMarker(markerRoot, target.key, target.markerText);
	const markerBlock = marker?.parentElement?.closest("p") ?? marker?.parentElement;
	const image = (markerBlock === null || markerBlock === undefined
		? undefined
		: findStandardImage(markerBlock, target.caption))
		?? findFigureImageForTarget(
			targetSection,
			target,
			imageIndex,
			figuresBySection,
			figureElements,
			indexedFigureSections,
		);
	if (image === undefined) {
		return;
	}

	const block = image.closest("p") ?? image.parentElement;
	if (block === null) {
		return;
	}

	const captionText = resolveImageCaption(
		target.caption,
		[target.imageSource, image.getAttribute("src")],
		settings.showFileNameAsCaption,
	);
	let caption = findCaptionByKey(block, FIGURE_CAPTION_CLASS, target.key);
	if (captionText === null) {
		caption?.remove();
		block.classList.remove(FIGURE_CONTAINER_CLASS);
		return;
	}

	block.classList.add(FIGURE_CONTAINER_CLASS);
	if (caption === null) {
		caption = block.ownerDocument.createElement("span");
		caption.dataset[CAPTION_KEY] = target.key;
	}
	updateCaptionElement(caption, captionText, settings, "figure");
	placeCaptionRelativeToTarget(block, image, caption, settings.figurePosition);
}

function renderTable(
	targetSection: CaptionReadingSection,
	markerSection: CaptionReadingSection | null,
	target: TableTarget,
	settings: CaptionSettings,
	tableIndex: Map<HTMLElement, HTMLTableElement[]>,
	tableBlocksBySection: Map<HTMLElement, TableBlock[]>,
): void {
	const table = findTableForTarget(
		targetSection,
		target,
		tableIndex,
		tableBlocksBySection,
	);
	if (table === null) {
		return;
	}

	const markerRoot = markerSection?.root;
	const captionBlock = markerRoot === undefined
		? null
		: findOrCreateTableCaptionMarker(markerRoot, target);
	const renderedCaption = captionBlock === null
		? target.caption
		: extractRenderedTableCaption(
			captionBlock.textContent ?? "",
			target.attributeText,
			target.caption,
		);

	table.classList.add(TABLE_CONTAINER_CLASS);
	let caption = findDirectTableCaption(table, target.key);
	if (caption === null) {
		caption = table.ownerDocument.createElement("caption");
		caption.dataset[CAPTION_KEY] = target.key;
	}
	updateCaptionElement(caption, renderedCaption, settings, "table");
	if (settings.tablePosition === "above") {
		table.prepend(caption);
	} else {
		table.appendChild(caption);
	}
}

function findFigureImageForTarget(
	section: CaptionReadingSection,
	target: ImageTarget,
	imageIndex: Map<HTMLElement, HTMLImageElement[]>,
	figuresBySection: Map<HTMLElement, ImageTarget[]>,
	figureElements: Map<string, HTMLImageElement>,
	indexedSections: Set<HTMLElement>,
): HTMLImageElement | undefined {
	if (!indexedSections.has(section.root)) {
		indexedSections.add(section.root);
		indexFigureElements(
			figuresBySection.get(section.root) ?? [],
			getCachedImages(section.root, imageIndex),
			figureElements,
		);
	}
	return figureElements.get(target.key);
}

function findTableForTarget(
	section: CaptionReadingSection,
	target: TableTarget,
	tableIndex: Map<HTMLElement, HTMLTableElement[]>,
	tableBlocksBySection: Map<HTMLElement, TableBlock[]>,
): HTMLTableElement | null {
	const blocks = tableBlocksBySection.get(section.root) ?? [];
	const targetIndex = blocks.findIndex((block) => block.from === target.target.from);
	return targetIndex === -1 ? null : getCachedTables(section.root, tableIndex)[targetIndex] ?? null;
}

function indexFigureElements(
	targets: readonly ImageTarget[],
	images: readonly HTMLImageElement[],
	index: Map<string, HTMLImageElement>,
): void {
	const imagesByCaption = new Map<string, HTMLImageElement[]>();
	for (const image of images) {
		const caption = image.getAttribute("alt")?.trim() ?? "";
		const matching = imagesByCaption.get(caption) ?? [];
		matching.push(image);
		imagesByCaption.set(caption, matching);
	}

	const occurrences = new Map<string, number>();
	for (const [targetIndex, target] of targets.entries()) {
		const occurrence = occurrences.get(target.caption) ?? 0;
		occurrences.set(target.caption, occurrence + 1);
		const image = imagesByCaption.get(target.caption)?.[occurrence]
			?? images[targetIndex];
		if (image !== undefined) {
			index.set(target.key, image);
		}
	}
}

function groupFiguresBySection(
	assignments: ReadonlyArray<{
		section: CaptionReadingSection;
		target: CaptionDocument["targets"][number];
	}>,
): Map<HTMLElement, ImageTarget[]> {
	const result = new Map<HTMLElement, ImageTarget[]>();
	for (const { section, target } of assignments) {
		if (target.kind !== "figure") {
			continue;
		}
		const targets = result.get(section.root) ?? [];
		targets.push(target);
		result.set(section.root, targets);
	}
	return result;
}

function groupTableBlocksBySection(
	blocks: readonly TableBlock[],
	sectionIndex: SectionIndex,
): Map<HTMLElement, TableBlock[]> {
	const result = new Map<HTMLElement, TableBlock[]>();
	for (const block of blocks) {
		const section = sectionIndex.find(block.startLine);
		if (section === null) {
			continue;
		}
		const sectionBlocks = result.get(section.root) ?? [];
		sectionBlocks.push(block);
		result.set(section.root, sectionBlocks);
	}
	return result;
}

function findOrCreateMarker(
	root: HTMLElement,
	key: string,
	source: string | null,
): HTMLElement | null {
	const existing = findCaptionByKey(root, SOURCE_MARKER_CLASS, key);
	if (existing !== null || source === null) {
		return existing;
	}
	const textNode = findTextNodeContaining(root, source);
	return textNode === null ? null : replaceTextWithSourceMarker(textNode, source, key);
}

function findOrCreateTableCaptionMarker(
	root: HTMLElement,
	target: TableTarget,
): HTMLElement | null {
	const existing = findCaptionByKey(root, SOURCE_CAPTION_CLASS, target.key);
	if (existing !== null) {
		return existing;
	}
	const textNode = target.attributeText === null
		? findTextNodeContaining(root, target.markerText)
		: findTextNodeContaining(root, target.attributeText);
	const block = textNode?.parentElement?.closest("p") ?? null;
	if (block !== null) {
		block.classList.add(SOURCE_CAPTION_CLASS);
		block.dataset[CAPTION_KEY] = target.key;
	}
	return block;
}

function findStandardImage(root: HTMLElement, caption: string): HTMLImageElement | undefined {
	const images = collectStandardImages(root);
	return images.find((image) => image.getAttribute("alt")?.trim() === caption) ?? images[0];
}

function getCachedImages(
	root: HTMLElement,
	cache: Map<HTMLElement, HTMLImageElement[]>,
): HTMLImageElement[] {
	const existing = cache.get(root);
	if (existing !== undefined) {
		return existing;
	}
	const images = collectStandardImages(root);
	cache.set(root, images);
	return images;
}

function getCachedTables(
	root: HTMLElement,
	cache: Map<HTMLElement, HTMLTableElement[]>,
): HTMLTableElement[] {
	const existing = cache.get(root);
	if (existing !== undefined) {
		return existing;
	}
	const tables = collectElements<HTMLTableElement>(root, "table");
	cache.set(root, tables);
	return tables;
}

function collectStandardImages(root: HTMLElement): HTMLImageElement[] {
	return collectElements<HTMLImageElement>(root, "img")
		.filter((image) => image.closest(".internal-embed") === null);
}

function extractRenderedTableCaption(
	source: string,
	attributeText: string | null,
	fallback: string,
): string {
	const attributeIndex = attributeText === null ? -1 : source.lastIndexOf(attributeText);
	const withoutAttribute = attributeIndex === -1 ? source : source.slice(0, attributeIndex);
	const caption = withoutAttribute.replace(/^\s*(?::|Table:)\s*/iu, "").trim();
	return caption.length > 0 ? caption : fallback;
}

function findCaptionByKey(root: HTMLElement, className: string, key: string): HTMLElement | null {
	return collectElements<HTMLElement>(root, `.${className}`)
		.find((element) => element.dataset[CAPTION_KEY] === key) ?? null;
}

function findDirectTableCaption(table: HTMLTableElement, key: string): HTMLTableCaptionElement | null {
	for (const child of Array.from(table.children)) {
		if (
			child.tagName === "CAPTION"
			&& child.classList.contains(TABLE_CAPTION_CLASS)
			&& (child as HTMLElement).dataset[CAPTION_KEY] === key
		) {
			return child as HTMLTableCaptionElement;
		}
	}
	return null;
}

function findTextNodeContaining(root: HTMLElement, source: string): Text | null {
	if (source.length === 0) {
		return null;
	}
	const walker = root.ownerDocument.createTreeWalker(root, 4);
	let current = walker.nextNode();
	while (current !== null) {
		const textNode = current as Text;
		if (!shouldSkipTextNode(textNode) && textNode.data.includes(source)) {
			return textNode;
		}
		current = walker.nextNode();
	}
	return null;
}

function shouldSkipTextNode(textNode: Text): boolean {
	return textNode.parentElement?.closest([
		"code",
		"pre",
		"a",
		`.${SOURCE_MARKER_CLASS}`,
		`.${SOURCE_CAPTION_CLASS}`,
		`.${FIGURE_CAPTION_CLASS}`,
		`.${TABLE_CAPTION_CLASS}`,
		".captions-wiki-caption",
	].join(", ")) !== null;
}

function replaceTextWithSourceMarker(textNode: Text, source: string, key: string): HTMLElement {
	const index = textNode.data.indexOf(source);
	const fragment = textNode.ownerDocument.createDocumentFragment();
	fragment.append(textNode.data.slice(0, index));
	const marker = textNode.ownerDocument.createElement("span");
	marker.className = SOURCE_MARKER_CLASS;
	marker.dataset[CAPTION_KEY] = key;
	marker.textContent = source;
	fragment.appendChild(marker);
	fragment.append(textNode.data.slice(index + source.length));
	textNode.replaceWith(fragment);
	return marker;
}

function sectionContainsLine(section: CaptionReadingSection, line: number): boolean {
	return section.lineStart <= line && line <= section.lineEnd;
}

function collectElements<ElementType extends Element>(root: HTMLElement, selector: string): ElementType[] {
	const elements = Array.from(root.querySelectorAll<ElementType>(selector));
	if (root.matches(selector)) {
		elements.unshift(root as unknown as ElementType);
	}
	return elements;
}

class SectionIndex {
	private readonly sections: CaptionReadingSection[];

	constructor(sections: readonly CaptionReadingSection[]) {
		this.sections = [...sections].sort((left, right) => (
			left.lineStart - right.lineStart
			|| right.lineEnd - left.lineEnd
		));
	}

	find(line: number): CaptionReadingSection | null {
		let low = 0;
		let high = this.sections.length - 1;
		let candidate = -1;
		while (low <= high) {
			const middle = Math.floor((low + high) / 2);
			const section = this.sections[middle];
			if (section !== undefined && section.lineStart <= line) {
				candidate = middle;
				low = middle + 1;
			} else {
				high = middle - 1;
			}
		}

		for (let index = candidate; index >= 0; index -= 1) {
			const section = this.sections[index];
			if (section !== undefined && sectionContainsLine(section, line)) {
				return section;
			}
		}
		return null;
	}
}
